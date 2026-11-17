import "server-only";
import { requirePlatformUser, AccessError } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
export async function mentorshipUnreadCount(side: "admin" | "student") {
  const actor = await requirePlatformUser();
  if (side === "admin" && !actor.staff)
    throw new AccessError("Acesso negado", 403);
  const column = side === "admin" ? "unread_count_coach" : "unread_count_user";
  const db = await createServiceClientSSR();
  let count = 0;
  for (let offset = 0; ; offset += 1000) {
    let query = db
      .from("mentorship_rooms")
      .select(`id,${column}`)
      .eq("is_active", true)
      .gt(column, 0)
      .order("id");
    if (side === "student") query = query.eq("user_id", actor.userId);
    else if (actor.role !== "admin") query = query.eq("coach_id", actor.userId);
    const { data, error } = await query.range(offset, offset + 999);
    if (error)
      throw new Error("Não foi possível consultar mensagens não lidas");
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    count += rows.reduce(
      (sum, row) => sum + Math.max(0, Number(row[column]) || 0),
      0,
    );
    if (rows.length < 1000) return count;
  }
}
