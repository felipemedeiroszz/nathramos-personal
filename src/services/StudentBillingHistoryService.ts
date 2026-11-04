import "server-only";
import { z } from "zod";
import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { checked } from "./StudentRoutineService";
import { shiftDateKey, zonedTimeToUtc } from "@/lib/notifications/time";

export const historyStatuses = ["paid", "pending", "processing", "failed", "canceled", "expired", "refunded", "partially_refunded"] as const;
export class BillingHistoryFilterError extends Error {}
export function billingHistoryFilters(params: Record<string, string | undefined>) {
  const parsed = z.object({
    page: z.coerce.number().int().min(1).max(1000000),
    status: z.enum(["all", ...historyStatuses]),
    provider: z.enum(["all", "manual", "stripe", "asaas"]),
    type: z.enum(["all", "plan"]),
    date: z.enum(["created_at", "paid_at", "due_at"]),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  }).safeParse({
    page: params.financePage || 1, status: params.financeStatus || "all",
    provider: params.financeProvider || "all", type: params.financeType || "all",
    date: params.financeDate || "created_at", from: params.financeFrom || undefined, to: params.financeTo || undefined,
  });
  if (!parsed.success) throw new BillingHistoryFilterError("Filtros financeiros inválidos.");
  const data = parsed.data;
  if (data.from && data.to && data.from > data.to) throw new BillingHistoryFilterError("O início do período deve ser anterior ao fim.");
  return data;
}

export interface StudentBillingHistoryRow {
  id: string; status: string; amount_cents: number; currency: string; method: string; provider: string;
  subscription_id: string | null; external_id: string | null; created_at: string; due_at: string | null;
  paid_at: string | null; refunded_at: string | null; refunded_amount_cents: number;
  description_pt: string; description_en: string; metadata: { notes?: string } | null;
  subscription: { plan: { name_pt: string; name_en: string } | null } | null;
}

export async function studentBillingHistory(studentId: string, params: Record<string, string | undefined> = {}) {
  await requireRole(["admin"], "/dashboard");
  z.string().uuid().parse(studentId);
  const filters = billingHistoryFilters(params);
  const db: any = await createServiceClientSSR();
  const profile = checked<any>(await db.from("profiles").select("id,role,is_deleted").eq("id", studentId).maybeSingle(), "billing history student");
  if (!profile || profile.role !== "student" || profile.is_deleted) throw new Error("Conta de aluno indisponível.");
  const query = (columns: string, count = false) => {
    let q = db.from("payments").select(columns, count ? { count: "exact", head: true } : undefined)
      .eq("user_id", studentId).eq("is_duplicate", false);
    if (filters.status !== "all") q = q.eq("status", filters.status);
    if (filters.provider !== "all") q = q.eq("provider", filters.provider);
    if (filters.type === "plan") q = q.or("subscription_id.not.is.null,provider.eq.manual");
    if (filters.from) q = q.gte(filters.date, zonedTimeToUtc(filters.from, "00:00", "America/Sao_Paulo").toISOString());
    if (filters.to) q = q.lt(filters.date, zonedTimeToUtc(shiftDateKey(filters.to, 1), "00:00", "America/Sao_Paulo").toISOString());
    return q;
  };
  const countResult = await query("id", true);
  checked(countResult, "billing history count");
  const total: number = countResult.count ?? 0;
  const size = 20, pages = Math.max(1, Math.ceil(total / size)), page = Math.min(filters.page, pages);
  const rows = checked<StudentBillingHistoryRow[]>(await query(
    "id,status,amount_cents,currency,method,provider,subscription_id,external_id,created_at,due_at,paid_at,refunded_at,refunded_amount_cents,description_pt,description_en,metadata,subscription:subscriptions(plan:plans(name_pt,name_en))",
  ).order("created_at", { ascending: false }).order("id").range((page - 1) * size, page * size - 1), "billing history payments");
  return { rows, total, size, pages, page, filters };
}
