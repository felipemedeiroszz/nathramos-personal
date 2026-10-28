import "server-only";
import { DatabaseOperationError } from "@/lib/supabase/errors";
import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { z } from "zod";
export type AdminDataKind =
  | "payments"
  | "subscriptions"
  | "diet_foods"
  | "supplements"
  | "ebooks"
  | "diet_kits"
  | "supplement_kits"
  | "workout_kits"
  | "exams"
  | "exercises";
export type PageParams = Record<string, string | undefined>;
export function dataFilters(params: PageParams) {
  const filters: Record<string, string> = {};
  for (const key of [
    "q",
    "status",
    "provider",
    "currency",
    "category",
    "language",
    "source",
    "difficulty",
    "equipment",
  ])
    if (params[key] && params[key] !== "all")
      filters[key] = params[key]!.trim().slice(0, 200);
  for (const [key, column] of [
    ["active", "is_active"],
    ["published", "is_published"],
    ["free", "is_free"],
  ])
    if (["0", "1"].includes(params[key] || ""))
      filters[column] = params[key] === "1" ? "true" : "false";
  for (const key of ["from", "to"])
    if (params[key]) {
      const date = z.string().date().safeParse(params[key]);
      if (!date.success) throw new Error("Data inválida. Use AAAA-MM-DD.");
      filters[key] = date.data;
    }
  if (filters.from && filters.to && filters.from > filters.to)
    throw new Error("A data final deve ser igual ou posterior à inicial.");
  if (filters.currency && !["BRL", "USD"].includes(filters.currency))
    throw new Error("Moeda inválida.");
  return filters;
}
export async function getAdminDataPage(
  kind: AdminDataKind,
  params: PageParams = {},
  size = 30,
  snapshot?: string,
) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");
  const db = await createServiceClientSSR();
  const filters = dataFilters(params);
  if (snapshot) filters._snapshot = snapshot;
  if (kind === "exams" && filters.category) {
    filters.category_id = filters.category;
    delete filters.category;
  }
  const { data, error } = await (db.rpc as any)("admin_data_page", {
    p_actor: userId,
    p_kind: kind,
    p_filters: filters,
    p_page: Math.max(1, Number.parseInt(params.page || "1", 10) || 1),
    p_size: size,
  });
  if (error) throw new DatabaseOperationError(`admin.catalog.${kind}`,error);
  return data as {
    rows: any[];
    total: number;
    page: number;
    size: number;
    snapshot: string;
  };
}
