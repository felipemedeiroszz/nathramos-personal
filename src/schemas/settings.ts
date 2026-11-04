import { z } from "zod"
import { whatsappDigits } from "@/lib/platform/publicSettings"

export const platformSettingsSchema = z.object({
  brand_name_pt: z.string().trim().min(1, "Informe o nome da marca em português.").max(120),
  brand_name_en: z.string().trim().min(1, "Informe o nome da marca em inglês.").max(120),
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
  support_whatsapp: z.string().trim().max(40).default("")
    .refine(v => v === "" || Boolean(whatsappDigits(v)), { message: "Informe um WhatsApp válido com código do país, como +55 11 99999-0000." })
    .transform(v => v === "" ? "" : whatsappDigits(v)),
  support_hours_pt: z.string().trim().max(160).default(""),
  support_hours_en: z.string().trim().max(160).default(""),
  maintenance_mode: z.boolean().default(false),
  maintenance_duration: z.coerce.number().int().min(1).max(8760).default(24),
  maintenance_duration_unit: z.enum(["hours", "days"]).default("hours"),
  signup_open: z.boolean().default(true),
  trial_days_default: z.coerce.number().int().min(0).max(0).default(0),
  revision: z.string().datetime({ offset: true }).nullable().optional(),
  restart_maintenance: z.boolean().default(false),
})

export type PlatformSettingsInput = z.input<typeof platformSettingsSchema>
export type PlatformSettingsData = z.output<typeof platformSettingsSchema>
