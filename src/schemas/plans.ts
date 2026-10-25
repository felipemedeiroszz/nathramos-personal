import { z } from "zod"

export const BILLING_CYCLE_OPTIONS = [7, 30, 90, 180, 365] as const

export const PLAN_CURRENCIES = ["BRL", "USD"] as const

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable()

/** Banner exibido na página pública de planos. */
export const planBannerSchema = z.object({
  id: z.string().trim().min(1).max(64),
  image_url: z.string().trim().min(1, { message: "Imagem do banner é obrigatória." }).max(2000),
  title_pt: optionalText(120),
  title_en: optionalText(120),
  subtitle_pt: optionalText(240),
  subtitle_en: optionalText(240),
  cta_label_pt: optionalText(60),
  cta_label_en: optionalText(60),
  cta_href: optionalText(500),
  badge_pt: optionalText(60),
  badge_en: optionalText(60),
  is_active: z.boolean().default(true),
})

export type PlanBannerInput = z.input<typeof planBannerSchema>

export const upsertPlanSchema = z.object({
  id: z.string().uuid({ message: "ID inválido." }).optional(),
  name_pt: z
    .string()
    .trim()
    .min(1, { message: "Nome em português é obrigatório." })
    .max(120),
  name_en: z
    .string()
    .trim()
    .min(1, { message: "Nome em inglês é obrigatório." })
    .max(120),
  description_pt: optionalText(2000),
  description_en: optionalText(2000),
  slug: z
    .string()
    .trim()
    .min(1, { message: "Slug é obrigatório." })
    .max(80)
    .regex(/^[a-z0-9-]+$/i, {
      message: "Use apenas letras, números e hífen no slug.",
    }),
  price_cents: z.coerce
    .number()
    .int()
    .min(0, { message: "O preço não pode ser negativo." }),
  currency: z.enum(PLAN_CURRENCIES).default("BRL"),
  billing_cycle_days: z.coerce
    .number()
    .int()
    .refine((v) => (BILLING_CYCLE_OPTIONS as readonly number[]).includes(v), {
      message: "Ciclo de cobrança inválido.",
    })
    .default(30),
  trial_days: z.coerce.number().int().min(0).max(60).default(0),
  grace_days: z.coerce.number().int().min(0).max(30).default(3),
  stripe_price_id: optionalText(200),
  stripe_product_id: optionalText(200),
  asaas_plan_id: optionalText(200),
  max_active_workouts: z.coerce.number().int().min(0).max(100000).default(9999),
  max_exam_files_month: z.coerce.number().int().min(0).max(100000).default(9999),
  include_meal_plan: z.boolean().default(false),
  include_supplements: z.boolean().default(false),
  include_hydration: z.boolean().default(true),
  include_sleep: z.boolean().default(true),
  include_exams: z.boolean().default(false),
  include_ebooks: z.boolean().default(true),
  chat_support: z.boolean().default(true),
  custom_exercises: z.boolean().default(false),
  coach_direct_access: z.boolean().default(false),
  has_referral_reward: z.boolean().default(false),
  video_meetings_month: z.coerce.number().int().min(0).max(100000).default(9999),
  referral_discount_pct: z.coerce.number().min(0).max(100).default(0),
  highlight_hex: optionalText(20),
  badge_pt: optionalText(60),
  badge_en: optionalText(60),
  banners: z.array(planBannerSchema).max(10).default([]),
  is_active: z.boolean().default(true),
})

/** Entrada aceita pelo formulário (campos com default são opcionais). */
export type UpsertPlanInput = z.input<typeof upsertPlanSchema>
