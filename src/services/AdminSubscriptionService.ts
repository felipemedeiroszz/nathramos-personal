import "server-only";
import { syncStripeSubscription } from "@/lib/payments/sync";
import { randomUUID } from "node:crypto";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { SubscriptionService } from "./SubscriptionService";
import { StripeProvider } from "@/lib/payments/stripe";
import type {
  SubscriptionRow,
  SubscriptionStatusT,
} from "@/lib/supabase/types";
export class AdminSubscriptionService {
  static async get(id: string): Promise<SubscriptionRow> {
    const db = await createServiceClientSSR();
    const { data, error } = await db
      .from("subscriptions")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new Error("Assinatura não encontrada.");
    return data as SubscriptionRow;
  }
  private static async syncStripe(id: string, externalId: string) {
    await syncStripeSubscription(externalId, `admin:${randomUUID()}`, "ADMIN_SUBSCRIPTION_SYNC");
    return this.get(id);
  }
  static async cancel(id: string, atPeriodEnd: boolean) {
    const sub = await this.get(id);
    if (sub.provider === "asaas" && sub.source === "asaas_pix") {
      if (atPeriodEnd && Date.parse(sub.current_period_end) <= Date.now()) throw new Error("O período já expirou.");
      return SubscriptionService.cancel(id, atPeriodEnd);
    }
    if (sub.provider || sub.external_id) {
      if (sub.provider !== "stripe" || !sub.external_id)
        throw new Error(
          "Cancelamento automático indisponível para este vínculo. Confirme a operação no provedor de pagamento; o status local foi preservado.",
        );
      if (atPeriodEnd) await StripeProvider.cancelSubscription(sub.external_id);
      else await StripeProvider.cancelSubscriptionImmediately(sub.external_id);
      return this.syncStripe(id, sub.external_id);
    }
    return SubscriptionService.cancel(id, atPeriodEnd);
  }
  static async reactivate(id: string) {
    const sub = await this.get(id);
    if (sub.provider === "asaas" && sub.source === "asaas_pix") {
      const db: any = await createServiceClientSSR();
      const { data: payment, error } = await db.from("payments").select("status").eq("subscription_id",id).eq("is_duplicate",false).in("status",["paid","partially_refunded"]).limit(1).maybeSingle();
      if (error) throw error;
      if (!payment || Date.parse(sub.current_period_end) <= Date.now() || sub.status === "blocked") throw new Error("Reativação exige pagamento confirmado e período vigente.");
      return SubscriptionService.updateStatus(id,"active",{cancel_at_period_end:false,canceled_at:null,ended_at:null});
    }
    if (sub.provider || sub.external_id) {
      if (sub.provider !== "stripe" || !sub.external_id)
        throw new Error(
          "Reativação automática indisponível para este vínculo. O status local foi preservado.",
        );
      const remote = await StripeProvider.getSubscription(sub.external_id);
      if (
        remote.status === "canceled" ||
        remote.status === "incomplete_expired"
      )
        throw new Error(
          "A assinatura foi encerrada no provedor. É necessária uma nova contratação.",
        );
      await StripeProvider.reactivateSubscription(sub.external_id);
      return this.syncStripe(id, sub.external_id);
    }
    if (Date.parse(sub.current_period_end) <= Date.now())
      throw new Error(
        "O período da assinatura expirou. Não é possível reativar sem definir um novo período.",
      );
    return SubscriptionService.updateStatus(id, "active", {
      cancel_at_period_end: false,
      canceled_at: null,
      ended_at: null,
    });
  }
  static async updateStatus(id: string, status: SubscriptionStatusT) {
    const sub = await this.get(id);
    if (sub.provider || sub.external_id)
      throw new Error(
        "O status desta assinatura é sincronizado pelo provedor. Use cancelar ou reativar.",
      );
    if (status === "active" && Date.parse(sub.current_period_end) <= Date.now())
      throw new Error("O período da assinatura expirou.");
    if (
      status === "trialing" &&
      !(Date.parse(sub.trial_ends_at || "") > Date.now())
    )
      throw new Error("A assinatura não possui um período de teste vigente.");
    const canceled = status === "canceled";
    return SubscriptionService.updateStatus(id, status, {
      cancel_at_period_end: canceled,
      canceled_at: canceled ? new Date().toISOString() : null,
      ended_at: canceled ? new Date().toISOString() : null,
    });
  }
}
