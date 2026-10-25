import { z } from "zod"

export const CONTENT_PAGE_SLUGS = ["termos", "privacidade", "faq"] as const

export type ContentPageSlugT = (typeof CONTENT_PAGE_SLUGS)[number]

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable()

export const contentPageBlockSchema = z.object({
  id: z.string().trim().min(1, { message: "Bloco inválido." }).max(80),
  title_pt: optionalText(300),
  title_en: optionalText(300),
  subtitle_pt: optionalText(300),
  subtitle_en: optionalText(300),
  text_pt: optionalText(20000),
  text_en: optionalText(20000),
  image_url: optionalText(800),
  button_label_pt: optionalText(120),
  button_label_en: optionalText(120),
  button_url: optionalText(800),
})

export type ContentPageBlockInput = z.infer<typeof contentPageBlockSchema>

export const upsertContentPageSchema = z.object({
  slug: z.enum(CONTENT_PAGE_SLUGS),
  title_pt: optionalText(300),
  title_en: optionalText(300),
  subtitle_pt: optionalText(300),
  subtitle_en: optionalText(300),
  image_url: optionalText(800),
  cta_label_pt: optionalText(120),
  cta_label_en: optionalText(120),
  cta_url: optionalText(800),
  blocks: z.array(contentPageBlockSchema).max(80).default([]),
  is_active: z.boolean().default(true),
})

export type UpsertContentPageInput = z.infer<typeof upsertContentPageSchema>
