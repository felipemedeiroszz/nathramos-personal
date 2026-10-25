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
  LocaleT,
  DifficultyT,
  WorkoutStatusT,
  ExerciseSourceT,
  MuscleGroupT,
  EquipmentT,
  MealTypeT,
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
  /** Programa de treino manual (workout_programs). Nulo quando o treino é um exercício. */
  program_id?: string | null
  /** Exercício (manual ou sincronizado da API). Nulo quando o treino é um programa. */
  exercise_id?: string | null
  /** Letra do treino dentro do kit (A..F). */
  category_label?: string | null
  /** Dia da semana do treino: 1 = Segunda ... 7 = Domingo. */
  day_of_week?: number | null
  order_index: number
  notes_pt?: string | null
  notes_en?: string | null
  created_at: string
}

/** Item do kit com a origem resolvida (programa de treino ou exercício). */
export interface WorkoutKitItemWithSource extends WorkoutKitItemRow {
  program?: WorkoutProgramRow | null
  exercise?: ExerciseRow | null
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

export interface StudentWorkoutOverrideRow {
  id: string
  student_id: string
  assignment_id?: string | null
  workout_exercise_id: string
  sets?: number | null
  reps?: string | null
  weight_kg?: number | null
  rest_seconds?: number | null
  tempo?: string | null
  notes_pt?: string | null
  notes_en?: string | null
  is_active: boolean
  created_by_id?: string | null
  created_at: string
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

// Diet types
export interface DietProgramRow {
  id: string
  user_id: string
  assigned_by_id?: string | null
  assigned_plan_id?: string | null
  title_pt: string
  title_en: string
  daily_calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
  sodium_mg: number
  water_liters: number
  start_date: string
  end_date?: string | null
  is_active: boolean
  restrictions_pt: string[]
  restrictions_en: string[]
  notes_pt?: string | null
  notes_en?: string | null
  created_at: string
  updated_at: string
}

export interface DietMealRow {
  id: string
  diet_id: string
  meal_type: MealTypeT
  time_of_day: string
  order_index: number
  name_pt: string
  name_en: string
  instructions_pt?: string | null
  instructions_en?: string | null
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fats_g: number
  created_at: string
  updated_at: string
}

export interface DietMealItemRow {
  id: string
  meal_id: string
  order_index: number
  name_pt: string
  name_en: string
  quantity: number
  unit: string
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fats_g: number
  alternatives_pt: string[]
  alternatives_en: string[]
  created_at: string
}

// Supplement types
export interface SupplementRow {
  id: string
  created_by_id?: string | null
  name_pt: string
  name_en: string
  category_pt: string
  category_en: string
  description_pt?: string | null
  description_en?: string | null
  serving_size: number
  serving_unit: string
  suggested_times_pt: string[]
  suggested_times_en: string[]
  contraindications_pt: string[]
  contraindications_en: string[]
  benefits_pt: string[]
  benefits_en: string[]
  brand?: string | null
  image_url?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserSupplementRow {
  id: string
  user_id: string
  supplement_id?: string | null
  name_pt_snapshot: string
  dosage: number
  dosage_unit: string
  frequency_per_day: number
  times_of_day: string[]
  start_date: string
  end_date?: string | null
  is_active: boolean
  assigned_by_id?: string | null
  notes?: string | null
  created_at: string
}

// Supplement kit types
export interface SupplementKitRow {
  id: string
  created_by_id?: string | null
  name_pt: string
  name_en: string
  slug: string
  description_pt: string
  description_en: string
  short_desc_pt: string
  short_desc_en: string
  cover_image_url?: string | null
  goal_pt?: string | null
  goal_en?: string | null
  tags: string[]
  is_published: boolean
  is_featured: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface SupplementKitItemRow {
  id: string
  kit_id: string
  supplement_id?: string | null
  dosage?: number | null
  dosage_unit?: string | null
  frequency_per_day: number
  times_of_day: string[]
  notes_pt?: string | null
  notes_en?: string | null
  order_index: number
  created_at: string
}

export interface SupplementKitItemWithSupplement extends SupplementKitItemRow {
  supplement?: {
    id: string
    name_pt: string
    name_en: string
    category_pt?: string | null
    category_en?: string | null
    serving_size?: number | null
    serving_unit?: string | null
    image_url?: string | null
    brand?: string | null
  } | null
}

export interface SupplementKitWithItems extends SupplementKitRow {
  items: SupplementKitItemWithSupplement[]
}

export type SupplementKitAssignmentStatus = "active" | "archived" | "completed"

export interface StudentSupplementKitRow {
  id: string
  student_id: string
  kit_id: string
  assigned_by_id?: string | null
  start_date: string
  end_date?: string | null
  status: SupplementKitAssignmentStatus
  notes?: string | null
  assigned_at: string
  updated_at: string
}

export interface StudentSupplementKitWithKit extends StudentSupplementKitRow {
  kit?: SupplementKitRow | null
}

// Diet food types
export interface DietFoodRow {
  id: string
  created_by_id?: string | null
  name_pt: string
  name_en: string
  category_pt: string
  category_en: string
  description_pt?: string | null
  description_en?: string | null
  serving_size: number
  serving_unit: string
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
  brand?: string | null
  image_url?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Diet kit types
export interface DietKitRow {
  id: string
  created_by_id?: string | null
  name_pt: string
  name_en: string
  slug: string
  description_pt: string
  description_en: string
  short_desc_pt: string
  short_desc_en: string
  cover_image_url?: string | null
  goal_pt?: string | null
  goal_en?: string | null
  tags: string[]
  is_published: boolean
  is_featured: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface DietKitItemRow {
  id: string
  kit_id: string
  food_id?: string | null
  quantity?: number | null
  unit?: string | null
  meal_type: MealTypeT
  time_of_day?: string | null
  notes_pt?: string | null
  notes_en?: string | null
  order_index: number
  created_at: string
}

export interface DietKitItemWithFood extends DietKitItemRow {
  food?: {
    id: string
    name_pt: string
    name_en: string
    category_pt?: string | null
    category_en?: string | null
    serving_size?: number | null
    serving_unit?: string | null
    calories_kcal?: number | null
    protein_g?: number | null
    carbs_g?: number | null
    fats_g?: number | null
    image_url?: string | null
    brand?: string | null
  } | null
}

export interface DietKitWithItems extends DietKitRow {
  items: DietKitItemWithFood[]
}

export type DietKitAssignmentStatus = "active" | "archived" | "completed"

export interface StudentDietKitRow {
  id: string
  student_id: string
  kit_id: string
  assigned_by_id?: string | null
  start_date: string
  end_date?: string | null
  status: DietKitAssignmentStatus
  notes?: string | null
  assigned_at: string
  updated_at: string
}

export interface StudentDietKitWithKit extends StudentDietKitRow {
  kit?: DietKitRow | null
}

// Exam types
export interface ExamCategoryRow {
  id: string
  name_pt: string
  name_en: string
  order_index: number
  created_at: string
}

export interface ExamRow {
  id: string
  user_id: string
  category_id?: string | null
  title: string
  exam_date: string
  lab_name?: string | null
  description?: string | null
  file_bucket_path?: string | null
  file_name?: string | null
  file_size_bytes?: number | null
  file_mime_type?: string | null
  results_summary?: Record<string, unknown>
  coach_feedback?: string | null
  reviewed_by_id?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
  deleted_at?: string | null
}

// Ebook types
export interface EbookRow {
  id: string
  title_pt: string
  title_en: string
  slug: string
  summary_pt?: string | null
  summary_en?: string | null
  cover_url?: string | null
  file_bucket_path?: string | null
  external_url?: string | null
  pages_count?: number | null
  language: LocaleT
  is_free: boolean
  price_cents: number
  currency: Currency
  min_plan_id?: string | null
  publish_at?: string | null
  is_published: boolean
  categories_pt: string[]
  categories_en: string[]
  author?: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export interface EbookDownloadRow {
  id: number
  user_id: string
  ebook_id: string
  downloaded_at: string
  ip_address?: string | null
}

export interface EbookPurchaseRow {
  id: string
  user_id: string
  ebook_id: string
  provider: PaymentProvider
  status: PaymentStatus
  amount_cents: number
  currency: Currency
  external_id?: string | null
  external_event_id?: string | null
  pix_qr_code?: string | null
  pix_copy_paste?: string | null
  pix_expires_at?: string | null
  paid_at?: string | null
  failed_at?: string | null
  refunded_at?: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Platform settings types
export interface PlatformSettingRow {
  key: string
  value_pt?: string | null
  value_en?: string | null
  value_json?: unknown
  value_num?: number | null
  updated_by_id?: string | null
  created_at: string
  updated_at: string
}

// Institutional content pages (Termos, Privacidade, FAQ)
export interface ContentPageBlock {
  id: string
  title_pt?: string | null
  title_en?: string | null
  subtitle_pt?: string | null
  subtitle_en?: string | null
  text_pt?: string | null
  text_en?: string | null
  image_url?: string | null
  button_label_pt?: string | null
  button_label_en?: string | null
  button_url?: string | null
}

export interface ContentPageRow {
  id: string
  slug: string
  title_pt?: string | null
  title_en?: string | null
  subtitle_pt?: string | null
  subtitle_en?: string | null
  image_url?: string | null
  cta_label_pt?: string | null
  cta_label_en?: string | null
  cta_url?: string | null
  blocks: ContentPageBlock[]
  is_active: boolean
  updated_by_id?: string | null
  created_at: string
  updated_at: string
}

// Social media types
export interface SocialLinkRow {
  id: string
  platform: string
  label_pt?: string | null
  label_en?: string | null
  handle?: string | null
  url: string
  icon_url?: string | null
  sort_order: number
  is_active: boolean
  created_by_id?: string | null
  created_at: string
  updated_at: string
}
