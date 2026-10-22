"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WorkoutService } from "@/services/WorkoutService";
import { WorkoutKitService } from "@/services/WorkoutKitService";
import { requireAuthenticated, requireRole } from "@/lib/auth/access";
import { createClientSSR } from "@/lib/supabase/server";
import type { ExerciseDbExercise } from "@/lib/exercisedb";
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

export async function saveWorkoutKitAction(input: Record<string, any>) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const saved = await WorkoutKitService.upsertKit(input as any, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar kit de treino." };
    }
    revalidatePath("/[locale]/admin/kits/treinos", "page");
    return { success: true as const, kit: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar kit de treino.",
    };
  }
}

export async function addWorkoutKitItemAction(input: {
  kit_id: string;
  category_label?: string | null;
  day_of_week?: number | null;
  program_id?: string | null;
  exercise_id?: string | null;
  api_exercise?: ExerciseDbExercise | null;
  order_index?: number;
}) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    let exerciseId = input.exercise_id ?? null;

    // Treino vindo do catálogo da API: garante o exercício no banco antes de vincular.
    if (!exerciseId && !input.program_id && input.api_exercise) {
      const { ExerciseDBService } = await import("@/services/ExerciseDBService");
      const exercise = await ExerciseDBService.ensureFromApiExercise(input.api_exercise);
      if (!exercise) {
        return { success: false as const, message: "Falha ao importar exercício da API." };
      }
      exerciseId = exercise.id;
    }

    const item = await WorkoutKitService.upsertKitItem({
      kit_id: input.kit_id,
      program_id: input.program_id ?? null,
      exercise_id: exerciseId,
      category_label: (input.category_label ?? null) as any,
      day_of_week: input.day_of_week ?? null,
      order_index: input.order_index ?? 0,
    });

    if (!item) {
      return { success: false as const, message: "Falha ao adicionar treino ao kit." };
    }

    revalidatePath("/[locale]/admin/kits/treinos", "page");
    return { success: true as const, item };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao adicionar treino ao kit.",
    };
  }
}

export async function removeWorkoutKitItemAction(itemId: string) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await WorkoutKitService.removeKitItem(itemId);
    if (!ok) {
      return { success: false as const, message: "Falha ao remover treino do kit." };
    }
    revalidatePath("/[locale]/admin/kits/treinos", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao remover treino do kit.",
    };
  }
}

export async function reorderWorkoutKitItemsAction(
  kitId: string,
  items: { id: string; order_index: number }[]
) {
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    const ok = await WorkoutKitService.reorderKitItems(kitId, items);
    if (!ok) {
      return { success: false as const, message: "Falha ao reordenar treinos do kit." };
    }
    revalidatePath("/[locale]/admin/kits/treinos", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao reordenar treinos do kit.",
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

// ---------------------------------------------------------------------------
// CATÁLOGO PRÓPRIO DE EXERCÍCIOS (admin)
// ---------------------------------------------------------------------------

const EXERCISE_ASSETS_BUCKET = "exercise-assets";
const EXERCISE_ASSET_MAX_BYTES = 20 * 1024 * 1024;
const EXERCISE_ASSET_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "mp4"];
const EXERCISE_ASSET_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
];

/**
 * Faz upload de GIF/imagem/vídeo de um exercício próprio para o bucket
 * `exercise-assets` e devolve a URL pública para ser gravada em `exercises`.
 */
export async function uploadExerciseAssetAction(formData: FormData) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false as const, message: "Selecione um arquivo para enviar." };
  }
  if (file.size > EXERCISE_ASSET_MAX_BYTES) {
    return { success: false as const, message: "O arquivo excede o limite de 20MB." };
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!EXERCISE_ASSET_EXTENSIONS.includes(ext) || !EXERCISE_ASSET_MIME_TYPES.includes(file.type)) {
    return {
      success: false as const,
      message: "Formato inválido. Use GIF, PNG, JPG, WEBP ou MP4.",
    };
  }

  try {
    const supabase = await createClientSSR();
    const key = `custom/${adminId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(EXERCISE_ASSETS_BUCKET).upload(key, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      return { success: false as const, message: error.message || "Falha ao enviar arquivo." };
    }

    const { data } = supabase.storage.from(EXERCISE_ASSETS_BUCKET).getPublicUrl(key);
    return { success: true as const, url: data?.publicUrl ?? null };
  } catch (e: any) {
    return { success: false as const, message: e?.message ?? "Falha ao enviar arquivo." };
  }
}

export async function saveExerciseAction(input: Record<string, any>) {
  const { userId: adminId } = await requireRole(["admin", "coach"], "/dashboard");
  try {
    const { ExerciseDBService } = await import("@/services/ExerciseDBService");
    const payload: Record<string, any> = { ...input };
    // Exercícios criados pela interface pertencem sempre ao catálogo próprio.
    if (!payload.id) payload.source = "custom";

    const saved = await ExerciseDBService.upsertExercise(payload as any, adminId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar exercício." };
    }
    revalidatePath("/[locale]/admin/treinos", "page");
    revalidatePath("/[locale]/admin/kits/treinos", "page");
    return { success: true as const, exercise: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar exercício.",
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
    revalidatePath("/[locale]/admin/treinos", "page");
    revalidatePath("/[locale]/admin/kits/treinos", "page");
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao excluir exercício.",
    };
  }
}
