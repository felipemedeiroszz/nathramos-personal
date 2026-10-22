import { z } from "zod"
import type { LocaleT } from "../lib/supabase/types"

const LOCALE_ARR = ["pt-BR", "en-US"] as const
const localeSchema = z.enum(LOCALE_ARR) as z.ZodType<LocaleT>
const CURRENCY_ARR = ["BRL", "USD"] as const

const uuidSchema = z.string().uuid({ message: "ID inválido." })

export const upsertEbookSchema = z.object({
  title_pt: z.string().trim().min(1, { message: "Título em português é obrigatório." }),
  title_en: z.string().trim().min(1, { message: "Título em inglês é obrigatório." }),
  slug: z.string().trim().min(1, { message: "Slug é obrigatório." }),
  summary_pt: z.string().trim().optional().nullable(),
  summary_en: z.string().trim().optional().nullable(),
  cover_url: z.string().url().optional().or(z.literal("")).nullable(),
  file_bucket_path: z.string().trim().optional().nullable(),
  external_url: z.string().url({ message: "URL do e-book inválida." }).optional().or(z.literal("")).nullable(),
  pages_count: z.coerce.number().int().nonnegative().optional().nullable(),
  language: localeSchema.default("pt-BR"),
  is_free: z.boolean().default(false),
  price_cents: z.coerce.number().int().nonnegative().default(0),
  currency: z.enum(CURRENCY_ARR).default("BRL"),
  min_plan_id: z.string().uuid().optional().nullable(),
  publish_at: z.string().trim().optional().nullable(),
  is_published: z.boolean().default(false),
  categories_pt: z.array(z.string()).default([]),
  categories_en: z.array(z.string()).default([]),
  author: z.string().trim().optional().nullable(),
  id: uuidSchema.optional(),
})
export type UpsertEbookInput = z.infer<typeof upsertEbookSchema>
