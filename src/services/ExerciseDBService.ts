import { createServiceClientSSR } from "../lib/supabase/server"
import type {
  MuscleGroupT,
  EquipmentT,
  DifficultyT,
  ExerciseSourceT,
} from "../lib/supabase/types"
import type { ExerciseRow } from "../types"
import { AuditLogService } from "./AuditLogService"
import {
  upsertExerciseSchema,
  type UpsertExerciseInput,
} from "../schemas/workouts"

export interface ExerciseDbExercise {
  id?: string
  name?: string
  name_pt?: string
  name_en?: string
  target?: string
  secondaryMuscles?: string[]
  equipment?: string
  gifUrl?: string
  instructions?: string[]
  category?: string
  [key: string]: any
}

const MUSCLE_MAP: Record<string, MuscleGroupT> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  core: "core",
  abs: "abs",
  obliques: "obliques",
  quads: "quads",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  calves: "calves",
  adductors: "adductors",
  abductors: "abductors",
  lower_back: "lower_back",
  lats: "back",
  traps: "traps",
  full_body: "full_body",
  cardio: "cardio",
  cardiovascular: "cardio",
}

const EQUIPMENT_MAP: Record<string, EquipmentT> = {
  "body weight": "body_weight",
  body_weight: "body_weight",
  barbell: "barbell",
  dumbbell: "dumbbell",
  kettlebell: "kettlebell",
  cable: "cable",
  machine: "machine",
  smith: "smith",
  "smith machine": "smith",
  "resistance band": "resistance_band",
  resistance_band: "resistance_band",
  "medicine ball": "medicine_ball",
  medicine_ball: "medicine_ball",
  "bosu ball": "bosu_ball",
  bosu_ball: "bosu_ball",
  "foam roller": "foam_roller",
  foam_roller: "foam_roller",
  treadmill: "treadmill",
  elliptical: "elliptical",
  bike: "bike",
  "stationary bike": "bike",
  rowing: "rowing",
  "jump rope": "jump_rope",
  jump_rope: "jump_rope",
  bench: "bench",
  "pull up bar": "pull_up_bar",
  pull_up_bar: "pull_up_bar",
  other: "other",
}

const normalizeMuscle = (m?: string): MuscleGroupT => {
  if (!m) return "full_body"
  const key = String(m).toLowerCase().trim()
  return MUSCLE_MAP[key] ?? "full_body"
}

const normalizeEquipment = (e?: string): EquipmentT => {
  if (!e) return "body_weight"
  const key = String(e).toLowerCase().trim()
  return EQUIPMENT_MAP[key] ?? "other"
}

export class ExerciseDBService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  static async syncFromExternal(): Promise<{
    created: number
    updated: number
    skipped: number
    error?: string
  }> {
    try {
      const apiKey = process.env.RAPIDAPI_KEY || process.env.EXERCISEDB_API_KEY
      if (!apiKey) {
        console.warn("[ExerciseDBService] API key not configured")
        return {
          created: 0,
          updated: 0,
          skipped: 0,
          error: "API key não configurada. Configure RAPIDAPI_KEY ou EXERCISEDB_API_KEY no .env.local",
        }
      }

      const response = await fetch("https://exercisedb.p.rapidapi.com/exercises", {
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "exercisedb.p.rapidapi.com",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const exercises = (await response.json()) as ExerciseDbExercise[]

      const supabase = await this.getSupabase()
      const now = new Date().toISOString()

      let created = 0
      let updated = 0
      let skipped = 0

      for (const ext of exercises) {
        const external_id = String(ext.id ?? "")
        if (!external_id) {
          skipped++
          continue
        }

        const nameEn =
          (ext.name_en ?? ext.name ?? "").trim()
        const namePt =
          (ext.name_pt ?? ext.name ?? nameEn).trim()

        const primary: MuscleGroupT = normalizeMuscle(ext.target)
        const secondaries: MuscleGroupT[] = (ext.secondaryMuscles ?? []).map(normalizeMuscle)
        const equip: EquipmentT = normalizeEquipment(ext.equipment)

        const instructions_en_raw: string[] = Array.isArray(ext.instructions)
          ? (ext.instructions as string[]).filter((s) => String(s).trim().length > 0)
          : []

        const upsertPayloadBase = {
          external_id,
          source: "exercisedb" as ExerciseSourceT,
          name_pt: namePt || "Exercício",
          name_en: nameEn || "Exercise",
          description_pt: "",
          description_en: "",
          instructions_pt: instructions_en_raw,
          instructions_en: instructions_en_raw,
          primary_muscle: primary,
          secondary_muscles: secondaries,
          equipment: equip,
          difficulty: "intermediate" as DifficultyT,
          gif_url: ext.gifUrl ?? null,
          video_url: null,
          thumbnail_url: null,
          calories_per_min: null,
          tags: ext.category ? [ext.category] : [],
          translation_locked: false,
          is_published: true,
          external_synced_at: now,
        }

        const existingQ = await supabase
          .from("exercises")
          .select("*")
          .eq("external_id", external_id)
          .eq("source", "exercisedb")
          .maybeSingle()

        const existing = existingQ.data as ExerciseRow | null

        if (!existingQ.error) {
          if (existing) {
            if (existing.translation_locked) {
              const { error: updErr } = await supabase
                .from("exercises")
                .update({
                  gif_url: upsertPayloadBase.gif_url,
                  video_url: upsertPayloadBase.video_url,
                  thumbnail_url: upsertPayloadBase.thumbnail_url,
                  equipment: upsertPayloadBase.equipment,
                  tags: upsertPayloadBase.tags,
                  calories_per_min: upsertPayloadBase.calories_per_min,
                  external_synced_at: upsertPayloadBase.external_synced_at,
                } as never)
                .eq("id", existing.id)
              if (updErr) skipped++
              else updated++
            } else {
              const { error: updErr } = await supabase
                .from("exercises")
                .update(upsertPayloadBase as never)
                .eq("id", existing.id)
              if (updErr) skipped++
              else updated++
            }
          } else {
            const { error: insErr } = await supabase
              .from("exercises")
              .insert(upsertPayloadBase as never)
            if (insErr) skipped++
            else created++
          }
        } else {
          skipped++
        }
      }

      return { created, updated, skipped }
    } catch {
      return {
        created: 0,
        updated: 0,
        skipped: 0,
        error: "ExerciseDB indisponível, usando cache local",
      }
    }
  }

  static async listExercises(filters?: {
    source?: ExerciseSourceT
    primary_muscle?: MuscleGroupT
    equipment?: EquipmentT
    difficulty?: DifficultyT
    is_published?: boolean
    search?: string
    limit?: number
    offset?: number
  }): Promise<ExerciseRow[]> {
    try {
      const supabase = await this.getSupabase()
      const limit = filters?.limit ?? 50
      const offset = filters?.offset ?? 0

      let query = supabase
        .from("exercises")
        .select("*")
        .eq("is_deleted", false)
        .order("name_pt", { ascending: true })
        .range(offset, offset + limit - 1)

      if (filters?.source) query = query.eq("source", filters.source)
      if (filters?.primary_muscle) query = query.eq("primary_muscle", filters.primary_muscle)
      if (filters?.equipment) query = query.eq("equipment", filters.equipment)
      if (filters?.difficulty) query = query.eq("difficulty", filters.difficulty)
      if (typeof filters?.is_published !== "undefined") query = query.eq("is_published", filters.is_published)
      if (filters?.search) {
        const search = filters.search
        query = query.or(`name_pt.ilike.%${search}%,name_en.ilike.%${search}%,description_pt.ilike.%${search}%,description_en.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) return []
      return (data as ExerciseRow[]) ?? []
    } catch {
      return []
    }
  }

  static async getExercise(id: string): Promise<ExerciseRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("id", id)
        .eq("is_deleted", false)
        .maybeSingle()
      if (error) return null
      return (data as ExerciseRow | null) ?? null
    } catch {
      return null
    }
  }

  static async upsertExercise(
    input: UpsertExerciseInput,
    createdById?: string
  ): Promise<ExerciseRow | null> {
    try {
      const parsed = upsertExerciseSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, any> = { ...parsed }
      if (!parsed.id && createdById) payload.created_by_id = createdById
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase.from("exercises").update(payload as never).eq("id", parsed.id)
      } else {
        q = supabase.from("exercises").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId: createdById,
        action: parsed.id ? "exercise.update" : "exercise.create",
        entity_type: "exercises",
        entity_id: data.id,
        details: { name_pt: parsed.name_pt, name_en: parsed.name_en },
      })

      return data as ExerciseRow
    } catch {
      return null
    }
  }

  static async deleteExercise(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("exercises")
        .update({ is_deleted: true } as never)
        .eq("id", id)

      if (error) return false

      void AuditLogService.log({
        adminId,
        action: "exercise.delete",
        entity_type: "exercises",
        entity_id: id,
      })

      return true
    } catch {
      return false
    }
  }
}
