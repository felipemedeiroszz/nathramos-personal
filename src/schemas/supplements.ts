import { z } from "zod"

const uuidSchema = z.string().uuid({ message: "ID inválido." })

export const upsertSupplementSchema = z.object({
  name_pt: z.string().trim().min(1, { message: "Nome em português é obrigatório." }),
  name_en: z.string().trim().min(1, { message: "Nome em inglês é obrigatório." }),
  category_pt: z.string().trim().min(1, { message: "Categoria em português é obrigatória." }),
  category_en: z.string().trim().min(1, { message: "Categoria em inglês é obrigatória." }),
  description_pt: z.string().trim().optional().nullable(),
  description_en: z.string().trim().optional().nullable(),
  serving_size: z.coerce.number().positive({ message: "Tamanho da porção deve ser maior que zero." }),
  serving_unit: z.string().trim().min(1, { message: "Unidade da porção é obrigatória." }),
  suggested_times_pt: z.array(z.string()).default([]),
  suggested_times_en: z.array(z.string()).default([]),
  contraindications_pt: z.array(z.string()).default([]),
  contraindications_en: z.array(z.string()).default([]),
  benefits_pt: z.array(z.string()).default([]),
  benefits_en: z.array(z.string()).default([]),
  brand: z.string().trim().optional().nullable(),
  image_url: z.string().url().optional().or(z.literal("")).nullable(),
  is_active: z.boolean().default(true),
  id: uuidSchema.optional(),
})
export type UpsertSupplementInput = z.infer<typeof upsertSupplementSchema>

export const upsertUserSupplementSchema = z.object({
  user_id: z.string().uuid({ message: "ID do usuário inválido." }),
  supplement_id: z.string().uuid().optional().nullable(),
  name_pt_snapshot: z.string().trim().min(1, { message: "Nome do suplemento é obrigatório." }),
  dosage: z.coerce.number().positive({ message: "Dosagem deve ser maior que zero." }),
  dosage_unit: z.string().trim().min(1, { message: "Unidade da dosagem é obrigatória." }),
  frequency_per_day: z.coerce.number().int().min(1).default(1),
  times_of_day: z.array(z.string()).default([]),
  start_date: z.string().trim().min(1, { message: "Data de início é obrigatória." }),
  end_date: z.string().trim().optional().nullable(),
  is_active: z.boolean().default(true),
  notes: z.string().trim().optional().nullable(),
  id: uuidSchema.optional(),
})
export type UpsertUserSupplementInput = z.infer<typeof upsertUserSupplementSchema>
