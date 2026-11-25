import "server-only";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { StudentAssignedContentService } from "./StudentAssignedContentService";
import { weekdayOf } from "@/lib/student/schedule";
import type { CardioActivity, CardioData } from "@/lib/cardio";
export class CardioService {
  static async activities(all = false): Promise<CardioActivity[]> {
    const db: any = await createServiceClientSSR();
    let q = db
      .from("cardio_activities")
      .select("id,name_pt,name_en,is_active")
      .order("name_pt");
    if (!all) q = q.eq("is_active", true);
    const result = await q;
    if (result.error)
      throw new Error("Cardio indisponível. Verifique a migração 000067.");
    return result.data || [];
  }
  static async student(userId: string): Promise<CardioData> {
    const today = await StudentAssignedContentService.today(userId),
      db: any = await createServiceClientSSR();
    try {
      const [activities, plans, logs] = await Promise.all([
        this.activities(true),
        db
          .from("student_cardio_schedule")
          .select("weekday,activity_id,target_minutes")
          .eq("student_id", userId)
          .order("weekday"),
        db
          .from("student_cardio_logs")
          .select("performed_on,status,activity_id,duration_min,notes")
          .eq("student_id", userId)
          .order("performed_on", { ascending: false })
          .limit(30),
      ]);
      if (plans.error || logs.error) throw new Error("Cardio indisponível.");
      return {
        activities,
        plans: plans.data || [],
        logs: logs.data || [],
        today,
        weekday: weekdayOf(today),
      };
    } catch {
      return {
        activities: [],
        plans: [],
        logs: [],
        today,
        weekday: weekdayOf(today),
        unavailable: true,
      };
    }
  }
}
