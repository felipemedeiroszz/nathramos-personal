import { createServiceClientSSR } from "../lib/supabase/server"
import type {
  PaymentRow,
  SubscriptionRow,
  SubscriptionStatusT,
  PaymentProviderT,
} from "../lib/supabase/types"

export type AdminSubscriptionRow = SubscriptionRow & {
  student_name: string | null
  plan_name: string | null
}

export type AdminPaymentRow = PaymentRow & {
  student_name: string | null
}

export interface SubscriptionFilters {
  status?: SubscriptionStatusT | "all"
  provider?: PaymentProviderT | "all"
  search?: string
}

export interface PaymentFilters {
  status?: string
  provider?: PaymentProviderT | "all"
  method?: string
  search?: string
}

export interface FinanceOverview {
  currency: string
  mrr_cents: number
  month_revenue_cents: number
  year_revenue_cents: number
  last12_revenue_cents: number
  avg_ticket_cents: number
  total_subscriptions: number
  active_subscriptions: number
  trialing_subscriptions: number
  past_due_subscriptions: number
  blocked_subscriptions: number
  canceled_subscriptions: number
  payments_this_month: number
  failed_this_month: number
  refunded_this_month: number
}

export interface IntegrationStatus {
  stripe: { configured: boolean; mode: string }
  asaas: { configured: boolean; environment: string }
}

function monthlyFromCycle(amountCents: number, cycleDays: number): number {
  if (!cycleDays || cycleDays <= 0) return amountCents
  return Math.round((amountCents * 30) / cycleDays)
}

export class BillingAdminService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  private static async profileNames(userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    const ids = Array.from(new Set(userIds.filter(Boolean)))
    if (ids.length === 0) return map
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, display_name")
        .in("id", ids)
      for (const row of (data as any[]) ?? []) {
        map.set(row.id, row.display_name || row.full_name || null)
      }
    } catch {}
    return map
  }

  private static async planNames(planIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    const ids = Array.from(new Set(planIds.filter(Boolean)))
    if (ids.length === 0) return map
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("plans")
        .select("id, name_pt, name_en")
        .in("id", ids)
      for (const row of (data as any[]) ?? []) {
        map.set(row.id, row.name_pt || row.name_en || null)
      }
    } catch {}
    return map
  }

  static async listSubscriptions(
    filters: SubscriptionFilters = {}
  ): Promise<AdminSubscriptionRow[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500)

      if (filters.status && filters.status !== "all") {
        q = q.eq("status", filters.status)
      }
      if (filters.provider && filters.provider !== "all") {
        q = q.eq("provider", filters.provider)
      }

      const { data, error } = await q
      if (error) return []

      const rows = (data as SubscriptionRow[]) ?? []
      const [names, plans] = await Promise.all([
        this.profileNames(rows.map((r) => r.user_id)),
        this.planNames(rows.map((r) => r.plan_id)),
      ])

      let enriched: AdminSubscriptionRow[] = rows.map((r) => ({
        ...r,
        student_name: names.get(r.user_id) ?? null,
        plan_name: plans.get(r.plan_id) ?? null,
      }))

      const search = filters.search?.trim().toLowerCase()
      if (search) {
        enriched = enriched.filter((r) =>
          (r.student_name ?? "").toLowerCase().includes(search)
        )
      }

      return enriched
    } catch {
      return []
    }
  }

  static async listPayments(filters: PaymentFilters = {}): Promise<AdminPaymentRow[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500)

      if (filters.status && filters.status !== "all") {
        q = q.eq("status", filters.status)
      }
      if (filters.provider && filters.provider !== "all") {
        q = q.eq("provider", filters.provider)
      }
      if (filters.method && filters.method !== "all") {
        q = q.eq("method", filters.method)
      }

      const { data, error } = await q
      if (error) return []

      const rows = (data as PaymentRow[]) ?? []
      const names = await this.profileNames(rows.map((r) => r.user_id))

      let enriched: AdminPaymentRow[] = rows.map((r) => ({
        ...r,
        student_name: names.get(r.user_id) ?? null,
      }))

      const search = filters.search?.trim().toLowerCase()
      if (search) {
        enriched = enriched.filter(
          (r) =>
            (r.student_name ?? "").toLowerCase().includes(search) ||
            (r.description_pt ?? "").toLowerCase().includes(search)
        )
      }

      return enriched
    } catch {
      return []
    }
  }

  static async getRevenueSeries(months: number = 12): Promise<{ name: string; value: number }[]> {
    try {
      const supabase = await this.getSupabase()
      const now = new Date()
      const series: { name: string; value: number }[] = []

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = date.toLocaleDateString("pt-BR", { month: "short" })
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
        const lastDay = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59
        ).toISOString()

        const { data } = await supabase
          .from("payments")
          .select("amount_cents")
          .eq("status", "paid")
          .gte("paid_at", firstDay)
          .lte("paid_at", lastDay)

        const total = ((data as any[]) ?? []).reduce(
          (sum, p) => sum + (p.amount_cents || 0),
          0
        )
        series.push({ name: label, value: Number((total / 100).toFixed(2)) })
      }

      return series
    } catch {
      return []
    }
  }

  static async getFinanceOverview(): Promise<FinanceOverview> {
    const empty: FinanceOverview = {
      currency: "BRL",
      mrr_cents: 0,
      month_revenue_cents: 0,
      year_revenue_cents: 0,
      last12_revenue_cents: 0,
      avg_ticket_cents: 0,
      total_subscriptions: 0,
      active_subscriptions: 0,
      trialing_subscriptions: 0,
      past_due_subscriptions: 0,
      blocked_subscriptions: 0,
      canceled_subscriptions: 0,
      payments_this_month: 0,
      failed_this_month: 0,
      refunded_this_month: 0,
    }

    try {
      const supabase = await this.getSupabase()
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString()

      const { data: subsData } = await supabase
        .from("subscriptions")
        .select("status, unit_amount_cents, billing_cycle_days, currency")

      const subs = (subsData as any[]) ?? []

      let active = 0
      let trialing = 0
      let pastDue = 0
      let blocked = 0
      let canceled = 0
      let mrr = 0
      let currency = "BRL"

      for (const s of subs) {
        currency = s.currency ?? currency
        switch (s.status) {
          case "active":
            active++
            mrr += monthlyFromCycle(s.unit_amount_cents || 0, s.billing_cycle_days || 30)
            break
          case "trialing":
            trialing++
            break
          case "past_due":
            pastDue++
            mrr += monthlyFromCycle(s.unit_amount_cents || 0, s.billing_cycle_days || 30)
            break
          case "blocked":
            blocked++
            break
          case "canceled":
            canceled++
            break
          default:
            break
        }
      }

      const { data: monthPaid } = await supabase
        .from("payments")
        .select("amount_cents")
        .eq("status", "paid")
        .gte("paid_at", firstDayOfMonth)

      const monthRevenue = ((monthPaid as any[]) ?? []).reduce(
        (sum, p) => sum + (p.amount_cents || 0),
        0
      )

      const { data: yearPaid } = await supabase
        .from("payments")
        .select("amount_cents")
        .eq("status", "paid")
        .gte("paid_at", firstDayOfYear)

      const yearPaidRows = (yearPaid as any[]) ?? []
      const yearRevenue = yearPaidRows.reduce((sum, p) => sum + (p.amount_cents || 0), 0)

      const { count: paymentsThisMonth } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .gte("created_at", firstDayOfMonth)

      const { count: failedThisMonth } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", firstDayOfMonth)

      const { count: refundedThisMonth } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "refunded")
        .gte("created_at", firstDayOfMonth)

      const series = await this.getRevenueSeries(12)
      const last12 = series.reduce((sum, p) => sum + p.value * 100, 0)

      return {
        currency,
        mrr_cents: mrr,
        month_revenue_cents: monthRevenue,
        year_revenue_cents: yearRevenue,
        last12_revenue_cents: Math.round(last12),
        avg_ticket_cents:
          yearPaidRows.length > 0 ? Math.round(yearRevenue / yearPaidRows.length) : 0,
        total_subscriptions: subs.length,
        active_subscriptions: active,
        trialing_subscriptions: trialing,
        past_due_subscriptions: pastDue,
        blocked_subscriptions: blocked,
        canceled_subscriptions: canceled,
        payments_this_month: paymentsThisMonth ?? 0,
        failed_this_month: failedThisMonth ?? 0,
        refunded_this_month: refundedThisMonth ?? 0,
      }
    } catch {
      return empty
    }
  }

  static async getStatusCounts(): Promise<{ status: string; count: number }[]> {
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase.from("subscriptions").select("status")
      const counts: Record<string, number> = {}
      for (const row of (data as any[]) ?? []) {
        counts[row.status] = (counts[row.status] || 0) + 1
      }
      return Object.entries(counts).map(([status, count]) => ({ status, count }))
    } catch {
      return []
    }
  }

  static async getProviderRevenue(): Promise<
    { provider: string; revenue_cents: number; count: number }[]
  > {
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("payments")
        .select("provider, amount_cents, status")
        .eq("status", "paid")

      const map = new Map<string, { revenue_cents: number; count: number }>()
      for (const row of (data as any[]) ?? []) {
        const key = row.provider ?? "other"
        const current = map.get(key) ?? { revenue_cents: 0, count: 0 }
        current.revenue_cents += row.amount_cents || 0
        current.count += 1
        map.set(key, current)
      }

      return Array.from(map.entries()).map(([provider, v]) => ({
        provider,
        revenue_cents: v.revenue_cents,
        count: v.count,
      }))
    } catch {
      return []
    }
  }

  static async getTopPlans(
    limit: number = 5
  ): Promise<{ plan_id: string; name: string; count: number }[]> {
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .in("status", ["trialing", "active", "past_due"])

      const counts = new Map<string, number>()
      for (const row of (data as any[]) ?? []) {
        counts.set(row.plan_id, (counts.get(row.plan_id) || 0) + 1)
      }

      const plans = await this.planNames(Array.from(counts.keys()))

      return Array.from(counts.entries())
        .map(([plan_id, count]) => ({
          plan_id,
          name: plans.get(plan_id) ?? "—",
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
    } catch {
      return []
    }
  }

  static getIntegrationStatus(): IntegrationStatus {
    const stripeKey = process.env.STRIPE_SECRET_KEY ?? ""
    const asaasKey = process.env.ASAAS_API_KEY ?? ""
    const stripeMode = stripeKey.startsWith("sk_live") ? "live" : "test"
    const asaasEnv = process.env.ASAAS_ENVIRONMENT ?? "sandbox"
    return {
      stripe: { configured: stripeKey.length > 0, mode: stripeMode },
      asaas: { configured: asaasKey.length > 0, environment: asaasEnv },
    }
  }
}

export default BillingAdminService
