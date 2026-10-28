import "server-only";
import { DatabaseOperationError } from "@/lib/supabase/errors";
import { requirePlatformUser, AccessError } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
import {
  analyticsFilters,
  type AnalyticsParams,
  type AnalyticsReport,
} from "@/lib/analytics/model";
export async function getAnalyticsReport(params: AnalyticsParams, size = 25) {
  const actor = await requirePlatformUser();
  if (!actor.staff) throw new AccessError("Acesso negado.");
  const filters = analyticsFilters(params);
  if (
    actor.role === "coach" &&
    ((filters.coach && filters.coach !== actor.userId) ||
      filters.plan ||
      filters.provider)
  )
    throw new AccessError("Filtros fora da sua carteira.");
  const db = await createServiceClientSSR();
  const { data, error } = await (db.rpc as any)("admin_analytics_report", {
    p_actor: actor.userId,
    p_from: filters.from,
    p_to: filters.to,
    p_grain: filters.grain,
    p_currency: filters.currency,
    p_coach: filters.coach || null,
    p_plan: filters.plan || null,
    p_provider: filters.provider || null,
    p_search: filters.q,
    p_page: filters.page,
    p_size: size,
  });
  if (error || !data) {
    throw new DatabaseOperationError("admin.analytics",error);
  }
  const report = data as AnalyticsReport;
  if (actor.role === "coach" && report.financial !== null)
    throw new Error("Escopo inválido para o relatório.");
  return { report, filters, actor };
}
