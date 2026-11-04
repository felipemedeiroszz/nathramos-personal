import "server-only";
import { createServiceClientSSR } from "@/lib/supabase/server";
import {
  checked,
  readPages,
  StudentRoutineService,
} from "./StudentRoutineService";
import { defaultRule, rulesForDate } from "@/lib/student/schedule";
export interface PlanningAssignment {
  id: string;
  kind: "diet" | "supplement" | "workout";
  name: string;
  start: string;
  end: string | null;
  notes: string;
  rule: ReturnType<typeof defaultRule>;
  revision: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    slots: string[];
  }[];
}
export class DailyPlanningService {
  static async get(studentId: string, date?: string) {
    const data = await StudentRoutineService.get(studentId, date);
    const db: any = await createServiceClientSSR();
    const ruleRows = (
      await readPages<any>(
        () =>
          db
            .from("student_daily_rules")
            .select("*")
            .eq("student_id", studentId)
            .order("effective_from")
            .order("id"),
        "planning rules",
      )
    ).data;
    const rules = rulesForDate(ruleRows, data.date);
    const assignments: PlanningAssignment[] = [];
    for (const kind of ["workout", "diet", "supplement"] as const) {
      const kitTable =
        kind === "workout"
          ? "workout_kits"
          : kind === "diet"
            ? "diet_kits"
            : "supplement_kits";
      const rows = checked<any[]>(
        await db
          .from(`student_${kind}_kits`)
          .select(`*, kit:${kitTable}(*)`)
          .eq("student_id", studentId)
          .eq("status", "active")
          .order("assigned_at", { ascending: false }),
        "planning assignments",
      );
      for (const a of rows) {
        let items: PlanningAssignment["items"] = [];
        if (kind !== "workout") {
          const product = kind === "diet" ? "diet_foods" : "supplements";
          const rows = checked<any[]>(
            await db
              .from(`${kind}_kit_items`)
              .select(`*, product:${product}(*)`)
              .eq("kit_id", a.kit_id)
              .order("order_index"),
            "planning items",
          );
          items = rows
            .filter((i) => i.product)
            .map((i) => ({
              id: i.id,
              name: i.product.name_pt,
              quantity: Number(
                kind === "diet"
                  ? (i.quantity ?? i.product.serving_size)
                  : (i.dosage ?? i.product.serving_size),
              ),
              unit:
                (kind === "diet" ? i.unit : i.dosage_unit) ||
                i.product.serving_unit,
              slots:
                kind === "diet"
                  ? i.time_of_day
                    ? [i.time_of_day.slice(0, 5)]
                    : []
                  : i.times_of_day.map((s: string) => s.slice(0, 5)),
            }));
        }
        const exact = ruleRows.find(
          (r) =>
            r.kind === kind &&
            r.assignment_id === a.id &&
            r.effective_from === data.date,
        );
        let name = a.kit?.name_pt;
        if (!name && a.program_id)
          name = checked<any>(
            await db
              .from("workout_programs")
              .select("title_pt")
              .eq("id", a.program_id)
              .maybeSingle(),
            "planning program",
          )?.title_pt;
        assignments.push({
          id: a.id,
          kind,
          name: name || "Programa",
          start: a.start_date,
          end: a.end_date,
          notes: a.notes || "",
          rule: rules.get(`${kind}:${a.id}`) || defaultRule(kind),
          revision: exact?.revision || 0,
          items,
        });
      }
    }
    const history = (
      await readPages<any>(
        () =>
          db
            .from("student_prescription_history")
            .select("id, payload, archived_at")
            .eq("user_id", studentId)
            .eq("prescribed_date", data.date)
            .order("id", { ascending: false }),
        "prescription revisions",
      )
    ).data;
    return {
      data,
      assignments,
      history,
      ruleVersions: ruleRows.map((r) => ({
        kind: r.kind,
        assignmentId: r.assignment_id,
        date: r.effective_from,
        revision: r.revision,
      })),
    };
  }
}
