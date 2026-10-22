import { z } from "zod"

export const platformSettingsSchema = z.object({
  brand_name_pt: z.string().trim().max(120).default(""),
  brand_name_en: z.string().trim().max(120).default(""),
  brand_tagline_pt: z.string().trim().max(200).default(""),
  brand_tagline_en: z.string().trim().max(200).default(""),
  support_email: z
    .string()
    .trim()
    .max(160)
    .default("")
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Informe um e-mail válido.",
    }),
  support_whatsapp: z.string().trim().max(40).default(""),
  support_hours_pt: z.string().trim().max(160).default(""),
  support_hours_en: z.string().trim().max(160).default(""),
  maintenance_mode: z.boolean().default(false),
  maintenance_duration: z.coerce.number().int().min(1).max(8760).default(24),
  maintenance_duration_unit: z.enum(["hours", "days"]).default("hours"),
  signup_open: z.boolean().default(true),
  trial_days_default: z.coerce.number().int().min(0).max(365).default(7),
})

export type PlatformSettingsInput = z.input<typeof platformSettingsSchema>
export type PlatformSettingsData = z.output<typeof platformSettingsSchema>
