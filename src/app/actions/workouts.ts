"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WorkoutService } from "@/services/WorkoutService";
import { WorkoutKitService } from "@/services/WorkoutKitService";
import { requireAuthenticated, requireRole } from "@/lib/auth/access";
import { logWorkoutSetSchema, assignStudentWorkoutSchema } from "@/schemas/workouts";

export async function startWorkoutSessionAction(params: {
  dayId?: string;
  programId?: string;
  scheduledDate?: string;
}) {
  const userId = await requireAuthenticated();
  const session = await WorkoutService.startSession(
    userId,
    params.dayId,
    params.programId,
    params.scheduledDate
  );
  if (!session) {
    return { success: false as const, message: "Falha ao iniciar sessão de treino." };
  }
  
  const { NotificationService } = await import("@/services/NotificationService");
  void NotificationService.sendInApp(userId, {
    type: "workout",
    title_pt: "Treino iniciado",
    title_en: "Workout started",
    body_pt: "Bom treino! Foco e determinação.",
    body_en: "Good workout! Focus and determination.",
    url: "/treino",
  });

  revalidatePath("/[locale]/(student)/treino", "page");
  return { success: true as const, sessionId: session.id };
}

export async function logWorkoutSetAction(input: {
  session_id: string;
  workout_exercise_id?: string | null;
  exercise_id: string;
  set_number: number;
  reps_done: number;
  weight_kg?: number | null;
  completed?: boolean;
  failure_at_end?: boolean;
}) {
  const userId = await requireAuthenticated();
  const parsed = logWorkoutSetSchema.parse(input);
  const log = await WorkoutService.logSet(userId, parsed);
  if (!log) {
    return { success: false as const, message: "Falha ao registrar série." };
  }
  revalidatePath("/[locale]/(student)/treino", "page");
  return { success: true as const, log };
}

export async function completeWorkoutSessionAction(params: {
  sessionId: string;
  feeling?: number;
  rpe?: number;
  notes?: string;
  duration_min?: number;
}) {
  const userId = await requireAuthenticated();
  const updated = await WorkoutService.completeSession(params.sessionId, {
    feeling: params.feeling,
    rpe: params.rpe,
    notes: params.notes,
    duration_min: params.duration_min,
  });
  if (!updated) {
    return { success: false as const, message: "Falha ao finalizar sessão." };
  }
  
  const { NotificationService } = await import("@/services/NotificationService");
  void NotificationService.sendInApp(userId, {
    type: "workout",
    title_pt: "Treino concluído!",
    title_en: "Workout completed!",
    body_pt: "Parabéns! Você completou seu treino de hoje.",
    body_en: "Congratulations! You completed today's workout.",
    url: "/dashboard",
  });

  revalidatePath("/[locale]/(student)/treino", "page");
  revalidatePath("/[locale]/(student)/progresso", "page");
  revalidatePath("/[locale]/(student)/dashboard", "page");
  return { success: true as const, session: updated };
}

export async function unassignWorkoutKitAction(swkId: string) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  const ok = await WorkoutKitService.unassign(swkId, adminId);
  if (!ok) {
    return { success: false as const, message: "Falha ao desatribuir treino." };
  }
  revalidatePath("/[locale]/admin/alunos/[id]", "page");
  return { success: true as const };
}

export async function assignWorkoutKitToStudentAction(input: {
  student_id: string;
  kit_id?: string | null;
  program_id?: string | null;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
}) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const parsed = assignStudentWorkoutSchema.parse(input);
    const assigned = await WorkoutKitService.assignToStudent(parsed, adminId);
    revalidatePath("/[locale]/admin/alunos/[id]", "page");
    return { success: true as const, assigned };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao atribuir treino.",
    };
  }
}

export async function deleteCategoryAction(categoryId: string) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const { WorkoutService } = await import("@/services/WorkoutService");
    const ok = await WorkoutService.deleteCategory(categoryId, adminId);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir categoria." };
    }
    revalidatePath("/[locale]/admin/exercicios", "page");
    revalidatePath("/[locale]/admin/categorias-treino", "page");
    revalidatePath("/[locale]/admin/treinos", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir categoria.",
    };
  }
}

export async function syncExercisesAction() {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const { ExerciseDBService } = await import("@/services/ExerciseDBService");
    const result = await ExerciseDBService.syncFromExternal();
    revalidatePath("/[locale]/admin/exercicios", "page");
    return {
      success: true as const,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      error: result.error,
    };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao sincronizar exercícios.",
    };
  }
}

export async function deleteExerciseAction(exerciseId: string) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const { ExerciseDBService } = await import("@/services/ExerciseDBService");
    const ok = await ExerciseDBService.deleteExercise(exerciseId, adminId);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir exercício." };
    }
    revalidatePath("/[locale]/admin/exercicios", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir exercício.",
    };
  }
}

export async function deleteKitAction(kitId: string) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const { WorkoutKitService } = await import("@/services/WorkoutKitService");
    const ok = await WorkoutKitService.deleteKit(kitId, adminId);
    if (!ok) {
      return { success: false as const, message: "Falha ao excluir kit." };
    }
    revalidatePath("/[locale]/admin/kits", "page");
    revalidatePath("/[locale]/admin/kits/treinos", "page");
    revalidatePath("/[locale]/admin/treinos", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir kit.",
    };
  }
}

export async function deleteProgramAction(programId: string) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const { WorkoutService } = await import("@/services/WorkoutService");
    const ok = await WorkoutService.deleteProgram(programId, adminId);
    if (!ok) {
      return { success: false as const, message: "Falha ao arquivar programa." };
    }
    revalidatePath("/[locale]/admin/treinos", "page");
    revalidatePath("/[locale]/admin/kits/treinos", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao arquivar programa.",
    };
  }
}

export async function upsertStudentOverrideAction(input: {
  student_id: string;
  assignment_id?: string | null;
  workout_exercise_id: string;
  sets?: number | null;
  reps?: string | null;
  weight_kg?: number | null;
  rest_seconds?: number | null;
  tempo?: string | null;
  notes_pt?: string | null;
  notes_en?: string | null;
  is_active?: boolean;
  id?: string;
}) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const { WorkoutService } = await import("@/services/WorkoutService");
    const result = await WorkoutService.upsertStudentOverride(
      { ...input, is_active: input.is_active ?? true },
      adminId
    );
    if (!result) {
      return { success: false as const, message: "Falha ao salvar personalização do treino." };
    }
    revalidatePath("/[locale]/admin/alunos/[id]", "page");
    revalidatePath("/[locale]/(student)/treino", "page");
    return { success: true as const, override: result };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar personalização do treino.",
    };
  }
}

export async function deleteStudentOverrideAction(overrideId: string) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const { WorkoutService } = await import("@/services/WorkoutService");
    const ok = await WorkoutService.deleteStudentOverride(overrideId, adminId);
    if (!ok) {
      return { success: false as const, message: "Falha ao remover personalização." };
    }
    revalidatePath("/[locale]/admin/alunos/[id]", "page");
    revalidatePath("/[locale]/(student)/treino", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao remover personalização.",
    };
  }
}
