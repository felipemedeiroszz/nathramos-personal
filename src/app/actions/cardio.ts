"use server";
import { revalidatePath } from "next/cache";
import { requirePlatformUser } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
import {
  cardioActivitySchema,
  cardioLogSchema,
  cardioPlanSchema,
} from "@/lib/cardio";
import { CardioService } from "@/services/CardioService";
import { StudentAssignedContentService } from "@/services/StudentAssignedContentService";
import { AuditLogService } from "@/services/AuditLogService";
function refresh() {
  revalidatePath("/[locale]/(student)/treino", "page");
  revalidatePath("/[locale]/admin/cardios", "page");
}
export async function saveCardioActivityAction(input: unknown) {
  try {
    const actor = await requirePlatformUser();
    if (!actor.staff) throw new Error("Acesso negado.");
    const parsed = cardioActivitySchema.parse(input),
      db: any = await createServiceClientSSR();
    const { id, ...fields } = parsed;
    const result = id
      ? await db
          .from("cardio_activities")
          .update(fields)
          .eq("id", id)
          .select("id")
          .single()
      : await db
          .from("cardio_activities")
          .insert({ ...fields, created_by_id: actor.userId })
          .select("id")
          .single();
    if (result.error)
      throw new Error(
        "Não foi possível salvar a modalidade. Verifique a migração 000067.",
      );
    await AuditLogService.log({
      adminId: actor.userId,
      action: "cardio.activity.save",
      entity_type: "cardio_activities",
      entity_id: result.data.id,
    });
    refresh();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Falha ao salvar.",
    };
  }
}
export async function saveCardioPlanAction(input: unknown) {
  try {
    const actor = await requirePlatformUser(),
      parsed = cardioPlanSchema.parse(input),
      db: any = await createServiceClientSSR();
    if (
      !parsed.remove &&
      !(await CardioService.activities()).some(
        (a) => a.id === parsed.activity_id,
      )
    )
      throw new Error("Escolha uma modalidade ativa.");
    const result = parsed.remove
      ? await db
          .from("student_cardio_schedule")
          .delete()
          .eq("student_id", actor.userId)
          .eq("weekday", parsed.weekday)
      : await db
          .from("student_cardio_schedule")
          .upsert(
            {
              student_id: actor.userId,
              weekday: parsed.weekday,
              activity_id: parsed.activity_id,
              target_minutes: parsed.target_minutes,
            },
            { onConflict: "student_id,weekday" },
          );
    if (result.error)
      throw new Error("Não foi possível salvar o planejamento.");
    refresh();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Falha ao salvar.",
    };
  }
}
export async function saveCardioLogAction(input: unknown) {
  try {
    const actor = await requirePlatformUser(),
      parsed = cardioLogSchema.parse(input),
      db: any = await createServiceClientSSR();
    if (
      parsed.status === "done" &&
      !(await CardioService.activities()).some(
        (a) => a.id === parsed.activity_id,
      )
    )
      throw new Error("Escolha uma modalidade ativa.");
    const today = await StudentAssignedContentService.today(actor.userId);
    const result = await db
      .from("student_cardio_logs")
      .upsert(
        {
          student_id: actor.userId,
          performed_on: today,
          ...parsed,
          ...(parsed.status === "skipped"
            ? { activity_id: null, duration_min: null }
            : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,performed_on" },
      );
    if (result.error) throw new Error("Não foi possível registrar o cardio.");
    refresh();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Falha ao salvar.",
    };
  }
}
