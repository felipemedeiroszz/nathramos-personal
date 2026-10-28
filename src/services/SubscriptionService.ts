import { addDays, isAfter, parseISO } from "date-fns"
import { createServiceClientSSR } from "../lib/supabase/server"
import type {
  SubscriptionRow,
  SubscriptionStatusT,
  PaymentProviderT,
  PaymentMethodT,
  PlanRow,
  CurrencyT,
} from "../lib/supabase/types"
import type { DatabasePublicSchema } from "../lib/supabase/server"
import { SUBSCRIPTION_GRACE_DAYS } from "../config/constants"

type SubInsertT = DatabasePublicSchema["subscriptions"]["Insert"]
type SubUpdateT = DatabasePublicSchema["subscriptions"]["Update"]

export interface CreateSubscriptionInputs {
  external_id?: string
  external_status?: string
  payment_method?: PaymentMethodT
  coupon?: string
  discount_pct?: number
  source?: string
  ip_signup?: string
  trial_ends_at?: string
}

export type SubscriptionPatch = SubUpdateT

export class SubscriptionService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  private static getDates(plan: PlanRow): {
    current_period_start: string
    current_period_end: string
    trial_ends_at?: string
    started_at: string
  } {
    const now = new Date()
    const started_at = now.toISOString()
    const current_period_start = started_at
    const current_period_end = addDays(now, plan.billing_cycle_days).toISOString()
    const trial_ends_at = plan.trial_days > 0
      ? addDays(now, plan.trial_days).toISOString()
      : undefined

    return { current_period_start, current_period_end, trial_ends_at, started_at }
  }

  static async create(
    userId: string,
    planId: string,
    paymentProvider: PaymentProviderT,
    inputs: CreateSubscriptionInputs = {}
  ): Promise<SubscriptionRow> {
    const supabase = await this.getSupabase()

    const planResult = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .single()

    const plan = planResult.data as PlanRow | null
    if (planResult.error || !plan) {
      throw new Error(`Plano não encontrado ou inativo: ${planResult.error?.message ?? "unknown"}`)
    }

    const dates = this.getDates(plan)
    const status: SubscriptionStatusT = dates.trial_ends_at ? "trialing" : "past_due"

    const insertPayload: SubInsertT = {
      user_id: userId,
      plan_id: plan.id,
      status,
      external_id: inputs.external_id ?? null,
      provider: paymentProvider,
      external_status: inputs.external_status ?? null,
      currency: plan.currency as CurrencyT,
      unit_amount_cents: plan.price_cents,
      billing_cycle_days: plan.billing_cycle_days,
      trial_ends_at: dates.trial_ends_at ?? inputs.trial_ends_at ?? null,
      current_period_start: dates.current_period_start,
      current_period_end: dates.current_period_end,
      grace_until: null,
      block_reason: null,
      cancel_at_period_end: false,
      canceled_at: null,
      ended_at: null,
      started_at: dates.started_at,
      pause_starts_at: null,
      pause_ends_at: null,
      payment_method_pref: inputs.payment_method ?? null,
      last_paid_at: null,
      last_failed_at: null,
      dunning_attempts: 0,
      discount_pct: inputs.discount_pct ?? 0,
      coupon_code: inputs.coupon ?? null,
      source: inputs.source ?? null,
      ip_signup: inputs.ip_signup ?? null,
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert(insertPayload as never)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Falha ao criar assinatura: ${error?.message ?? "unknown"}`)
    }

    return data as SubscriptionRow
  }

  static async getActive(userId: string): Promise<SubscriptionRow | null> {
    const supabase = await this.getSupabase()

    const activeStatuses: SubscriptionStatusT[] = ["trialing", "active", "past_due"]

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", activeStatuses)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Falha ao buscar assinatura ativa: ${error.message}`)
    }

    return (data as SubscriptionRow | null) ?? null
  }

  static async updateStatus(
    subId: string,
    status: SubscriptionStatusT,
    patch: SubscriptionPatch = {}
  ): Promise<SubscriptionRow> {
    const supabase = await this.getSupabase()

    const updatePayload: SubUpdateT = {
      ...patch,
      status,
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .update(updatePayload as never)
      .eq("id", subId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Falha ao atualizar status da assinatura: ${error?.message ?? "unknown"}`)
    }

    return data as SubscriptionRow
  }

  static applyGracePeriodLogic(
    sub: SubscriptionRow
  ): Pick<SubscriptionRow, "status" | "grace_until" | "block_reason"> {
    const now = new Date()
    const periodEnd = parseISO(sub.current_period_end)
    const prepaidPix = sub.provider === "asaas" && (sub.source === "asaas_pix" || sub.external_id?.startsWith("pay_"))
    if (prepaidPix && periodEnd.getTime() <= now.getTime()) {
      return { status: "blocked", grace_until: null, block_reason: "pix_period_expired_payment_required" }
    }
    const graceUntil = addDays(periodEnd, SUBSCRIPTION_GRACE_DAYS)

    if (isAfter(now, graceUntil)) {
      return {
        status: "blocked",
        grace_until: graceUntil.toISOString(),
        block_reason: "grace_period_expired",
      }
    }

    return {
      status: "past_due",
      grace_until: graceUntil.toISOString(),
      block_reason: null,
    }
  }

  static async cancel(
    subId: string,
    atPeriodEnd: boolean = true
  ): Promise<SubscriptionRow> {
    const supabase = await this.getSupabase()
    const now = new Date().toISOString()

    const payload: SubUpdateT = atPeriodEnd
      ? {
          cancel_at_period_end: true,
          canceled_at: now,
        }
      : {
          cancel_at_period_end: true,
          canceled_at: now,
          ended_at: now,
          status: "canceled",
        }

    const { data, error } = await supabase
      .from("subscriptions")
      .update(payload as never)
      .eq("id", subId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Falha ao cancelar assinatura: ${error?.message ?? "unknown"}`)
    }

    return data as SubscriptionRow
  }

  static async reactivate(subId: string): Promise<SubscriptionRow> {
    const supabase = await this.getSupabase()

    const fetchResult = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subId)
      .single()

    const existing = fetchResult.data as SubscriptionRow | null
    if (fetchResult.error || !existing) {
      throw new Error(`Assinatura não encontrada: ${fetchResult.error?.message ?? "unknown"}`)
    }

    let newStatus: SubscriptionStatusT = existing.status

    if (existing.status === "canceled" && existing.ended_at) {
      const now = new Date()
      const endedAt = parseISO(existing.ended_at)
      if (isAfter(now, endedAt)) {
        newStatus = "expired"
      }
    } else if (existing.cancel_at_period_end) {
      newStatus = isAfter(parseISO(existing.current_period_end), new Date()) ? "active" : "expired"
    } else if (existing.status === "blocked") {
      newStatus = "past_due"
    }

    const endedAtVal = existing.status === "canceled" && !isAfter(new Date(), parseISO(existing.current_period_end))
      ? null
      : existing.ended_at

    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: false,
        canceled_at: null,
        ended_at: endedAtVal,
        status: newStatus,
      } as never)
      .eq("id", subId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Falha ao reativar assinatura: ${error?.message ?? "unknown"}`)
    }

    return data as SubscriptionRow
  }
}
