import { createServiceClientSSR } from "../lib/supabase/server";
import type {
  PaymentRow,
  SubscriptionRow,
  SubscriptionStatusT,
  PaymentProviderT,
} from "../lib/supabase/types";

export type AdminSubscriptionRow = SubscriptionRow & {
  student_name: string | null;
  plan_name: string | null;
};

export type AdminPaymentRow = PaymentRow & {
  student_name: string | null;
};

export interface SubscriptionFilters {
  status?: SubscriptionStatusT | "all";
  provider?: PaymentProviderT | "all";
  search?: string;
}

export interface PaymentFilters {
  status?: string;
  provider?: PaymentProviderT | "all";
  method?: string;
  search?: string;
}

export interface FinanceOverview {
  month_refunded_cents: number;
  month_after_refunds_cents: number;
  currency: string;
  mrr_cents: number;
  month_revenue_cents: number;
  year_revenue_cents: number;
  last12_revenue_cents: number;
  avg_ticket_cents: number;
  total_subscriptions: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  past_due_subscriptions: number;
  blocked_subscriptions: number;
  canceled_subscriptions: number;
  payments_this_month: number;
  failed_this_month: number;
  refunded_this_month: number;
}

export interface IntegrationStatus {
  stripe: { configured: boolean; mode: string };
  asaas: { configured: boolean; environment: string };
}

import { checked, readPages } from "./StudentRoutineService";
import { getAdminReport } from "./AdminReportingService";
import type { AdminCurrency } from "@/lib/admin/reporting";
export class BillingAdminService {
  private static async lookup(table: "profiles" | "plans", ids: string[]) {
    const db: any = await createServiceClientSSR();
    const unique = Array.from(new Set(ids));
    const names = new Map<string, string>();
    for (let offset = 0; offset < unique.length; offset += 250) {
      const rows = checked<any[]>(
        await db
          .from(table)
          .select(
            table === "profiles" ? "id,full_name,display_name" : "id,name_pt",
          )
          .in("id", unique.slice(offset, offset + 250)),
        `admin ${table} names`,
      );
      for (const row of rows)
        names.set(
          row.id,
          row.display_name || row.full_name || row.name_pt || "—",
        );
    }
    return names;
  }
  static async listSubscriptions(
    filters: SubscriptionFilters = {},
  ): Promise<AdminSubscriptionRow[]> {
    const db: any = await createServiceClientSSR();
    const result = await readPages<SubscriptionRow>(() => {
      let query = db
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id");
      if (filters.status && filters.status !== "all")
        query = query.eq("status", filters.status);
      if (filters.provider && filters.provider !== "all")
        query = query.eq("provider", filters.provider);
      return query;
    }, "admin subscription list");
    const [names, plans] = await Promise.all([
      this.lookup(
        "profiles",
        result.data.map((r) => r.user_id),
      ),
      this.lookup(
        "plans",
        result.data.map((r) => r.plan_id),
      ),
    ]);
    const term = filters.search?.trim().toLowerCase();
    return result.data
      .map((r) => ({
        ...r,
        student_name: names.get(r.user_id) || null,
        plan_name: plans.get(r.plan_id) || null,
      }))
      .filter(
        (r) => !term || (r.student_name || "").toLowerCase().includes(term),
      );
  }
  static async listPayments(
    filters: PaymentFilters = {},
  ): Promise<AdminPaymentRow[]> {
    const db: any = await createServiceClientSSR();
    const result = await readPages<PaymentRow>(() => {
      let query = db
        .from("payments")
        .select("*").eq("is_duplicate",false)
        .order("created_at", { ascending: false })
        .order("id");
      if (filters.status && filters.status !== "all")
        query = query.eq("status", filters.status);
      if (filters.provider && filters.provider !== "all")
        query = query.eq("provider", filters.provider);
      if (filters.method && filters.method !== "all")
        query = query.eq("method", filters.method);
      return query;
    }, "admin payment list");
    const names = await this.lookup(
      "profiles",
      result.data.map((r) => r.user_id),
    );
    const term = filters.search?.trim().toLowerCase();
    return result.data
      .map((r) => ({ ...r, student_name: names.get(r.user_id) || null }))
      .filter(
        (r) =>
          !term ||
          (r.student_name || "").toLowerCase().includes(term) ||
          (r.description_pt || "").toLowerCase().includes(term),
      );
  }
  static async getRevenueSeries(months = 12, currency: AdminCurrency = "BRL") {
    return (await getAdminReport(currency)).revenue.slice(-months);
  }
  static async getFinanceOverview(
    currency: AdminCurrency = "BRL",
  ): Promise<FinanceOverview> {
    return (await getAdminReport(currency)).overview;
  }
  static async getStatusCounts(currency: AdminCurrency = "BRL") {
    return (await getAdminReport(currency)).statusCounts;
  }
  static async getProviderRevenue(currency: AdminCurrency = "BRL") {
    return (await getAdminReport(currency)).providerRevenue;
  }
  static async getTopPlans(limit = 5, currency: AdminCurrency = "BRL") {
    return (await getAdminReport(currency)).topPlans.slice(0, limit);
  }
  static getIntegrationStatus(): IntegrationStatus {
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const asaasKey = process.env.ASAAS_API_KEY || "";
    return {
      stripe: {
        configured: stripeKey.length > 0,
        mode: stripeKey.startsWith("sk_live") ? "live" : "test",
      },
      asaas: {
        configured: asaasKey.length > 0,
        environment: process.env.ASAAS_ENVIRONMENT || "sandbox",
      },
    };
  }
}
export default BillingAdminService;
