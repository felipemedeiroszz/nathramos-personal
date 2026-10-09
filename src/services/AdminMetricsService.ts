import { createServiceClientSSR } from "../lib/supabase/server"

export interface DashboardMetrics {
  totalStudents: number
  activeStudents: number
  pendingStudents: number
  pastDueStudents: number
  blockedStudents: number
  monthlyRevenue: number
  currency: string
  activeSubscriptions: number
  monthlyCancellations: number
}

export interface RevenueDataPoint {
  name: string
  value: number
}

export interface SubscriptionStatusData {
  name: string
  value: number
}

export interface TopPlan {
  name: string
  value: number
}

export interface RecentPayment {
  name: string
  value: string
  status: "paid" | "pending" | "failed"
  date: string
}

export class AdminMetricsService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const supabase = await this.getSupabase()

      // Total de alunos (profiles com role = student e não deletados)
      const { count: totalStudents } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student")
        .eq("is_deleted", false)

      // Assinaturas ativas e atrasadas
      const { data: activeSubsData } = await supabase
        .from("subscriptions")
        .select("user_id, status")
        .in("status", ["trialing", "active", "past_due"])

      const activeUserIds = new Set((activeSubsData as any)?.map((s: any) => s.user_id) || [])
      const pastDueUserIds = new Set((activeSubsData as any)?.filter((s: any) => s.status === "past_due").map((s: any) => s.user_id) || [])

      // Alunos com assinatura ativa
      const activeStudents = activeUserIds.size

      // Alunos com assinatura atrasada
      const pastDueStudents = pastDueUserIds.size

      // Alunos bloqueados
      const { data: blockedSubsData } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("status", "blocked")
      const blockedUserIds = new Set((blockedSubsData as any)?.map((s: any) => s.user_id) || [])
      const blockedStudents = blockedUserIds.size

      // Alunos pendentes (sem assinatura ativa)
      const pendingStudents = (totalStudents || 0) - activeStudents

      // Assinaturas ativas (contagem direta)
      const { count: activeSubscriptions } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .in("status", ["trialing", "active"])

      // Cancelamentos do mês atual
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { count: monthlyCancellations } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "canceled")
        .gte("canceled_at", firstDayOfMonth)

      // Receita do mês atual (pagamentos pagos neste mês)
      const { data: payments } = await supabase
        .from("payments")
        .select("amount_cents, currency")
        .eq("status", "paid")
        .gte("paid_at", firstDayOfMonth)

      const monthlyRevenue = (payments as any)?.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) || 0
      const currency = (payments as any)?.[0]?.currency || "BRL"

      return {
        totalStudents: totalStudents || 0,
        activeStudents,
        pendingStudents,
        pastDueStudents,
        blockedStudents,
        monthlyRevenue,
        currency,
        activeSubscriptions: activeSubscriptions || 0,
        monthlyCancellations: monthlyCancellations || 0,
      }
    } catch (error) {
      console.error("Erro ao buscar métricas do dashboard:", error)
      return {
        totalStudents: 0,
        activeStudents: 0,
        pendingStudents: 0,
        pastDueStudents: 0,
        blockedStudents: 0,
        monthlyRevenue: 0,
        currency: "BRL",
        activeSubscriptions: 0,
        monthlyCancellations: 0,
      }
    }
  }

  static async getRevenueData(lastMonths: number = 12): Promise<RevenueDataPoint[]> {
    try {
      const supabase = await this.getSupabase()
      const now = new Date()
      const data: RevenueDataPoint[] = []

      for (let i = lastMonths - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleDateString("pt-BR", { month: "short" })
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const { data: payments } = await supabase
          .from("payments")
          .select("amount_cents")
          .eq("status", "paid")
          .gte("paid_at", firstDay)
          .lte("paid_at", lastDay)

        const total = (payments as any)?.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) || 0
        data.push({ name: monthName, value: total / 100 }) // Converter para reais
      }

      return data
    } catch (error) {
      console.error("Erro ao buscar dados de receita:", error)
      return []
    }
  }

  static async getSubscriptionStatusData(): Promise<SubscriptionStatusData[]> {
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("subscriptions")
        .select("status")

      const counts: Record<string, number> = {}
      if (Array.isArray(data)) {
        data.forEach((sub: any) => {
          counts[sub.status] = (counts[sub.status] || 0) + 1
        })
      }

      const labels: Record<string, string> = {
        trialing: "Teste",
        active: "Ativas",
        past_due: "Atrasadas",
        canceled: "Canceladas",
        blocked: "Bloqueadas",
        inactive: "Inativas",
        expired: "Expiradas",
      }

      return Object.entries(counts).map(([status, count]) => ({
        name: labels[status] || status,
        value: count,
      }))
    } catch (error) {
      console.error("Erro ao buscar dados de status de assinaturas:", error)
      return []
    }
  }

  static async getTopPlans(limit: number = 5): Promise<TopPlan[]> {
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_id, plans(name_pt)")
        .in("status", ["trialing", "active", "past_due"])

      const counts: Record<string, number> = {}
      if (Array.isArray(data)) {
        data.forEach((sub: any) => {
          const planName = sub.plans?.name_pt || "Sem plano"
          counts[planName] = (counts[planName] || 0) + 1
        })
      }

      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
    } catch (error) {
      console.error("Erro ao buscar top planos:", error)
      return []
    }
  }

  static async getRecentPayments(limit: number = 5): Promise<RecentPayment[]> {
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("payments")
        .select(`
          amount_cents,
          currency,
          status,
          paid_at,
          profiles!inner(full_name)
        `)
        .order("paid_at", { ascending: false })
        .limit(limit)

      return (data || []).map((p: any) => ({
        name: p.profiles?.full_name || "Desconhecido",
        value: `${(p.amount_cents / 100).toFixed(2)}`,
        status: p.status,
        date: new Date(p.paid_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      }))
    } catch (error) {
      console.error("Erro ao buscar pagamentos recentes:", error)
      return []
    }
  }
}
