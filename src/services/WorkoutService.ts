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
  StudentWorkoutOverrideRow,
} from "../types"
import { AuditLogService } from "./AuditLogService"
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

      // Calcular volume total: soma de (weight_kg * reps_done) de todas as séries
      let totalVolumeKg: number | null = null
      try {
        const { data: setsData } = await supabase
          .from("exercise_sets_log")
          .select("weight_kg, reps_done, completed")
          .eq("session_id", sessionId)

        if (setsData && setsData.length > 0) {
          const sum = setsData.reduce((acc: number, row: any) => {
            const w = Number(row.weight_kg ?? 0)
            const r = Number(row.reps_done ?? 0)
            if (w > 0 && r > 0) return acc + w * r
            return acc
          }, 0)
          if (sum > 0) totalVolumeKg = Math.round(sum * 100) / 100
        }
      } catch {
        totalVolumeKg = null
      }

      const updatePayload: Record<string, any> = {
        completed_at: now,
        is_paused: false,
      }
      if (totalVolumeKg != null) updatePayload.total_volume_kg = totalVolumeKg
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
    sessionCompletedToday: boolean
    isRestDay: boolean
    nextDayLabel: string | null
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
        return {
          assignment,
          kit,
          program: null,
          day: null,
          sessionCompletedToday: false,
          isRestDay: true,
          nextDayLabel: null,
        }
      }

      // Buscar todos os dias do programa ordenados por order_index
      const allDaysQ = await supabase
        .from("workout_days")
        .select("*")
        .eq("program_id", effectiveProgram.id)
        .order("order_index", { ascending: true })

      const allDays: WorkoutDayRow[] = allDaysQ.error ? [] : (allDaysQ.data as WorkoutDayRow[]) ?? []

      if (allDays.length === 0) {
        return {
          assignment,
          kit,
          program: effectiveProgram,
          day: null,
          sessionCompletedToday: false,
          isRestDay: true,
          nextDayLabel: null,
        }
      }

      // Verificar se já completou treino hoje
      const sessionQ = await supabase
        .from("workout_sessions")
        .select("completed_at, day_id")
        .eq("user_id", userId)
        .eq("scheduled_date", today)
        .not("completed_at", "is", null)
        .maybeSingle()

      const sessionCompletedToday = !sessionQ.error && sessionQ.data !== null

      // Lógica de disponibilidade baseada em conclusão + calendário:
      // 1. Se há um dia agendado para hoje E não foi concluído → mostre hoje
      // 2. Se hoje foi concluído → mostre o próximo dia da sequência (avanço)
      // 3. Se hoje é dia de descanso (sem dia agendado) → mostre o próximo dia com exercícios
      const todayDay = allDays.find((d) => d.day_of_week === dow) ?? null

      let selectedDay: WorkoutDayRow | null = null
      let isRestDay = false
      let nextDayLabel: string | null = null

      if (todayDay && !sessionCompletedToday) {
        // Caso 1: treino de hoje disponível
        selectedDay = todayDay
      } else if (todayDay && sessionCompletedToday) {
        // Caso 2: hoje concluído → avançar para o próximo dia da sequência
        const currentIdx = allDays.findIndex((d) => d.id === todayDay.id)
        const nextIdx = (currentIdx + 1) % allDays.length
        selectedDay = allDays[nextIdx] ?? null
        nextDayLabel = selectedDay?.name_pt ?? selectedDay?.name_en ?? null
      } else if (!todayDay) {
        // Caso 3: dia de descanso → encontrar próximo dia com exercícios
        // Ordena os dias pelo day_of_week relativo a hoje
        const sorted = [...allDays].sort((a, b) => {
          const diffA = (a.day_of_week - dow + 7) % 7
          const diffB = (b.day_of_week - dow + 7) % 7
          return diffA - diffB
        })
        selectedDay = sorted[0] ?? null
        isRestDay = true
        nextDayLabel = selectedDay?.name_pt ?? selectedDay?.name_en ?? null
      }

      return {
        assignment,
        kit,
        program: effectiveProgram,
        day: selectedDay,
        sessionCompletedToday,
        isRestDay,
        nextDayLabel,
      }
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

  // ---------------------------------------------------------------------
  // STUDENT WORKOUT OVERRIDES (Personalização por aluno — Seção 19)
  // ---------------------------------------------------------------------
  static async listStudentOverrides(
    studentId: string,
    filters?: { assignment_id?: string; workout_exercise_id?: string; only_active?: boolean }
  ): Promise<StudentWorkoutOverrideRow[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("student_workout_overrides")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })

      if (filters?.assignment_id) q = q.eq("assignment_id", filters.assignment_id)
      if (filters?.workout_exercise_id) q = q.eq("workout_exercise_id", filters.workout_exercise_id)
      if (filters?.only_active) q = q.eq("is_active", true)

      const { data, error } = await q
      if (error) return []
      return (data as StudentWorkoutOverrideRow[]) ?? []
    } catch {
      return []
    }
  }

  static async upsertStudentOverride(
    input: UpsertStudentWorkoutOverrideInput,
    adminId?: string
  ): Promise<StudentWorkoutOverrideRow | null> {
    try {
      const parsed = upsertStudentWorkoutOverrideSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, any> = { ...parsed }
      if (!parsed.id && adminId) payload.created_by_id = adminId
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase
          .from("student_workout_overrides")
          .update(payload as never)
          .eq("id", parsed.id)
      } else {
        // Se já existe override ativo para o mesmo aluno + exercício, desativa antes
        const existingQ = await supabase
          .from("student_workout_overrides")
          .select("id")
          .eq("student_id", parsed.student_id)
          .eq("workout_exercise_id", parsed.workout_exercise_id)
          .eq("is_active", true)
          .maybeSingle()

        if (existingQ.data) {
          await supabase
            .from("student_workout_overrides")
            .update({ is_active: false } as never)
            .eq("id", (existingQ.data as any).id)
        }
        q = supabase.from("student_workout_overrides").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId,
        action: parsed.id ? "student_workout_override.update" : "student_workout_override.create",
        entity_type: "student_workout_overrides",
        entity_id: data.id,
        details: {
          student_id: parsed.student_id,
          workout_exercise_id: parsed.workout_exercise_id,
        },
      })

      return data as StudentWorkoutOverrideRow
    } catch {
      return null
    }
  }

  static async deleteStudentOverride(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("student_workout_overrides")
        .update({ is_active: false } as never)
        .eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "student_workout_override.delete",
        entity_type: "student_workout_overrides",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Aplica overrides do aluno a uma lista de workout_exercises.
   * Retorna uma cópia com os campos sobrescritos onde houver override ativo.
   */
  static async applyStudentOverrides(
    studentId: string,
    exercises: Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>
  ): Promise<Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>> {
    if (exercises.length === 0) return exercises
    try {
      const overrides = await this.listStudentOverrides(studentId, { only_active: true })
      if (overrides.length === 0) return exercises

      const overrideMap = new Map<string, StudentWorkoutOverrideRow>()
      for (const ov of overrides) {
        overrideMap.set(ov.workout_exercise_id, ov)
      }

      return exercises.map((wex) => {
        const ov = overrideMap.get(wex.id)
        if (!ov) return wex
        return {
          ...wex,
          sets: ov.sets ?? wex.sets,
          reps: ov.reps ?? wex.reps,
          weight_kg: ov.weight_kg ?? wex.weight_kg,
          rest_seconds: ov.rest_seconds ?? wex.rest_seconds,
          tempo: ov.tempo ?? wex.tempo,
          notes_pt: ov.notes_pt ?? wex.notes_pt,
          notes_en: ov.notes_en ?? wex.notes_en,
        }
      })
    } catch {
      return exercises
    }
  }
}
