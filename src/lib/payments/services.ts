import { createServiceClientSSR } from "@/lib/supabase/server"
import type { PaymentProviderT, PaymentRow, ProfileRow } from "@/lib/supabase/types"
import type { DatabasePublicSchema } from "@/lib/supabase/server"
import { canAccessPlatform } from "@/lib/auth/access"

export type SubscriptionWithPlan = DatabasePublicSchema["subscriptions"]["Row"] & {
  plan: DatabasePublicSchema["plans"]["Row"] | null
}

export const PaymentService = {
  async isEventProcessed(provider: PaymentProviderT, eventId: string): Promise<boolean> {
    const supabase = await createServiceClientSSR()
    const { data, error } = await supabase
      .from("webhook_events")
      .select("id, processed_at, error_text")
      .eq("provider", provider)
      .eq("event_id", eventId)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    const row = data as { id: number; processed_at: string | null; error_text: string | null } | null
    return !!(row && row.processed_at && !row.error_text)
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
    if (params.errorText) {
      const { error } = await (supabase as any).rpc("billing_record_failure", { p_provider:params.provider,p_event:params.eventId,p_type:params.eventType,p_payload:params.payload,p_error:params.errorText });
      if (error) throw error;
      return;
    }
    const now = params.processedAt ?? new Date().toISOString()
    const { error } = await supabase.from("webhook_events").upsert(
      {
        provider: params.provider,
        event_id: params.eventId,
        event_type: params.eventType,
        payload: params.payload,
        signature_ok: params.signatureOk,
        processed_at: params.errorText ? null : now,
        error_text: params.errorText ?? null,
      } as never,
      { onConflict: "provider,event_id" }
    )
    if (error) throw error
  },

  async findByExternalId(provider: PaymentProviderT, externalId: string) {
    const supabase = await createServiceClientSSR()
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("provider", provider)
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return (data as PaymentRow | null) ?? null
  },

  async getUserPaymentHistory(userId: string, limit = 50) {
    const supabase = await createServiceClientSSR()
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId).eq("is_duplicate", false)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data as PaymentRow[]) ?? []
  },
}

export const SubscriptionService = {
  async getActive(userId: string): Promise<SubscriptionWithPlan | null> {
    const supabase = await createServiceClientSSR()
    const {data,error} = await (supabase as any).rpc("billing_current_subscription",{p_user:userId})
    if (error) throw error
    return data as SubscriptionWithPlan | null
  },

  async findByExternalId(provider: PaymentProviderT, externalId: string): Promise<SubscriptionWithPlan | null> {
    const supabase = await createServiceClientSSR()
    const { data, error } = await supabase
      .from("subscriptions")
      .select(`*, plan:plans(*)`)
      .eq("provider", provider)
      .eq("external_id", externalId)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return (data as SubscriptionWithPlan | null) ?? null
  },

  async cancel(userId: string) {
    const sub = await this.getActive(userId)
    if (!sub) return {ok:false,reason:"no_active_subscription"}
    const {AdminSubscriptionService} = await import("@/services/AdminSubscriptionService")
    await AdminSubscriptionService.cancel(sub.id,true)
    return {ok:true}
  },
  async reactivate(userId: string) {
    const sub = await this.getActive(userId)
    if (!sub) return {ok:false,reason:"no_active_subscription"}
    const {AdminSubscriptionService} = await import("@/services/AdminSubscriptionService")
    await AdminSubscriptionService.reactivate(sub.id)
    return {ok:true}
  },

  async canAccess(userId: string) {
    return canAccessPlatform(userId, true)
  },
}

export const ProfileService = {
  async getProfile(userId: string) {
    const supabase = await createServiceClientSSR()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return (data as ProfileRow | null) ?? null
  },

  async setStripeCustomerId(userId: string, customerId: string) {
    const supabase = await createServiceClientSSR()
    const { error } = await supabase.from("profiles").update({ stripe_customer_id: customerId } as never).eq("id", userId)
    if (error) throw error
  },

  async setAsaasCustomerId(userId: string, customerId: string) {
    const supabase = await createServiceClientSSR()
    const { error } = await supabase.from("profiles").update({ asaas_customer_id: customerId } as never).eq("id", userId)
    if (error) throw error
  },
}
