import { z } from "zod"

export const SOCIAL_PLATFORMS = [
  "instagram",
  "youtube",
  "tiktok",
  "facebook",
  "whatsapp",
  "x",
  "linkedin",
  "pinterest",
  "threads",
  "other",
] as const

export type SocialPlatformT = (typeof SOCIAL_PLATFORMS)[number]

const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS)

export const upsertSocialLinkSchema = z.object({
  id: z.string().uuid({ message: "ID inválido." }).optional(),
  platform: socialPlatformSchema.default("other"),
  label_pt: z.string().trim().max(120).optional().nullable(),
  label_en: z.string().trim().max(120).optional().nullable(),
  handle: z.string().trim().max(120).optional().nullable(),
  icon_url: z.string().trim().max(500).optional().nullable(),
  url: z
    .string()
    .trim()
    .min(1, { message: "Informe o link." })
    .max(500)
    .url({ message: "Informe uma URL válida (ex.: https://instagram.com/usuario)." }),
  is_active: z.boolean().default(true),
})
export type UpsertSocialLinkInput = z.infer<typeof upsertSocialLinkSchema>

export const reorderSocialLinksSchema = z.object({
  ids: z.array(z.string().uuid({ message: "ID inválido." })).min(1),
})
export type ReorderSocialLinksInput = z.infer<typeof reorderSocialLinksSchema>
