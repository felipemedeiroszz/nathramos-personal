import "server-only";
import { createServiceClientSSR } from "@/lib/supabase/server";
export async function processWorkoutCycleReminders(studentId?: string) {
  const db = await createServiceClientSSR();
  const result = await (db.rpc as any)(
    "workout_cycle_remind",
    studentId ? { p_student: studentId } : {},
  );
  if (result.error)
    throw new Error(
      "Não foi possível gerar os avisos de atualização do ciclo de treinos.",
    );
  return result.data as { created: number; cancelled: number; failed: number };
}
