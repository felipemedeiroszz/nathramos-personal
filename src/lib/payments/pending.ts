import "server-only";
import { randomUUID } from "node:crypto";
import {
  billingDb,
  syncAsaasPayment,
  syncStripeEvent,
  syncStripeSubscription,
} from "./sync";
import { AsaasProvider } from "./asaas";
import { getStripeClient } from "./stripe";
import { billingProfile } from "./student";
import { ApiValidationError } from "@/lib/api/response";
export async function cancelPendingCheckout(
  userId: string,
  operationId: string,
) {
  await billingProfile(userId);
  const db = await billingDb();
  const { data: op, error } = await db
    .from("billing_checkout_operations")
    .select("*")
    .eq("id", operationId)
    .eq("user_id", userId)
    .eq("kind", "plan")
    .single();
  if (error || !op) throw new ApiValidationError("Tentativa não encontrada.");
  if (op.state === "completed") return;
  if (!op.remote_id)
    throw new ApiValidationError(
      "A criação ainda está sendo verificada. Aguarde 15 minutos e retome a tentativa anterior.",
    );
  const event = `cancel:${randomUUID()}`;
  if (op.provider === "asaas") {
    const p = await AsaasProvider.getPayment(op.remote_id);
    if (!p.deleted && !["PENDING", "OVERDUE"].includes(p.status)) {
      await syncAsaasPayment(p.id, event, "CHECKOUT_STATUS");
      throw new ApiValidationError(
        "A cobrança mudou de estado. Atualize a central antes de continuar.",
      );
    }
    if (!p.deleted) await AsaasProvider.deletePayment(p.id);
    await syncAsaasPayment(p.id, event, "CHECKOUT_CANCELED");
  } else {
    const stripe = getStripeClient();
    if (op.remote_id.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(op.remote_id);
      if (session.status === "complete") {
        await syncStripeEvent({
          id: event,
          type: "checkout.session.completed",
          data: { object: session },
        });
        throw new ApiValidationError(
          "O checkout foi concluído. Atualize a central.",
        );
      }
      if (session.status === "open")
        await stripe.checkout.sessions.expire(session.id);
    } else if (op.remote_id.startsWith("sub_")) {
      const sub = await stripe.subscriptions.retrieve(op.remote_id);
      if (
        !["incomplete", "incomplete_expired", "canceled"].includes(sub.status)
      ) {
        await syncStripeSubscription(sub.id, event, "CHECKOUT_STATUS");
        throw new ApiValidationError(
          "A assinatura já mudou de estado. Gerencie-a na central.",
        );
      }
      if (sub.status === "incomplete")
        await stripe.subscriptions.cancel(sub.id);
      await syncStripeSubscription(sub.id, event, "CHECKOUT_CANCELED");
    } else throw new ApiValidationError("Tentativa não reconhecida.");
  }
  const { error: saveError } = await db
    .from("billing_checkout_operations")
    .update({ state: "completed", expires_at: new Date().toISOString() })
    .eq("id", op.id)
    .eq("user_id", userId);
  if (saveError) throw saveError;
}
export async function resumePendingCheckout(
  userId: string,
  operationId: string,
  locale: string,
) {
  await billingProfile(userId);
  const db = await billingDb();
  const { data: op, error } = await db
    .from("billing_checkout_operations")
    .select("*")
    .eq("id", operationId)
    .eq("user_id", userId)
    .eq("kind", "plan")
    .single();
  if (error || !op) throw new ApiValidationError("Tentativa não encontrada.");
  if (op.provider === "asaas")
    return { url: `/${locale}/assinatura/checkout?method=pix` };
  if (!op.remote_id)
    throw new ApiValidationError(
      "A criação está sendo verificada. Aguarde e tente novamente.",
    );
  const stripe = getStripeClient();
  if (op.remote_id.startsWith("cs_")) {
    const session = await stripe.checkout.sessions.retrieve(op.remote_id);
    if (session.status === "open" && session.url) return { url: session.url };
    if (session.status === "complete") {
      await syncStripeEvent({
        id: `resume:${randomUUID()}`,
        type: "checkout.session.completed",
        data: { object: session },
      });
      return { url: `/${locale}/assinatura` };
    }
    throw new ApiValidationError(
      "A tentativa expirou. Encerre-a e inicie um novo pagamento.",
    );
  }
  const sub = await stripe.subscriptions.retrieve(op.remote_id, {
    expand: ["latest_invoice.payment_intent"],
  });
  await syncStripeSubscription(
    sub.id,
    `resume:${randomUUID()}`,
    "CHECKOUT_RESUME",
  );
  if (["active", "trialing"].includes(sub.status))
    return { url: `/${locale}/assinatura` };
  const invoice =
    typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
  if (invoice?.hosted_invoice_url) return { url: invoice.hosted_invoice_url };
  throw new ApiValidationError(
    "A tentativa não pode ser retomada. Encerre-a para escolher outro cartão ou PIX.",
  );
}
