"use server";
import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { StripeProvider, getStripeClient } from "@/lib/payments/stripe";
import { AsaasProvider } from "@/lib/payments/asaas";
import { AuditLogService } from "@/services/AuditLogService";
import { z } from "zod";
export async function inspectBillingRecordAction(
  _previous: unknown,
  form: FormData,
) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  const en = form.get("locale") === "en-US";
  const text = (pt: string, english: string) => (en ? english : pt);
  const input = z
    .object({
      kind: z.enum(["payments", "subscriptions"]),
      id: z.string().uuid(),
    })
    .safeParse(Object.fromEntries(form.entries()));
  if (!input.success)
    return {
      success: false,
      message: text("Informe um ID válido.", "Enter a valid ID."),
    };
  try {
    const db: any = await createServiceClientSSR();
    const { data: row, error } = await db
      .from(input.data.kind)
      .select("*")
      .eq("id", input.data.id)
      .single();
    if (error || !row?.external_id)
      throw new Error(
        text(
          "Registro sem vínculo válido com o provedor.",
          "Record has no valid provider reference.",
        ),
      );
    let remoteStatus: string | null = null,
      amount: number | null = null,
      currency: string | null = null;
    const external = row.external_id;
    const extraDifferences: string[] = [];
    let note = "";
    if (row.provider === "stripe") {
      if (input.data.kind === "subscriptions") {
        const sub = await StripeProvider.getSubscription(external);
        const map: Record<string, string> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          unpaid: "past_due",
          canceled: "canceled",
          incomplete: "inactive",
          incomplete_expired: "expired",
          paused: "inactive",
        };
        remoteStatus = map[sub.status] || null;
        currency = sub.currency.toUpperCase();
        const item = sub.items.data.length === 1 ? sub.items.data[0] : null;
        if (item && (item.quantity ?? 1) === 1) amount = item.price.unit_amount;
        if (sub.cancel_at_period_end !== row.cancel_at_period_end)
          extraDifferences.push(
            text(
              "cancelamento agendado divergente",
              "scheduled cancellation differs",
            ),
          );
        if (
          sub.current_period_end * 1000 !==
          Date.parse(row.current_period_end)
        )
          extraDifferences.push(
            text("fim do período divergente", "period end differs"),
          );
      } else if (external.startsWith("in_")) {
        const invoice = await getStripeClient().invoices.retrieve(external);
        remoteStatus =
          invoice.status === "paid"
            ? "paid"
            : invoice.status === "void"
              ? "canceled"
              : invoice.status === "uncollectible"
                ? "failed"
                : "pending";
        amount = invoice.total;
        currency = invoice.currency.toUpperCase();
        const invoiceCharge = (invoice as any).charge;
        if (invoiceCharge) {
          const charge =
            typeof invoiceCharge === "string"
              ? await getStripeClient().charges.retrieve(invoiceCharge)
              : invoiceCharge;
          if (charge.amount_refunded > 0)
            remoteStatus =
              charge.amount_refunded >= charge.amount
                ? "refunded"
                : "partially_refunded";
        } else if (["refunded", "partially_refunded"].includes(row.status)) {
          throw new Error(
            text(
              "Confira o estorno desta fatura no provedor.",
              "Check this invoice refund at the provider.",
            ),
          );
        }
      } else if (external.startsWith("pi_")) {
        const payment =
          await getStripeClient().paymentIntents.retrieve(external);
        remoteStatus =
          payment.status === "succeeded"
            ? "paid"
            : payment.status === "canceled"
              ? "canceled"
              : payment.status === "processing"
                ? "processing"
                : "pending";
        amount = payment.amount;
        currency = payment.currency.toUpperCase();
        if (payment.latest_charge) {
          const charge =
            typeof payment.latest_charge === "string"
              ? await getStripeClient().charges.retrieve(payment.latest_charge)
              : payment.latest_charge;
          if (charge.amount_refunded > 0)
            remoteStatus =
              charge.amount_refunded >= charge.amount
                ? "refunded"
                : "partially_refunded";
        }
      } else if (external.startsWith("ch_")) {
        const charge = await getStripeClient().charges.retrieve(external);
        remoteStatus =
          charge.amount_refunded > 0
            ? charge.amount_refunded >= charge.amount
              ? "refunded"
              : "partially_refunded"
            : charge.paid
              ? "paid"
              : charge.status === "failed"
                ? "failed"
                : "pending";
        amount = charge.amount;
        currency = charge.currency.toUpperCase();
      } else
        throw new Error(
          text(
            "Confira este tipo de cobrança diretamente no Stripe.",
            "Check this charge type directly in Stripe.",
          ),
        );
    } else if (
      row.provider === "asaas" &&
      input.data.kind === "subscriptions"
    ) {
      const subscription = await AsaasProvider.getSubscriptionStatus(external);
      if (!["ACTIVE", "INACTIVE", "EXPIRED"].includes(subscription.status))
        throw new Error(
          text("Status externo desconhecido.", "Unknown external status."),
        );
      remoteStatus = row.status; // Recurrence state is not proof of payment or access entitlement.
      amount = Math.round(subscription.value * 100);
      currency = "BRL";
      if (row.external_status && row.external_status !== subscription.status)
        extraDifferences.push(
          `external_status: ${row.external_status} → ${subscription.status}`,
        );
      if (!row.external_status)
        extraDifferences.push(
          text(
            "status da recorrência ainda não registrado localmente: ",
            "recurrence status not yet stored locally: ",
          ) + subscription.status,
        );
      note = text(
        " O status da recorrência não comprova a quitação das cobranças.",
        " Recurrence status does not prove payment of individual charges.",
      );
    } else if (row.provider === "asaas" && input.data.kind === "payments") {
      const payment = await AsaasProvider.getPaymentStatus(external);
      const map: Record<string, string> = {
        PENDING: "pending",
        RECEIVED: "paid",
        CONFIRMED: "paid",
        APPROVED: "paid",
        OVERDUE: "expired",
        CANCELED: "canceled",
        REFUNDED: "refunded",
        DELETED: "canceled",
        REJECTED: "failed",
        PROCESSING: "processing",
        AWAITING_RISK_ANALYSIS: "processing",
      };
      remoteStatus = map[payment.status] || null;
      amount =
        payment.value === undefined ? null : Math.round(payment.value * 100);
      currency = "BRL";
    } else
      throw new Error(
        text(
          "Este vínculo exige conferência no painel do provedor.",
          "Check this reference in the provider dashboard.",
        ),
      );
    if (remoteStatus === null)
      throw new Error(
        text(
          "Status externo desconhecido. Confira no provedor.",
          "Unknown external status. Check the provider dashboard.",
        ),
      );
    const differences = [...extraDifferences];
    const localAmount =
      input.data.kind === "subscriptions"
        ? row.unit_amount_cents
        : row.amount_cents;
    if (remoteStatus !== row.status)
      differences.push(`status: ${row.status} → ${remoteStatus}`);
    if (amount !== null && amount !== localAmount)
      differences.push(
        `${text("valor", "amount")}: ${localAmount} → ${amount} ${text("centavos", "cents")}`,
      );
    if (currency !== null && currency !== row.currency)
      differences.push(
        `${text("moeda", "currency")}: ${row.currency} → ${currency}`,
      );
    await AuditLogService.log({
      adminId: userId,
      action: "billing.inspect",
      entity_type: input.data.kind,
      entity_id: row.id,
      details: { differences },
    });
    return {
      success: true,
      message:
        (differences.length
          ? text("Divergências encontradas: ", "Differences found: ") +
            differences.join("; ")
          : text(
              "Campos disponíveis conferidos no provedor. Nenhuma divergência encontrada.",
              "Available fields checked at the provider. No differences found.",
            )) + note,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : text(
              "Não foi possível consultar o provedor.",
              "Could not query the provider.",
            ),
    };
  }
}
