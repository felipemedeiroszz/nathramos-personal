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
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    revalidatePath("/[locale]/admin/exercicios", "page");
    revalidatePath("/[locale]/admin/categorias", "page");
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
    revalidatePath("/[locale]/admin/exercicios", "page");
    return { success: true as const, count: 0 };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao sincronizar exercícios.",
    };
  }
}

export async function deleteExerciseAction(exerciseId: string) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
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
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    revalidatePath("/[locale]/admin/kits", "page");
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
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    revalidatePath("/[locale]/admin/programas", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao arquivar programa.",
    };
  }
}
