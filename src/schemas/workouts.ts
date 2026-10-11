import { z } from "zod"
import type {
  MuscleGroupT,
  EquipmentT,
  DifficultyT,
  WorkoutStatusT,
  ExerciseSourceT,
} from "../lib/supabase/types"

const MUSCLE_GROUPS_ARR = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "core", "abs", "obliques", "quads", "hamstrings", "glutes",
  "calves", "adductors", "abductors", "lower_back", "traps",
  "full_body", "cardio",
] as const

const EQUIPMENT_ARR = [
  "body_weight", "barbell", "dumbbell", "kettlebell", "cable",
  "machine", "smith", "resistance_band", "medicine_ball", "bosu_ball",
  "foam_roller", "treadmill", "elliptical", "bike", "rowing",
  "jump_rope", "bench", "pull_up_bar", "other",
] as const

const DIFFICULTY_ARR = ["beginner", "intermediate", "advanced"] as const
const WORKOUT_STATUS_ARR = ["active", "completed", "paused", "archived"] as const
const EXERCISE_SOURCE_ARR = ["exercisedb", "custom"] as const

const muscleGroupSchema = z.enum(MUSCLE_GROUPS_ARR) as z.ZodType<MuscleGroupT>
const equipmentSchema = z.enum(EQUIPMENT_ARR) as z.ZodType<EquipmentT>
const difficultySchema = z.enum(DIFFICULTY_ARR) as z.ZodType<DifficultyT>
const workoutStatusSchema = z.enum(WORKOUT_STATUS_ARR) as z.ZodType<WorkoutStatusT>
const exerciseSourceSchema = z.enum(EXERCISE_SOURCE_ARR) as z.ZodType<ExerciseSourceT>

const uuidSchema = z.string().uuid({ message: "ID inválido." })

export const upsertExerciseSchema = z.object({
  source: exerciseSourceSchema.default("exercisedb"),
  name_pt: z.string().trim().min(1, { message: "Nome em português é obrigatório." }),
  name_en: z.string().trim().min(1, { message: "Nome em inglês é obrigatório." }),
  description_pt: z.string().trim().default(""),
  description_en: z.string().trim().default(""),
  instructions_pt: z.array(z.string()).default([]),
  instructions_en: z.array(z.string()).default([]),
  primary_muscle: muscleGroupSchema,
  secondary_muscles: z.array(muscleGroupSchema).default([]),
  equipment: equipmentSchema.default("body_weight"),
  difficulty: difficultySchema.default("beginner"),
  gif_url: z.string().url().optional().or(z.literal("")).nullable(),
  video_url: z.string().url().optional().or(z.literal("")).nullable(),
  thumbnail_url: z.string().url().optional().or(z.literal("")).nullable(),
  calories_per_min: z.coerce.number().positive().optional().nullable(),
  tags: z.array(z.string()).default([]),
  translation_locked: z.boolean().default(false),
  is_published: z.boolean().default(true),
  external_id: z.string().trim().optional().nullable(),
  id: uuidSchema.optional(),
})
export type UpsertExerciseInput = z.infer<typeof upsertExerciseSchema>

export const upsertWorkoutCategorySchema = z.object({
  name_pt: z.string().trim().min(1, { message: "Nome em português é obrigatório." }),
  name_en: z.string().trim().min(1, { message: "Nome em inglês é obrigatório." }),
  slug: z.string().trim().min(1, { message: "Slug é obrigatório." }),
  description_pt: z.string().trim().default(""),
  description_en: z.string().trim().default(""),
  icon_lucide: z.string().trim().optional().nullable(),
  color_hex: z.string().trim().optional().nullable(),
  order_index: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
  id: uuidSchema.optional(),
})
export type UpsertWorkoutCategoryInput = z.infer<typeof upsertWorkoutCategorySchema>

export const upsertWorkoutProgramSchema = z.object({
  title_pt: z.string().trim().min(1, { message: "Título em português é obrigatório." }),
  title_en: z.string().trim().min(1, { message: "Título em inglês é obrigatório." }),
  goal_pt: z.string().trim().default(""),
  goal_en: z.string().trim().default(""),
  difficulty: difficultySchema.default("beginner"),
  total_weeks: z.coerce.number().int().min(1).max(52).default(4),
  days_per_week: z.coerce.number().int().min(1).max(7).default(3),
  est_minutes_per_session: z.coerce.number().int().positive().default(45),
  status: workoutStatusSchema.default("active"),
  is_template: z.boolean().default(false),
  category_id: uuidSchema.optional().nullable(),
  notes_pt: z.string().trim().default(""),
  notes_en: z.string().trim().default(""),
  cover_image_url: z.string().url().optional().or(z.literal("")).nullable(),
  tags: z.array(z.string()).default([]),
  start_date: z.string().trim().optional().nullable(),
  end_date: z.string().trim().optional().nullable(),
  id: uuidSchema.optional(),
})
export type UpsertWorkoutProgramInput = z.infer<typeof upsertWorkoutProgramSchema>

export const upsertWorkoutDaySchema = z.object({
  program_id: uuidSchema,
  week_number: z.coerce.number().int().min(1).default(1),
  day_of_week: z.coerce.number().int().min(1).max(7).default(1),
  order_index: z.coerce.number().int().default(0),
  name_pt: z.string().trim().min(1, { message: "Nome do dia em português é obrigatório." }),
  name_en: z.string().trim().min(1, { message: "Nome do dia em inglês é obrigatório." }),
  focus_pt: z.string().trim().optional().nullable(),
  focus_en: z.string().trim().optional().nullable(),
  est_minutes: z.coerce.number().int().positive().default(45),
  warmup_minutes: z.coerce.number().int().nonnegative().default(5),
  cooldown_minutes: z.coerce.number().int().nonnegative().default(5),
  id: uuidSchema.optional(),
})
export type UpsertWorkoutDayInput = z.infer<typeof upsertWorkoutDaySchema>

export const upsertWorkoutExerciseSchema = z.object({
  day_id: uuidSchema,
  exercise_id: uuidSchema,
  order_index: z.coerce.number().int().default(0),
  sets: z.coerce.number().int().min(1).default(3),
  reps: z.string().trim().default(""),
  weight_kg: z.coerce.number().nonnegative().optional().nullable(),
  rest_seconds: z.coerce.number().int().nonnegative().optional().nullable(),
  tempo: z.string().trim().optional().nullable(),
  notes_pt: z.string().trim().optional().nullable(),
  notes_en: z.string().trim().optional().nullable(),
  drop_sets: z.coerce.number().int().nonnegative().default(0),
  id: uuidSchema.optional(),
})
export type UpsertWorkoutExerciseInput = z.infer<typeof upsertWorkoutExerciseSchema>

export const upsertWorkoutKitSchema = z.object({
  category_id: uuidSchema.optional().nullable(),
  name_pt: z.string().trim().min(1, { message: "Nome do kit em português é obrigatório." }),
  name_en: z.string().trim().min(1, { message: "Nome do kit em inglês é obrigatório." }),
  slug: z.string().trim().min(1, { message: "Slug é obrigatório." }),
  description_pt: z.string().trim().default(""),
  description_en: z.string().trim().default(""),
  short_desc_pt: z.string().trim().default(""),
  short_desc_en: z.string().trim().default(""),
  difficulty: difficultySchema.default("beginner"),
  total_weeks: z.coerce.number().int().min(1).max(52).default(4),
  days_per_week: z.coerce.number().int().min(1).max(7).default(3),
  est_minutes_per_session: z.coerce.number().int().positive().default(45),
  cover_image_url: z.string().url().optional().or(z.literal("")).nullable(),
  tags: z.array(z.string()).default([]),
  is_published: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  id: uuidSchema.optional(),
})
export type UpsertWorkoutKitInput = z.infer<typeof upsertWorkoutKitSchema>

export const upsertWorkoutKitItemSchema = z.object({
  kit_id: uuidSchema,
  program_id: uuidSchema,
  order_index: z.coerce.number().int().default(0),
  notes_pt: z.string().trim().optional().nullable(),
  notes_en: z.string().trim().optional().nullable(),
  id: uuidSchema.optional(),
})
export type UpsertWorkoutKitItemInput = z.infer<typeof upsertWorkoutKitItemSchema>

export const assignStudentWorkoutSchema = z
  .object({
    student_id: uuidSchema,
    kit_id: uuidSchema.optional().nullable(),
    program_id: uuidSchema.optional().nullable(),
    start_date: z.string().trim().min(1, { message: "Data de início é obrigatória." }),
    end_date: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.kit_id && !data.program_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "É obrigatório informar pelo menos um entre kit_id ou program_id.",
        path: ["kit_id"],
      })
    }
  })
export type AssignStudentWorkoutInput = z.infer<typeof assignStudentWorkoutSchema>

export const logWorkoutSetSchema = z.object({
  session_id: uuidSchema,
  workout_exercise_id: uuidSchema.optional().nullable(),
  exercise_id: uuidSchema,
  set_number: z.coerce.number().int().min(1).default(1),
  reps_done: z.coerce.number().int().nonnegative().default(0),
  weight_kg: z.coerce.number().nonnegative().optional().nullable(),
  rpe: z.coerce.number().min(1).max(10).optional().nullable(),
  duration_sec: z.coerce.number().int().nonnegative().optional().nullable(),
  distance_km: z.coerce.number().nonnegative().optional().nullable(),
  completed: z.boolean().default(true),
  failure_at_end: z.boolean().default(false),
})
export type LogWorkoutSetInput = z.infer<typeof logWorkoutSetSchema>

export const upsertStudentWorkoutOverrideSchema = z.object({
  student_id: uuidSchema,
  assignment_id: uuidSchema.optional().nullable(),
  workout_exercise_id: uuidSchema,
  sets: z.coerce.number().int().min(1).max(20).optional().nullable(),
  reps: z.string().trim().optional().nullable(),
  weight_kg: z.coerce.number().nonnegative().optional().nullable(),
  rest_seconds: z.coerce.number().int().nonnegative().optional().nullable(),
  tempo: z.string().trim().optional().nullable(),
  notes_pt: z.string().trim().optional().nullable(),
  notes_en: z.string().trim().optional().nullable(),
  is_active: z.boolean().default(true),
  id: uuidSchema.optional(),
})
export type UpsertStudentWorkoutOverrideInput = z.infer<typeof upsertStudentWorkoutOverrideSchema>
