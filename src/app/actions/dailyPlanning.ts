"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireManagedStudent } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { dateKeySchema, dailyRuleSchema } from "@/lib/student/schedule";
import { DailyPlanningService } from "@/services/DailyPlanningService";
import {
  checked,
  StudentRoutineService,
} from "@/services/StudentRoutineService";
const inputSchema = z.object({
  studentId: z.string().uuid(),
  kind: z.enum(["diet", "supplement", "workout"]),
  assignmentId: z.string().uuid(),
  effectiveFrom: dateKeySchema,
  revision: z.number().int().nonnegative(),
  rule: dailyRuleSchema,
});
export async function previewDailyPlanningAction(
  studentId: string,
  date: string,
) {
  try {
    z.string().uuid().parse(studentId);
    dateKeySchema.parse(date);
    await requireManagedStudent(studentId);
    return {
      success: true as const,
      planning: await DailyPlanningService.get(studentId, date),
    };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a programação.",
    };
  }
}
export async function saveDailyPlanningAction(
  input: z.input<typeof inputSchema>,
) {
  try {
    const data = inputSchema.parse(input);
    const actor = await requireManagedStudent(data.studentId);
    if (data.rule.on_date && data.rule.on_date < data.effectiveFrom)
      throw new Error(
        "A data específica deve ser igual ou posterior ao início da programação.",
      );
    if (
      data.kind === "workout" &&
      (data.rule.condition !== "all" ||
        data.rule.alternative_group ||
        Object.keys(data.rule.items).length)
    )
      throw new Error("Configuração de treino inválida.");
    const db: any = await createServiceClientSSR();
    const assignment = checked<any>(
      await db
        .from(`student_${data.kind}_kits`)
        .select("student_id,kit_id")
        .eq("id", data.assignmentId)
        .single(),
      "planning target",
    );
    if (assignment.student_id !== data.studentId)
      throw new Error("Vínculo de outro aluno.");
    if (data.kind !== "workout") {
      const items = checked<any[]>(
        await db
          .from(`${data.kind}_kit_items`)
          .select("id")
          .eq("kit_id", assignment.kit_id),
        "override targets",
      );
      if (
        Object.keys(data.rule.items).some(
          (id) => !items.some((i) => i.id === id),
        )
      )
        throw new Error("Item não pertence a este kit.");
    }
    // Capture today's original prescription before changing its rule.
    await StudentRoutineService.get(data.studentId);
    const result = await db.rpc("save_student_daily_rule", {
      p_actor: actor.userId,
      p_student: data.studentId,
      p_kind: data.kind,
      p_assignment: data.assignmentId,
      p_effective: data.effectiveFrom,
      p_rule: data.rule,
      p_revision: data.revision,
    });
    if (result.error?.code === "P0001") throw new Error(result.error.message);
    checked(result, "save daily rule");
    revalidatePath("/[locale]/admin/alunos/[id]", "page");
    revalidatePath("/[locale]/(student)", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof z.ZodError
          ? "Revise os dias, as quantidades e os horários (HH:MM)."
          : error instanceof Error
            ? error.message
            : "Não foi possível salvar a programação.",
    };
  }
}
