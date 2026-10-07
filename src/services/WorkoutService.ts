import { createServiceClientSSR } from "../lib/supabase/server"
import type {
  MuscleGroupT,
  EquipmentT,
  DifficultyT,
  WorkoutStatusT,
  ExerciseSourceT,
} from "../lib/supabase/types"
import type {
  WorkoutCategoryRow,
  WorkoutProgramRow,
  WorkoutDayRow,
  WorkoutExerciseRow,
  WorkoutSessionRow,
  ExerciseSetLogRow,
  ExerciseRow,
} from "../types"
import { AuditLogService } from "./AuditLogService"
import {
  upsertWorkoutCategorySchema,
  upsertWorkoutProgramSchema,
  upsertWorkoutDaySchema,
  upsertWorkoutExerciseSchema,
  logWorkoutSetSchema,
  type UpsertWorkoutCategoryInput,
  type UpsertWorkoutProgramInput,
  type UpsertWorkoutDayInput,
  type UpsertWorkoutExerciseInput,
  type LogWorkoutSetInput,
} from "../schemas/workouts"

function toDateOnly(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, "0")
  const day = String(dt.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function todayDateOnly(): string {
  return toDateOnly(new Date())
}

function dayOfWeekToday(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

export class WorkoutService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  // ---------------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------------
  static async listCategories(onlyActive: boolean = false): Promise<WorkoutCategoryRow[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("workout_categories")
        .select("*")
        .order("order_index", { ascending: true })
        .order("name_pt", { ascending: true })
      if (onlyActive) q = q.eq("is_active", true)
      const { data, error } = await q
      if (error) return []
      return (data as WorkoutCategoryRow[]) ?? []
    } catch {
      return []
    }
  }

  static async upsertCategory(
    input: UpsertWorkoutCategoryInput,
    createdById?: string
  ): Promise<WorkoutCategoryRow | null> {
    try {
      const parsed = upsertWorkoutCategorySchema.parse(input)
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...parsed }
      if (!parsed.id && createdById) payload.created_by_id = createdById
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase
          .from("workout_categories")
          .update(payload as never)
          .eq("id", parsed.id)
      } else {
        q = supabase.from("workout_categories").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId: createdById,
        action: parsed.id ? "workout_category.update" : "workout_category.create",
        entity_type: "workout_categories",
        entity_id: data.id,
        details: { name_pt: parsed.name_pt, slug: parsed.slug },
      })

      return data as WorkoutCategoryRow
    } catch {
      return null
    }
  }

  static async deleteCategory(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("workout_categories")
        .update({ is_active: false } as never)
        .eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "workout_category.delete",
        entity_type: "workout_categories",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // PROGRAMS
  // ---------------------------------------------------------------------
  static async listPrograms(filters?: {
    owner_id?: string
    status?: WorkoutStatusT
    is_template?: boolean
    category_id?: string
    search?: string
    limit?: number
  }): Promise<WorkoutProgramRow[]> {
    try {
      const supabase = await this.getSupabase()
      const limit = filters?.limit ?? 100
      let q: any = supabase
        .from("workout_programs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)

      if (filters?.owner_id) q = q.eq("owner_id", filters.owner_id)
      if (filters?.status) q = q.eq("status", filters.status)
      if (typeof filters?.is_template !== "undefined") q = q.eq("is_template", filters.is_template)
      if (filters?.category_id) q = q.eq("category_id", filters.category_id)
      if (filters?.search) {
        const s = `%${filters.search}%`
        q = q.or(`title_pt.ilike.${s},title_en.ilike.${s}`)
      }

      const { data, error } = await q
      if (error) return []
      return (data as WorkoutProgramRow[]) ?? []
    } catch {
      return []
    }
  }

  static async getProgram(id: string): Promise<WorkoutProgramRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("workout_programs")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (error) return null
      return (data as WorkoutProgramRow | null) ?? null
    } catch {
      return null
    }
  }

  static async upsertProgram(
    input: UpsertWorkoutProgramInput,
    ownerId: string,
    adminId?: string
  ): Promise<WorkoutProgramRow | null> {
    try {
      const parsed = upsertWorkoutProgramSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, any> = { ...parsed }
      if (!parsed.id) payload.owner_id = ownerId
      else payload.owner_id = ownerId
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase
          .from("workout_programs")
          .update(payload as never)
          .eq("id", parsed.id)
      } else {
        q = supabase.from("workout_programs").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId: adminId ?? ownerId,
        action: "workout.upsert",
        entity_type: "workout_program",
        entity_id: data.id,
        details: { title_pt: parsed.title_pt, title_en: parsed.title_en },
      })

      return data as WorkoutProgramRow
    } catch {
      return null
    }
  }

  static async deleteProgram(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("workout_programs")
        .update({ status: "archived" } as never)
        .eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "workout.delete",
        entity_type: "workout_program",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // DAYS
  // ---------------------------------------------------------------------
  static async listProgramDays(programId: string): Promise<WorkoutDayRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("workout_days")
        .select("*")
        .eq("program_id", programId)
        .order("week_number", { ascending: true })
        .order("order_index", { ascending: true })
      if (error) return []
      return (data as WorkoutDayRow[]) ?? []
    } catch {
      return []
    }
  }

  static async upsertDay(input: UpsertWorkoutDayInput): Promise<WorkoutDayRow | null> {
    try {
      const parsed = upsertWorkoutDaySchema.parse(input)
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...parsed }
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase.from("workout_days").update(payload as never).eq("id", parsed.id)
      } else {
        q = supabase.from("workout_days").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null
      return data as WorkoutDayRow
    } catch {
      return null
    }
  }

  static async reorderDays(programId: string, items: { id: string; order_index: number }[]): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      for (const it of items) {
        await supabase
          .from("workout_days")
          .update({ order_index: it.order_index } as never)
          .eq("id", it.id)
          .eq("program_id", programId)
      }
      return true
    } catch {
      return false
    }
  }

  static async deleteDay(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("workout_days").delete().eq("id", id)
      if (error) return false
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // EXERCISES IN DAY
  // ---------------------------------------------------------------------
  static async listDayExercises(dayId: string): Promise<Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("*, exercise:exercises(*)")
        .eq("day_id", dayId)
        .order("order_index", { ascending: true })
      if (error) return []
      return (data as Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>) ?? []
    } catch {
      return []
    }
  }

  static async upsertWorkoutExercise(input: UpsertWorkoutExerciseInput): Promise<WorkoutExerciseRow | null> {
    try {
      const parsed = upsertWorkoutExerciseSchema.parse(input)
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...parsed }
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase.from("workout_exercises").update(payload as never).eq("id", parsed.id)
      } else {
        q = supabase.from("workout_exercises").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null
      return data as WorkoutExerciseRow
    } catch {
      return null
    }
  }

  static async reorderExercises(dayId: string, items: { id: string; order_index: number }[]): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      for (const it of items) {
        await supabase
          .from("workout_exercises")
          .update({ order_index: it.order_index } as never)
          .eq("id", it.id)
          .eq("day_id", dayId)
      }
      return true
    } catch {
      return false
    }
  }

  static async removeWorkoutExercise(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("workout_exercises").delete().eq("id", id)
      if (error) return false
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // SESSIONS
  // ---------------------------------------------------------------------
  static async startSession(
    userId: string,
    dayId?: string,
    programId?: string,
    scheduledDate?: string
  ): Promise<WorkoutSessionRow | null> {
    try {
      const supabase = await this.getSupabase()
      const now = new Date().toISOString()
      const sd = scheduledDate ?? todayDateOnly()

      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: userId,
          program_id: programId ?? null,
          day_id: dayId ?? null,
          scheduled_date: sd,
          started_at: now,
          is_paused: false,
        } as never)
        .select()
        .single()

      if (error || !data) return null
      return data as WorkoutSessionRow
    } catch {
      return null
    }
  }

  static async completeSession(
    sessionId: string,
    params?: {
      feeling?: number
      rpe?: number
      notes?: string
      duration_min?: number
      calories?: number
    }
  ): Promise<WorkoutSessionRow | null> {
    try {
      const supabase = await this.getSupabase()
      const now = new Date().toISOString()

      const updatePayload: Record<string, any> = {
        completed_at: now,
        is_paused: false,
      }
      if (typeof params?.feeling === "number") updatePayload.feeling_scale = params.feeling
      if (typeof params?.rpe === "number") updatePayload.rpe_avg = params.rpe
      if (typeof params?.notes === "string") updatePayload.notes = params.notes
      if (typeof params?.duration_min === "number") updatePayload.duration_min = params.duration_min
      if (typeof params?.calories === "number") updatePayload.calories_burned = params.calories

      const { data, error } = await supabase
        .from("workout_sessions")
        .update(updatePayload as never)
        .eq("id", sessionId)
        .select()
        .single()

      if (error || !data) return null
      return data as WorkoutSessionRow
    } catch {
      return null
    }
  }

  static async logSet(userId: string, input: LogWorkoutSetInput): Promise<ExerciseSetLogRow | null> {
    try {
      const parsed = logWorkoutSetSchema.parse(input)
      const supabase = await this.getSupabase()

      const { data: sessionData, error: sessionErr } = await supabase
        .from("workout_sessions")
        .select("id, user_id")
        .eq("id", parsed.session_id)
        .maybeSingle()

      if (sessionErr || !sessionData) return null
      if ((sessionData as any).user_id !== userId) return null

      const payload: Record<string, any> = {
        session_id: parsed.session_id,
        workout_exercise_id: parsed.workout_exercise_id ?? null,
        exercise_id: parsed.exercise_id,
        set_number: parsed.set_number,
        reps_done: parsed.reps_done,
        weight_kg: parsed.weight_kg ?? null,
        rpe: parsed.rpe ?? null,
        duration_sec: parsed.duration_sec ?? null,
        distance_km: parsed.distance_km ?? null,
        completed: parsed.completed,
        failure_at_end: parsed.failure_at_end,
        logged_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from("exercise_sets_log")
        .insert(payload as never)
        .select()
        .single()

      if (error || !data) return null
      return data as ExerciseSetLogRow
    } catch {
      return null
    }
  }

  static async getTodaysSession(userId: string): Promise<WorkoutSessionRow | null> {
    try {
      const supabase = await this.getSupabase()
      const today = todayDateOnly()
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("scheduled_date", today)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) return null
      return (data as WorkoutSessionRow | null) ?? null
    } catch {
      return null
    }
  }

  static async getTodaysProgram(userId: string): Promise<{
    assignment: any
    kit: any
    program: WorkoutProgramRow | null
    day: WorkoutDayRow | null
  } | null> {
    try {
      const supabase = await this.getSupabase()
      const today = todayDateOnly()
      const dow = dayOfWeekToday()

      const assignQ = await supabase
        .from("student_workout_kits")
        .select(`
          *,
          kit:workout_kits(*),
          program:workout_programs(*)
        `)
        .eq("student_id", userId)
        .eq("status", "active")
        .lte("start_date", today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (assignQ.error || !assignQ.data) return null

      const assignment: any = assignQ.data
      const kit: any = (assignment as any).kit ?? null
      const program: WorkoutProgramRow | null = (assignment as any).program ?? null

      let effectiveProgram = program
      if (!effectiveProgram && kit) {
        const kitItemQ = await supabase
          .from("workout_kit_items")
          .select(`*, program:workout_programs(*)`)
          .eq("kit_id", kit.id)
          .order("order_index", { ascending: true })
          .limit(1)
          .maybeSingle()
        if (!kitItemQ.error && kitItemQ.data) {
          effectiveProgram = (kitItemQ.data as any).program ?? null
        }
      }

      if (!effectiveProgram) {
        return { assignment, kit, program: null, day: null }
      }

      const dayQ = await supabase
        .from("workout_days")
        .select("*")
        .eq("program_id", effectiveProgram.id)
        .eq("day_of_week", dow)
        .order("week_number", { ascending: true })
        .limit(1)
        .maybeSingle()

      const day: WorkoutDayRow | null = !dayQ.error && dayQ.data ? (dayQ.data as WorkoutDayRow) : null

      return { assignment, kit, program: effectiveProgram, day }
    } catch {
      return null
    }
  }

  static async userHistory(userId: string, limit: number = 30): Promise<WorkoutSessionRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(limit)
      if (error) return []
      return (data as WorkoutSessionRow[]) ?? []
    } catch {
      return []
    }
  }
}
