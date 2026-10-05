export type { }

declare module "@supabase/supabase-js" {
  export interface UserMetadata {
    full_name?: string
    display_name?: string
    avatar_url?: string
    language?: "pt-BR" | "en-US"
    timezone?: string
    currency?: "BRL" | "USD"
  }
}

export type LocaleT = "pt-BR" | "en-US"
export type CurrencyT = "BRL" | "USD"
export type UserRoleT = "admin" | "student" | "coach"
export type SubscriptionStatusT =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "inactive"
  | "expired"
  | "blocked"
export type PaymentStatusT =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded"
  | "expired"
  | "partially_refunded"
export type PaymentProviderT = "stripe" | "asaas"
export type PaymentMethodT =
  | "credit_card"
  | "pix"
  | "boleto"
  | "bank_transfer"
export type NotificationTypeT =
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
export type DifficultyT = "beginner" | "intermediate" | "advanced"
export type WorkoutStatusT = "active" | "completed" | "paused" | "archived"
export type ExerciseSourceT = "exercisedb" | "custom"
export type MuscleGroupT =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "core" | "abs" | "obliques" | "quads" | "hamstrings" | "glutes"
  | "calves" | "adductors" | "abductors" | "lower_back" | "traps"
  | "full_body" | "cardio"
export type EquipmentT =
  | "body_weight" | "barbell" | "dumbbell" | "kettlebell" | "cable"
  | "machine" | "smith" | "resistance_band" | "medicine_ball" | "bosu_ball"
  | "foam_roller" | "treadmill" | "elliptical" | "bike" | "rowing"
  | "jump_rope" | "bench" | "pull_up_bar" | "other"
export type MealTypeT =
  | "breakfast" | "morning_snack" | "lunch" | "afternoon_snack"
  | "dinner" | "supper" | "pre_workout" | "post_workout" | "water" | "other"
export type ChatSenderT = "user" | "coach" | "system"
export type MeetingStatusT =
  | "scheduled" | "confirmed" | "rescheduled" | "canceled" | "completed" | "no_show"

export interface ProfileRow {
  id: string
  full_name: string
  display_name?: string | null
  avatar_url?: string | null
  cpf?: string | null
  phone?: string | null
  gender?: string | null
  birth_date?: string | null
  language: LocaleT
  timezone: string
  currency: CurrencyT
  role: UserRoleT
  referred_by_id?: string | null
  signup_completed_at?: string | null
  height_cm?: number | null
  weight_kg?: number | null
  body_fat_pct?: number | null
  primary_goal?: string | null
  training_level?: DifficultyT | null
  medical_conditions?: string[] | null
  food_restrictions?: string[] | null
  allergies?: string[] | null
  stripe_customer_id?: string | null
  asaas_customer_id?: string | null
  onboarding_step: number
  has_accepted_terms: boolean
  accepted_terms_at?: string | null
  has_accepted_privacy: boolean
  accepted_privacy_at?: string | null
  quiet_hours_start?: string | null
  quiet_hours_end?: string | null
  push_enabled: boolean
  email_notifs_enabled: boolean
  last_seen_at?: string | null
  last_login_at?: string | null
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface PlanRow {
  id: string
  order_index: number
  is_active: boolean
  name_pt: string
  name_en: string
  description_pt: string
  description_en: string
  slug: string
  price_cents: number
  currency: CurrencyT
  billing_cycle_days: number
  trial_days: number
  grace_days: number
  stripe_price_id?: string | null
  stripe_product_id?: string | null
  asaas_plan_id?: string | null
  max_active_workouts: number
  max_exam_files_month: number
  include_meal_plan: boolean
  include_supplements: boolean
  include_hydration: boolean
  include_sleep: boolean
  include_exams: boolean
  include_ebooks: boolean
  chat_support: boolean
  video_meetings_month: number
  custom_exercises: boolean
  coach_direct_access: boolean
  has_referral_reward: boolean
  referral_discount_pct: number
  highlight_hex?: string | null
  badge_pt?: string | null
  badge_en?: string | null
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionRow {
  id: string
  user_id: string
  plan_id: string
  status: SubscriptionStatusT
  external_id?: string | null
  provider?: PaymentProviderT | null
  external_status?: string | null
  currency: CurrencyT
  unit_amount_cents: number
  billing_cycle_days: number
  trial_ends_at?: string | null
  current_period_start: string
  current_period_end: string
  grace_until?: string | null
  block_reason?: string | null
  cancel_at_period_end: boolean
  canceled_at?: string | null
  ended_at?: string | null
  started_at: string
  pause_starts_at?: string | null
  pause_ends_at?: string | null
  payment_method_pref?: PaymentMethodT | null
  last_paid_at?: string | null
  last_failed_at?: string | null
  dunning_attempts: number
  discount_pct: number
  coupon_code?: string | null
  source?: string | null
  ip_signup?: string | null
  created_at: string
  updated_at: string
}

export interface PaymentRow {
  id: string
  subscription_id?: string | null
  user_id: string
  provider: PaymentProviderT
  external_id?: string | null
  external_event_id?: string | null
  status: PaymentStatusT
  amount_cents: number
  currency: CurrencyT
  fee_cents: number
  net_amount_cents: number
  method: PaymentMethodT
  installments: number
  description_pt: string
  description_en: string
  pix_qr_code?: string | null
  pix_copy_paste?: string | null
  pix_expires_at?: string | null
  boleto_barcode?: string | null
  boleto_digitable_line?: string | null
  boleto_expires_at?: string | null
  boleto_url?: string | null
  card_last4?: string | null
  card_brand?: string | null
  card_holder?: string | null
  due_at?: string | null
  paid_at?: string | null
  failed_at?: string | null
  refunded_at?: string | null
  failure_reason?: string | null
  metadata?: Record<string, unknown>
  idempotency_key?: string | null
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
  tags: string[]
  created_by_id?: string | null
  translation_locked: boolean
  is_published: boolean
  is_deleted: boolean
  external_synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface WorkoutProgramRow {
  id: string
  owner_id: string
  assigned_plan_id?: string | null
  assigned_by_id?: string | null
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

export interface NotificationRow {
  id: string
  user_id: string
  template_id?: string | null
  type: NotificationTypeT
  title: string
  body: string
  image_url?: string | null
  url?: string | null
  payload: Record<string, unknown>
  scheduled_for?: string | null
  sent_at?: string | null
  read_at?: string | null
  clicked_at?: string | null
  error_text?: string | null
  provider?: string | null
  push_delivery_count: number
  created_at: string
}

export interface WebhookEventRow {
  id: number
  provider: PaymentProviderT
  event_id: string
  event_type: string
  payload: Record<string, unknown>
  signature_ok?: boolean | null
  processed_at?: string | null
  error_text?: string | null
  created_at: string
}

export interface CanAccessResult {
  allowed: boolean
  status: SubscriptionStatusT
  reason: string
}

export type Locale = LocaleT
export type Currency = CurrencyT
export type UserRole = UserRoleT
export type SubscriptionStatus = SubscriptionStatusT
export type PaymentStatus = PaymentStatusT
export type PaymentProvider = PaymentProviderT
export type PaymentMethod = PaymentMethodT
export type NotificationType = NotificationTypeT
export type Difficulty = DifficultyT
export type WorkoutStatus = WorkoutStatusT
export type ExerciseSource = ExerciseSourceT
export type MuscleGroup = MuscleGroupT
export type Equipment = EquipmentT
export type MealType = MealTypeT
export type ChatSender = ChatSenderT
export type MeetingStatus = MeetingStatusT
