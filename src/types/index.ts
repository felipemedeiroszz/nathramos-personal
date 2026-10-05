export type Locale = "pt-BR" | "en-US"

export type Currency = "BRL" | "USD"

export type UserRole = "admin" | "student" | "coach"

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "inactive"
  | "expired"
  | "blocked"

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded"
  | "expired"
  | "partially_refunded"

export type PaymentProvider = "stripe" | "asaas"

export type PaymentMethod =
  | "credit_card"
  | "pix"
  | "boleto"
  | "bank_transfer"

export type NotificationType =
  | "system"
  | "payment"
  | "workout"
  | "diet"
  | "supplement"
  | "hydration"
  | "sleep"
  | "exam"
  | "ebook"
  | "chat"
  | "meeting"
  | "performance"
  | "reminder"
  | "marketing"

export type Difficulty = "beginner" | "intermediate" | "advanced"

export type WorkoutStatus = "active" | "completed" | "paused" | "archived"

export type ExerciseSource = "exercisedb" | "custom"

export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "core" | "abs" | "obliques" | "quads" | "hamstrings" | "glutes"
  | "calves" | "adductors" | "abductors" | "lower_back" | "traps"
  | "full_body" | "cardio"

export type Equipment =
  | "body_weight" | "barbell" | "dumbbell" | "kettlebell" | "cable"
  | "machine" | "smith" | "resistance_band" | "medicine_ball" | "bosu_ball"
  | "foam_roller" | "treadmill" | "elliptical" | "bike" | "rowing"
  | "jump_rope" | "bench" | "pull_up_bar" | "other"

export type MealType =
  | "breakfast" | "morning_snack" | "lunch" | "afternoon_snack"
  | "dinner" | "supper" | "pre_workout" | "post_workout" | "water" | "other"

export type ChatSender = "user" | "coach" | "system"

export type MeetingStatus =
  | "scheduled" | "confirmed" | "rescheduled" | "canceled" | "completed" | "no_show"

export type {
  LocaleT,
  CurrencyT,
  UserRoleT,
  SubscriptionStatusT,
  PaymentStatusT,
  PaymentProviderT,
  PaymentMethodT,
  NotificationTypeT,
  DifficultyT,
  WorkoutStatusT,
  ExerciseSourceT,
  MuscleGroupT,
  EquipmentT,
  MealTypeT,
  ChatSenderT,
  MeetingStatusT,
} from "../lib/supabase/types"

import type {
  DifficultyT,
  WorkoutStatusT,
  ExerciseSourceT,
  MuscleGroupT,
  EquipmentT,
  UserRoleT as SupabaseUserRoleT,
  CurrencyT as SupabaseCurrencyT,
} from "../lib/supabase/types"

type UserRoleT = SupabaseUserRoleT
type CurrencyT = SupabaseCurrencyT

export interface WorkoutCategoryRow {
  id: string
  name_pt: string
  name_en: string
  slug: string
  description_pt: string
  description_en: string
  icon_lucide?: string | null
  color_hex?: string | null
  order_index: number
  is_active: boolean
  created_by_id?: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutProgramRow {
  id: string
  owner_id: string
  assigned_plan_id?: string | null
  assigned_by_id?: string | null
  category_id?: string | null
  title_pt: string
  title_en: string
  goal_pt: string
  goal_en: string
  difficulty: DifficultyT
  total_weeks: number
  days_per_week: number
  est_minutes_per_session: number
  status: WorkoutStatusT
  is_template: boolean
  notes_pt: string
  notes_en: string
  cover_image_url?: string | null
  tags: string[]
  start_date?: string | null
  end_date?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutDayRow {
  id: string
  program_id: string
  week_number: number
  day_of_week: number
  order_index: number
  name_pt: string
  name_en: string
  focus_pt?: string | null
  focus_en?: string | null
  est_minutes: number
  warmup_minutes: number
  cooldown_minutes: number
  created_at: string
  updated_at: string
}

export interface WorkoutExerciseRow {
  id: string
  day_id: string
  exercise_id: string
  order_index: number
  sets: number
  reps?: string | null
  weight_kg?: number | null
  rest_seconds?: number | null
  tempo?: string | null
  notes_pt?: string | null
  notes_en?: string | null
  drop_sets: number
  supersets_with_id?: string | null
  created_at: string
  updated_at: string
}

export interface ExerciseRow {
  id: string
  external_id?: string | null
  source: ExerciseSourceT
  name_pt: string
  name_en: string
  description_pt: string
  description_en: string
  instructions_pt: string[]
  instructions_en: string[]
  primary_muscle: MuscleGroupT
  secondary_muscles: MuscleGroupT[]
  equipment: EquipmentT
  difficulty: DifficultyT
  gif_url?: string | null
  video_url?: string | null
  thumbnail_url?: string | null
  images_bucket_path?: string[] | null
  calories_per_min?: number | null
  steps?: number[] | null
  tips?: string[] | null
  tags?: string[] | null
  created_by_id?: string | null
  translation_locked: boolean
  is_published: boolean
  is_deleted: boolean
  external_synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutSessionRow {
  id: string
  user_id: string
  program_id?: string | null
  day_id?: string | null
  scheduled_date: string
  started_at?: string | null
  completed_at?: string | null
  duration_min?: number | null
  calories_burned?: number | null
  feeling_scale?: number | null
  rpe_avg?: number | null
  total_volume_kg?: number | null
  notes?: string | null
  is_paused: boolean
  created_at: string
  updated_at: string
}

export interface ExerciseSetLogRow {
  id: number
  session_id: string
  workout_exercise_id?: string | null
  exercise_id: string
  set_number: number
  reps_done: number
  weight_kg?: number | null
  rpe?: number | null
  duration_sec?: number | null
  distance_km?: number | null
  completed: boolean
  failure_at_end: boolean
  logged_at: string
}

export interface WorkoutKitRow {
  id: string
  category_id?: string | null
  assigned_plan_id?: string | null
  name_pt: string
  name_en: string
  slug: string
  description_pt: string
  description_en: string
  short_desc_pt: string
  short_desc_en: string
  difficulty: DifficultyT
  total_weeks: number
  days_per_week: number
  est_minutes_per_session: number
  cover_image_url?: string | null
  tags: string[]
  is_published: boolean
  is_featured: boolean
  is_deleted: boolean
  created_by_id?: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutKitItemRow {
  id: string
  kit_id: string
  program_id: string
  order_index: number
  notes_pt?: string | null
  notes_en?: string | null
  created_at: string
}

export interface StudentWorkoutKitRow {
  id: string
  student_id: string
  kit_id?: string | null
  program_id?: string | null
  assigned_by_id?: string | null
  assigned_plan_id?: string | null
  start_date: string
  end_date?: string | null
  status: WorkoutStatusT
  custom_title_pt?: string | null
  custom_title_en?: string | null
  notes?: string | null
  assigned_at: string
  activated_at?: string | null
  completed_at?: string | null
  paused_at?: string | null
  updated_at: string
}

export interface ProfileRow {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string | null
  avatar_url?: string | null
  role?: UserRoleT | null
  gender?: string | null
  birth_date?: string | null
  height_cm?: number | null
  weight_kg?: number | null
  language?: string | null
  country?: string | null
  created_at: string
  updated_at: string
}

export interface PlanRow {
  id: string
  name_pt: string
  name_en: string
  slug: string
  description_pt: string
  description_en: string
  amount_cents: number
  price_cents: number
  billing_cycle_days: number
  currency: CurrencyT
  is_active: boolean
  is_featured: boolean
  features_pt: string[]
  features_en: string[]
  created_at: string
  updated_at: string
}

export interface ExtendedProfile {
  id: string
  full_name?: string | null
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  avatar_url?: string | null
  role?: UserRoleT | null
  gender?: string | null
  birth_date?: string | null
  height_cm?: number | null
  weight_kg?: number | null
  language?: string | null
  country?: string | null
  created_at?: string | null
}

export const MUSCLE_GROUPS: MuscleGroupT[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "core", "abs", "obliques", "quads", "hamstrings", "glutes",
  "calves", "adductors", "abductors", "lower_back", "traps",
  "full_body", "cardio",
]

export const EQUIPMENT_TYPES: EquipmentT[] = [
  "body_weight", "barbell", "dumbbell", "kettlebell", "cable",
  "machine", "smith", "resistance_band", "medicine_ball", "bosu_ball",
  "foam_roller", "treadmill", "elliptical", "bike", "rowing",
  "jump_rope", "bench", "pull_up_bar", "other",
]

export const WORKOUT_STATUSES: WorkoutStatusT[] = ["active", "completed", "paused", "archived"]
export const EXERCISE_SOURCES: ExerciseSourceT[] = ["exercisedb", "custom"]
export const DIFFICULTY_LEVELS: DifficultyT[] = ["beginner", "intermediate", "advanced"]
