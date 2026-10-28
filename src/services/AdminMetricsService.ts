import { getAdminReport } from "./AdminReportingService";
import type { AdminCurrency } from "@/lib/admin/reporting";
export class AdminMetricsService {
  static async getDashboardMetrics(currency: AdminCurrency = "BRL") {
    return (await getAdminReport(currency)).metric;
  }
  static async getRevenueData(months = 12, currency: AdminCurrency = "BRL") {
    return (await getAdminReport(currency)).revenue.slice(-months);
  }
  static async getGrowthData(currency: AdminCurrency = "BRL") {
    return (await getAdminReport(currency)).growth;
  }
  static async getSubscriptionStatusData(currency: AdminCurrency = "BRL") {
    const labels: Record<string, string> = {
      active: "Ativas",
      trialing: "Teste",
      past_due: "Atrasadas",
      blocked: "Bloqueadas",
      inactive: "Inativas",
      canceled: "Canceladas",
      expired: "Expiradas",
    };
    return (await getAdminReport(currency)).statusCounts.map((s) => ({
      name: labels[s.status] || s.status,
      value: s.count,
    }));
  }
  static async getTopPlans(limit = 5, currency: AdminCurrency = "BRL") {
    return (await getAdminReport(currency)).topPlans
      .slice(0, limit)
      .map((p) => ({ name: p.name, value: p.count }));
  }
  static async getRecentPayments(
    limit = 5,
    currency: AdminCurrency = "BRL",
    locale = "pt-BR",
  ) {
    return (await getAdminReport(currency)).recentPayments
      .filter((p) => p.currency === currency)
      .slice(0, limit)
      .map((p) => ({
        name: p.student_name,
        value: new Intl.NumberFormat(locale, {
          style: "currency",
          currency: p.currency,
        }).format(p.amount_cents / 100),
        status: p.status as string,
        date: new Date(p.paid_at || p.created_at).toLocaleDateString(locale, {
          timeZone: "America/Sao_Paulo",
          day: "2-digit",
          month: "2-digit",
        }),
      }));
  }
}
