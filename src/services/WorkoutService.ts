import { requirePlatformUser, staffStudentIds } from "@/lib/auth/platform";
import { getZonedParts } from "@/lib/notifications/time";
import { checked } from "./StudentRoutineService";
import { workoutWeek, selectWorkoutDays } from "@/lib/student/routine";
import { createServiceClientSSR } from "../lib/supabase/server";
import type {
  MuscleGroupT,
  EquipmentT,
  DifficultyT,
  WorkoutStatusT,
  ExerciseSourceT,
} from "../lib/supabase/types";
import type {
  WorkoutCategoryRow,
  WorkoutProgramRow,
  WorkoutDayRow,
  WorkoutExerciseRow,
  WorkoutSessionRow,
  ExerciseSetLogRow,
  ExerciseRow,
  StudentWorkoutOverrideRow,
} from "../types";
import { AuditLogService } from "./AuditLogService";
import {
  upsertWorkoutCategorySchema,
  upsertWorkoutProgramSchema,
  upsertWorkoutDaySchema,
  upsertWorkoutExerciseSchema,
  logWorkoutSetSchema,
  upsertStudentWorkoutOverrideSchema,
  type UpsertWorkoutCategoryInput,
  type UpsertWorkoutProgramInput,
  type UpsertWorkoutDayInput,
  type UpsertWorkoutExerciseInput,
  type LogWorkoutSetInput,
  type UpsertStudentWorkoutOverrideInput,
} from "../schemas/workouts";

function toDateOnly(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayDateOnly(): string {
  return toDateOnly(new Date());
}

function dayOfWeekToday(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

export class WorkoutService {
  private static async getSupabase() {
    return createServiceClientSSR();
  }

  // ---------------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------------
  static async listCategories(
    onlyActive: boolean = false,
  ): Promise<WorkoutCategoryRow[]> {
    try {
      const supabase = await this.getSupabase();
      let q: any = supabase
        .from("workout_categories")
        .select("*")
        .order("order_index", { ascending: true })
        .order("name_pt", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) return [];
      return (data as WorkoutCategoryRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async upsertCategory(
    input: UpsertWorkoutCategoryInput,
    createdById?: string,
  ): Promise<WorkoutCategoryRow | null> {
    try {
      const parsed = upsertWorkoutCategorySchema.parse(input);
      const supabase = await this.getSupabase();
      const payload: Record<string, any> = { ...parsed };
      if (!parsed.id && createdById) payload.created_by_id = createdById;
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("workout_categories")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("workout_categories").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;

      void AuditLogService.log({
        adminId: createdById,
        action: parsed.id
          ? "workout_category.update"
          : "workout_category.create",
        entity_type: "workout_categories",
        entity_id: data.id,
        details: { name_pt: parsed.name_pt, slug: parsed.slug },
      });

      return data as WorkoutCategoryRow;
    } catch {
      return null;
    }
  }

  static async deleteCategory(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("workout_categories")
        .update({ is_active: false } as never)
        .eq("id", id);
      if (error) return false;
      void AuditLogService.log({
        adminId,
        action: "workout_category.delete",
        entity_type: "workout_categories",
        entity_id: id,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // PROGRAMS
  // ---------------------------------------------------------------------
  static async listPrograms(filters?: {
    owner_id?: string;
    status?: WorkoutStatusT;
    is_template?: boolean;
    category_id?: string;
    search?: string;
    limit?: number;
  }): Promise<WorkoutProgramRow[]> {
    try {
      const supabase = await this.getSupabase();
      const limit = filters?.limit ?? 100;
      let q: any = supabase
        .from("workout_programs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      const actor = await requirePlatformUser();
      if (actor.role === "coach") {
        const ids = [actor.userId, ...((await staffStudentIds()) || [])];
        q = q.or(`is_template.eq.true,owner_id.in.(${ids.join(",")})`);
      }
      if (filters?.owner_id) q = q.eq("owner_id", filters.owner_id);
      if (filters?.status) q = q.eq("status", filters.status);
      if (typeof filters?.is_template !== "undefined")
        q = q.eq("is_template", filters.is_template);
      if (filters?.category_id) q = q.eq("category_id", filters.category_id);
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`title_pt.ilike.${s},title_en.ilike.${s}`);
      }

      const { data, error } = await q;
      if (error) return [];
      return (data as WorkoutProgramRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async getProgram(id: string): Promise<WorkoutProgramRow | null> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("workout_programs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) return null;
      return (data as WorkoutProgramRow | null) ?? null;
    } catch {
      return null;
    }
  }

  static async upsertProgram(
    input: UpsertWorkoutProgramInput,
    ownerId: string,
    adminId?: string,
  ): Promise<WorkoutProgramRow | null> {
    try {
      const parsed = upsertWorkoutProgramSchema.parse(input);
      const supabase = await this.getSupabase();

      const payload: Record<string, any> = { ...parsed };
      if (!parsed.id) payload.owner_id = ownerId;
      else payload.owner_id = ownerId;
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("workout_programs")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("workout_programs").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;

      void AuditLogService.log({
        adminId: adminId ?? ownerId,
        action: "workout.upsert",
        entity_type: "workout_program",
        entity_id: data.id,
        details: { title_pt: parsed.title_pt, title_en: parsed.title_en },
      });

      return data as WorkoutProgramRow;
    } catch {
      return null;
    }
  }

  static async deleteProgram(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("workout_programs")
        .update({ status: "archived" } as never)
        .eq("id", id);
      if (error) return false;
      void AuditLogService.log({
        adminId,
        action: "workout.delete",
        entity_type: "workout_program",
        entity_id: id,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // DAYS
  // ---------------------------------------------------------------------
  static async listProgramDays(programId: string): Promise<WorkoutDayRow[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("workout_days")
        .select("*")
        .eq("program_id", programId)
        .order("week_number", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) return [];
      return (data as WorkoutDayRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async upsertDay(
    input: UpsertWorkoutDayInput,
  ): Promise<WorkoutDayRow | null> {
    try {
      const parsed = upsertWorkoutDaySchema.parse(input);
      const supabase = await this.getSupabase();
      const payload: Record<string, any> = { ...parsed };
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("workout_days")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("workout_days").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;
      return data as WorkoutDayRow;
    } catch {
      return null;
    }
  }

  static async reorderDays(
    programId: string,
    items: { id: string; order_index: number }[],
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      for (const it of items) {
        await supabase
          .from("workout_days")
          .update({ order_index: it.order_index } as never)
          .eq("id", it.id)
          .eq("program_id", programId);
      }
      return true;
    } catch {
      return false;
    }
  }

  static async deleteDay(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("workout_days")
        .delete()
        .eq("id", id);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // EXERCISES IN DAY
  // ---------------------------------------------------------------------
  static async listDayExercises(
    dayId: string,
  ): Promise<Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("*, exercise:exercises(*)")
        .eq("day_id", dayId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (
        (data as Array<
          WorkoutExerciseRow & { exercise?: ExerciseRow | null }
        >) ?? []
      );
    } catch (error) {
      console.error("[WorkoutService] listDayExercises", error);
      throw new Error("Não foi possível carregar os dados de treino.");
    }
  }

  static async upsertWorkoutExercise(
    input: UpsertWorkoutExerciseInput,
  ): Promise<WorkoutExerciseRow | null> {
    try {
      const parsed = upsertWorkoutExerciseSchema.parse(input);
      const supabase = await this.getSupabase();
      const payload: Record<string, any> = { ...parsed };
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("workout_exercises")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("workout_exercises").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;
      return data as WorkoutExerciseRow;
    } catch {
      return null;
    }
  }

  static async reorderExercises(
    dayId: string,
    items: { id: string; order_index: number }[],
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      for (const it of items) {
        await supabase
          .from("workout_exercises")
          .update({ order_index: it.order_index } as never)
          .eq("id", it.id)
          .eq("day_id", dayId);
      }
      return true;
    } catch {
      return false;
    }
  }

  static async removeWorkoutExercise(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("id", id);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // SESSIONS
  // ---------------------------------------------------------------------
  private static async localToday(userId: string) {
    const db = await this.getSupabase();
    const result = await db
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .single();
    const profile = checked(result, "workout timezone") as { timezone: string };
    return getZonedParts(new Date(), profile.timezone);
  }
  static async startSession(
    userId: string,
    dayId?: string,
    programId?: string,
    scheduledDate?: string,
  ): Promise<WorkoutSessionRow | null> {
    const today = (await this.localToday(userId)).dateKey;
    if (scheduledDate && scheduledDate !== today) return null;
    const plans = await this.getTodayPlans(userId);
    if (!plans.some((p) => p.day.id === dayId && p.program.id === programId))
      return null;
    const db = await this.getSupabase();
    const result = await (db.rpc as any)("start_student_workout", {
      p_user_id: userId,
      p_day_id: dayId,
      p_program_id: programId,
      p_date: today,
    });
    const rows = checked<WorkoutSessionRow[]>(result, "start session");
    return rows[0] || null;
  }
  static async completeSession(
    userId: string,
    sessionId: string,
    params?: {
      feeling?: number;
      rpe?: number;
      notes?: string;
      duration_min?: number;
      calories?: number;
    },
  ): Promise<WorkoutSessionRow | null> {
    const db = await this.getSupabase();
    const rows = checked<WorkoutSessionRow[]>(
      await (db.rpc as any)("complete_student_workout", {
        p_user_id: userId,
        p_session_id: sessionId,
        p_input: params || {},
      }),
      "complete session",
    );
    return rows[0] || null;
  }
  static async logSet(
    userId: string,
    input: LogWorkoutSetInput,
  ): Promise<ExerciseSetLogRow | null> {
    const parsed = logWorkoutSetSchema.parse(input);
    const db = await this.getSupabase();
    const rows = checked<ExerciseSetLogRow[]>(
      await (db.rpc as any)("log_student_workout_set", {
        p_user_id: userId,
        p_input: parsed,
      }),
      "log set",
    );
    return rows[0] || null;
  }
  static async sessionLogs(
    userId: string,
    sessionId: string,
  ): Promise<ExerciseSetLogRow[]> {
    const db = await this.getSupabase();
    const session = checked(
      await db
        .from("workout_sessions")
        .select("user_id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle(),
      "session owner",
    );
    if (!session) return [];
    return (
      checked<ExerciseSetLogRow[]>(
        await db
          .from("exercise_sets_log")
          .select("*")
          .eq("session_id", sessionId)
          .order("id"),
        "session logs",
      ) || []
    );
  }
  static async getTodaysSession(
    userId: string,
    dayId?: string,
  ): Promise<WorkoutSessionRow | null> {
    const db = await this.getSupabase();
    const today = (await this.localToday(userId)).dateKey;
    let query: any = db
      .from("workout_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("scheduled_date", today)
      .order("started_at", { ascending: false })
      .limit(1);
    if (dayId) query = query.eq("day_id", dayId);
    return checked<WorkoutSessionRow | null>(
      await query.maybeSingle(),
      "today session",
    );
  }
  static async getTodayPlans(
    userId: string,
  ): Promise<
    Array<{
      assignment: any;
      kit: any;
      program: WorkoutProgramRow;
      day: WorkoutDayRow;
      sessionCompletedToday: boolean;
      isRestDay: boolean;
      nextDayLabel: string | null;
    }>
  > {
    const db: any = await this.getSupabase();
    const local = await this.localToday(userId);
    const assignments = checked<any[]>(
      await db
        .from("student_workout_kits")
        .select("*, kit:workout_kits(*)")
        .eq("student_id", userId)
        .eq("status", "active")
        .lte("start_date", local.dateKey)
        .or(`end_date.is.null,end_date.gte.${local.dateKey}`)
        .order("assigned_at", { ascending: false }),
      "workout assignments",
    );
    const kitIds = assignments
      .filter((a) => a.kit && !a.kit.is_deleted)
      .map((a) => a.kit_id);
    const items = kitIds.length
      ? checked<any[]>(
          await db
            .from("workout_kit_items")
            .select("*")
            .in("kit_id", kitIds)
            .order("order_index"),
          "workout kit items",
        )
      : [];
    const programIds = Array.from(
      new Set(
        assignments
          .flatMap((a) => [
            a.program_id,
            a.kit?.generated_program_id,
            ...items
              .filter((i) => i.kit_id === a.kit_id)
              .map((i) => i.program_id),
          ])
          .filter(Boolean),
      ),
    );
    if (!programIds.length) return [];
    const [programResult, dayResult, sessionResult] = await Promise.all([
      db
        .from("workout_programs")
        .select("*")
        .in("id", programIds)
        .eq("status", "active"),
      db
        .from("workout_days")
        .select("*")
        .in("program_id", programIds)
        .order("order_index"),
      db
        .from("workout_sessions")
        .select("day_id, completed_at")
        .eq("user_id", userId)
        .eq("scheduled_date", local.dateKey),
    ]);
    const programs = checked<WorkoutProgramRow[]>(
      programResult,
      "workout programs",
    );
    const days = checked<WorkoutDayRow[]>(dayResult, "workout days");
    const sessions = checked<any[]>(sessionResult, "workout sessions");
    const plans: Awaited<ReturnType<typeof WorkoutService.getTodayPlans>> = [];
    const seen = new Set<string>();
    for (const assignment of assignments) {
      if (assignment.kit_id && (!assignment.kit || assignment.kit.is_deleted))
        continue;
      const eligible = new Set([
        assignment.program_id,
        assignment.kit?.generated_program_id,
        ...items
          .filter(
            (i) =>
              i.kit_id === assignment.kit_id &&
              (!i.day_of_week || i.day_of_week === local.weekday),
          )
          .map((i) => i.program_id),
      ]);
      for (const program of programs.filter((p) => eligible.has(p.id))) {
        const week = workoutWeek(
          assignment.start_date,
          local.dateKey,
          program.total_weeks,
        );
        const selected = selectWorkoutDays(
          days.filter((d) => d.program_id === program.id),
          week,
          local.weekday,
        );
        for (const day of selected) {
          if (seen.has(day.id)) continue;
          seen.add(day.id);
          plans.push({
            assignment,
            kit: assignment.kit,
            program,
            day,
            sessionCompletedToday: sessions.some(
              (s) => s.day_id === day.id && s.completed_at,
            ),
            isRestDay: false,
            nextDayLabel: null,
          });
        }
      }
    }
    return plans;
  }
  static async getTodaysProgram(userId: string) {
    const plans = await this.getTodayPlans(userId);
    return plans.find((p) => !p.sessionCompletedToday) || plans[0] || null;
  }
  static async userHistory(
    userId: string,
    limit: number = 30,
  ): Promise<WorkoutSessionRow[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as WorkoutSessionRow[]) ?? [];
    } catch (error) {
      console.error("[WorkoutService] userHistory", error);
      throw new Error("Não foi possível carregar os dados de treino.");
    }
  }

  // ---------------------------------------------------------------------
  // STUDENT WORKOUT OVERRIDES (Personalização por aluno — Seção 19)
  // ---------------------------------------------------------------------
  static async listStudentOverrides(
    studentId: string,
    filters?: {
      assignment_id?: string;
      workout_exercise_id?: string;
      only_active?: boolean;
    },
  ): Promise<StudentWorkoutOverrideRow[]> {
    try {
      const supabase = await this.getSupabase();
      let q: any = supabase
        .from("student_workout_overrides")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (filters?.assignment_id)
        q = q.eq("assignment_id", filters.assignment_id);
      if (filters?.workout_exercise_id)
        q = q.eq("workout_exercise_id", filters.workout_exercise_id);
      if (filters?.only_active) q = q.eq("is_active", true);

      const { data, error } = await q;
      if (error) return [];
      return (data as StudentWorkoutOverrideRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async upsertStudentOverride(
    input: UpsertStudentWorkoutOverrideInput,
    adminId?: string,
  ): Promise<StudentWorkoutOverrideRow | null> {
    try {
      const parsed = upsertStudentWorkoutOverrideSchema.parse(input);
      const supabase = await this.getSupabase();

      const payload: Record<string, any> = { ...parsed };
      if (!parsed.id && adminId) payload.created_by_id = adminId;
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("student_workout_overrides")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        // Se já existe override ativo para o mesmo aluno + exercício, desativa antes
        const existingQ = await supabase
          .from("student_workout_overrides")
          .select("id")
          .eq("student_id", parsed.student_id)
          .eq("workout_exercise_id", parsed.workout_exercise_id)
          .eq("is_active", true)
          .maybeSingle();

        if (existingQ.data) {
          await supabase
            .from("student_workout_overrides")
            .update({ is_active: false } as never)
            .eq("id", (existingQ.data as any).id);
        }
        q = supabase.from("student_workout_overrides").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;

      void AuditLogService.log({
        adminId,
        action: parsed.id
          ? "student_workout_override.update"
          : "student_workout_override.create",
        entity_type: "student_workout_overrides",
        entity_id: data.id,
        details: {
          student_id: parsed.student_id,
          workout_exercise_id: parsed.workout_exercise_id,
        },
      });

      return data as StudentWorkoutOverrideRow;
    } catch {
      return null;
    }
  }

  static async deleteStudentOverride(
    id: string,
    adminId?: string,
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("student_workout_overrides")
        .update({ is_active: false } as never)
        .eq("id", id);
      if (error) return false;
      void AuditLogService.log({
        adminId,
        action: "student_workout_override.delete",
        entity_type: "student_workout_overrides",
        entity_id: id,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Aplica overrides do aluno a uma lista de workout_exercises.
   * Retorna uma cópia com os campos sobrescritos onde houver override ativo.
   */
  static async applyStudentOverrides(
    studentId: string,
    exercises: Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>,
  ): Promise<Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>> {
    if (exercises.length === 0) return exercises;
    try {
      const overrides = await this.listStudentOverrides(studentId, {
        only_active: true,
      });
      if (overrides.length === 0) return exercises;

      const overrideMap = new Map<string, StudentWorkoutOverrideRow>();
      for (const ov of overrides) {
        overrideMap.set(ov.workout_exercise_id, ov);
      }

      return exercises.map((wex) => {
        const ov = overrideMap.get(wex.id);
        if (!ov) return wex;
        return {
          ...wex,
          sets: ov.sets ?? wex.sets,
          reps: ov.reps ?? wex.reps,
          weight_kg: ov.weight_kg ?? wex.weight_kg,
          rest_seconds: ov.rest_seconds ?? wex.rest_seconds,
          tempo: ov.tempo ?? wex.tempo,
          notes_pt: ov.notes_pt ?? wex.notes_pt,
          notes_en: ov.notes_en ?? wex.notes_en,
        };
      });
    } catch {
      return exercises;
    }
  }
}
