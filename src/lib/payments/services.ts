import { createServiceClientSSR } from "@/lib/supabase/server"
import type { PaymentProviderT, PaymentStatusT, PaymentMethodT, SubscriptionStatusT, CurrencyT, PaymentRow, SubscriptionRow, ProfileRow } from "@/lib/supabase/types"
import type { DatabasePublicSchema } from "@/lib/supabase/server"
import { canAccessPlatform } from "@/lib/auth/access"

export type SubscriptionWithPlan = DatabasePublicSchema["subscriptions"]["Row"] & {
  plan: DatabasePublicSchema["plans"]["Row"] | null
}

export interface UpsertSubscriptionInput {
  userId: string
  planId: string
  externalId?: string
  provider?: PaymentProviderT
  externalStatus?: string
  status: SubscriptionStatusT
  currency: CurrencyT
  unitAmountCents: number
  billingCycleDays: number
  trialEndsAt?: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd?: boolean
  canceledAt?: string
  endedAt?: string
  lastPaidAt?: string
  lastFailedAt?: string
}

export interface UpsertPaymentInput {
  userId: string
  subscriptionId?: string
  provider: PaymentProviderT
  externalId?: string
  externalEventId?: string
  status: PaymentStatusT
  amountCents: number
  currency: CurrencyT
  feeCents?: number
  method: PaymentMethodT
  installments?: number
  descriptionPt: string
  descriptionEn: string
  pixQrCode?: string
  pixCopyPaste?: string
  pixExpiresAt?: string
  paidAt?: string
  failedAt?: string
  refundedAt?: string
  failureReason?: string
  metadata?: Record<string, unknown>
  idempotencyKey?: string
}

export const PaymentService = {
  async isEventProcessed(provider: PaymentProviderT, eventId: string): Promise<boolean> {
    const supabase = await createServiceClientSSR()
    const { data } = await supabase
      .from("webhook_events")
      .select("id, processed_at")
      .eq("provider", provider)
      .eq("event_id", eventId)
      .limit(1)
      .maybeSingle()
    const row = data as { id: number; processed_at: string | null } | null
    return !!(row && row.processed_at)
  },

  async markEventProcessed(params: {
    provider: PaymentProviderT
    eventId: string
    eventType: string
    payload: Record<string, unknown>
    signatureOk: boolean
    processedAt?: string
    errorText?: string
  }) {
    const supabase = await createServiceClientSSR()
    const now = params.processedAt ?? new Date().toISOString()
    await supabase.from("webhook_events").upsert(
      {
        provider: params.provider,
        event_id: params.eventId,
        event_type: params.eventType,
        payload: params.payload,
        signature_ok: params.signatureOk,
        processed_at: now,
        error_text: params.errorText ?? null,
      } as never,
      { onConflict: "provider,event_id" }
    )
  },

  async findByExternalId(provider: PaymentProviderT, externalId: string) {
    const supabase = await createServiceClientSSR()
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("provider", provider)
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle()
    return (data as PaymentRow | null) ?? null
  },

  async upsertPayment(input: UpsertPaymentInput) {
    const supabase = await createServiceClientSSR()
    const feeCents = input.feeCents ?? 0
    if (input.externalId) {
      const existing = await this.findByExternalId(input.provider, input.externalId)
      if (existing) {
        const { data } = await supabase
          .from("payments")
          .update({
            status: input.status,
            fee_cents: feeCents,
            paid_at: input.paidAt ?? existing.paid_at ?? null,
            failed_at: input.failedAt ?? existing.failed_at ?? null,
            refunded_at: input.refundedAt ?? existing.refunded_at ?? null,
            failure_reason: input.failureReason ?? existing.failure_reason ?? null,
          } as never)
          .eq("id", existing.id)
          .select()
          .limit(1)
          .maybeSingle()
        return (data as PaymentRow | null) ?? existing
      }
    }
    const { data } = await supabase
      .from("payments")
      .insert({
        user_id: input.userId,
        subscription_id: input.subscriptionId ?? null,
        provider: input.provider,
        external_id: input.externalId ?? null,
        external_event_id: input.externalEventId ?? null,
        status: input.status,
        amount_cents: input.amountCents,
        currency: input.currency,
        fee_cents: feeCents,
        method: input.method,
        installments: input.installments ?? 1,
        description_pt: input.descriptionPt,
        description_en: input.descriptionEn,
        pix_qr_code: input.pixQrCode ?? null,
        pix_copy_paste: input.pixCopyPaste ?? null,
        pix_expires_at: input.pixExpiresAt ?? null,
        paid_at: input.paidAt ?? null,
        failed_at: input.failedAt ?? null,
        refunded_at: input.refundedAt ?? null,
        failure_reason: input.failureReason ?? null,
        metadata: (input.metadata ?? {}) as unknown as PaymentRow["metadata"],
        idempotency_key: input.idempotencyKey ?? null,
      } as never)
      .select()
      .limit(1)
      .maybeSingle()
    return (data as PaymentRow | null) ?? null
  },

  async getUserPaymentHistory(userId: string, limit = 50) {
    const supabase = await createServiceClientSSR()
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
    return (data as PaymentRow[]) ?? []
  },
}

export const SubscriptionService = {
  async getActive(userId: string): Promise<SubscriptionWithPlan | null> {
    const supabase = await createServiceClientSSR()
    const { data } = await supabase
      .from("subscriptions")
      .select(`*, plan:plans(*)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data as SubscriptionWithPlan | null) ?? null
  },

  async findByExternalId(provider: PaymentProviderT, externalId: string): Promise<SubscriptionWithPlan | null> {
    const supabase = await createServiceClientSSR()
    const { data } = await supabase
      .from("subscriptions")
      .select(`*, plan:plans(*)`)
      .eq("provider", provider)
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle()
    return (data as SubscriptionWithPlan | null) ?? null
  },

  async getOrCreateForUser(userId: string, planId: string): Promise<SubscriptionWithPlan | null> {
    const existing = await this.getActive(userId)
    if (existing) return existing
    return null
  },

  async upsertSubscription(input: UpsertSubscriptionInput) {
    const supabase = await createServiceClientSSR()
    let existing: SubscriptionWithPlan | null = null
    if (input.externalId && input.provider) {
      existing = await this.findByExternalId(input.provider, input.externalId)
    }
    if (!existing) {
      existing = await this.getActive(input.userId)
    }

    if (existing) {
      const { data } = await supabase
        .from("subscriptions")
        .update({
          plan_id: input.planId,
          status: input.status,
          external_status: input.externalStatus ?? existing.external_status ?? null,
          currency: input.currency,
          unit_amount_cents: input.unitAmountCents,
          billing_cycle_days: input.billingCycleDays,
          trial_ends_at: input.trialEndsAt ?? existing.trial_ends_at ?? null,
          current_period_start: input.currentPeriodStart,
          current_period_end: input.currentPeriodEnd,
          cancel_at_period_end: input.cancelAtPeriodEnd ?? existing.cancel_at_period_end,
          canceled_at: input.canceledAt ?? existing.canceled_at ?? null,
          ended_at: input.endedAt ?? existing.ended_at ?? null,
          last_paid_at: input.lastPaidAt ?? existing.last_paid_at ?? null,
          last_failed_at: input.lastFailedAt ?? existing.last_failed_at ?? null,
        } as never)
        .eq("id", existing.id)
        .select(`*, plan:plans(*)`)
        .limit(1)
        .maybeSingle()
      return (data as SubscriptionWithPlan | null) ?? existing
    }

    const { data } = await supabase
      .from("subscriptions")
      .insert({
        user_id: input.userId,
        plan_id: input.planId,
        status: input.status,
        external_id: input.externalId ?? null,
        provider: input.provider ?? null,
        external_status: input.externalStatus ?? null,
        currency: input.currency,
        unit_amount_cents: input.unitAmountCents,
        billing_cycle_days: input.billingCycleDays,
        trial_ends_at: input.trialEndsAt ?? null,
        current_period_start: input.currentPeriodStart,
        current_period_end: input.currentPeriodEnd,
        cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
        canceled_at: input.canceledAt ?? null,
        ended_at: input.endedAt ?? null,
        started_at: new Date().toISOString(),
        last_paid_at: input.lastPaidAt ?? null,
        last_failed_at: input.lastFailedAt ?? null,
        dunning_attempts: 0,
        discount_pct: 0,
      } as never)
      .select(`*, plan:plans(*)`)
      .limit(1)
      .maybeSingle()
    return (data as SubscriptionWithPlan | null) ?? null
  },

  async updateStatus(userId: string, status: SubscriptionStatusT, externalStatus?: string) {
    const supabase = await createServiceClientSSR()
    await supabase
      .from("subscriptions")
      .update({ status, external_status: externalStatus ?? null } as never)
      .eq("user_id", userId)
  },

  /** Ativa a assinatura após confirmação de pagamento (ex.: PIX pago). */
  async markPaid(subscriptionId: string, paidAt?: string) {
    const supabase = await createServiceClientSSR()
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .limit(1)
      .maybeSingle()
    const sub = data as SubscriptionRow | null
    if (!sub) return null

    const now = paidAt ? new Date(paidAt) : new Date()
    const end = new Date(now.getTime() + (sub.billing_cycle_days || 30) * 86400_000)

    const { data: updated } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        last_paid_at: now.toISOString(),
        cancel_at_period_end: false,
        ended_at: null,
      } as never)
      .eq("id", subscriptionId)
      .select()
      .limit(1)
      .maybeSingle()

    return (updated as SubscriptionRow | null) ?? sub
  },

  async cancel(userId: string) {
    const sub = await this.getActive(userId)
    if (!sub || !sub.external_id || !sub.provider) {
      return { ok: false, reason: "no_active_subscription" }
    }
    if (sub.provider === "stripe") {
      const { StripeProvider } = await import("./stripe")
      await StripeProvider.cancelSubscription(sub.external_id)
    }
    const supabase = await createServiceClientSSR()
    await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true, canceled_at: new Date().toISOString() } as never)
      .eq("id", sub.id)
    return { ok: true }
  },

  async reactivate(userId: string) {
    const sub = await this.getActive(userId)
    if (!sub || !sub.external_id || !sub.provider) {
      return { ok: false, reason: "no_active_subscription" }
    }
    if (sub.provider === "stripe") {
      const { StripeProvider } = await import("./stripe")
      await StripeProvider.reactivateSubscription(sub.external_id)
    }
    const supabase = await createServiceClientSSR()
    await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: false, canceled_at: null, status: "active" } as never)
      .eq("id", sub.id)
    return { ok: true }
  },

  async canAccess(userId: string) {
    return canAccessPlatform(userId, true)
  },
}

export const ProfileService = {
  async getProfile(userId: string) {
    const supabase = await createServiceClientSSR()
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .limit(1)
      .maybeSingle()
    return (data as ProfileRow | null) ?? null
  },

  async setStripeCustomerId(userId: string, customerId: string) {
    const supabase = await createServiceClientSSR()
    await supabase.from("profiles").update({ stripe_customer_id: customerId } as never).eq("id", userId)
  },

  async setAsaasCustomerId(userId: string, customerId: string) {
    const supabase = await createServiceClientSSR()
    await supabase.from("profiles").update({ asaas_customer_id: customerId } as never).eq("id", userId)
  },
}
