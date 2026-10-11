import { z } from "zod"

const uuidSchema = z.string().uuid({ message: "ID inválido." })

export const upsertExamCategorySchema = z.object({
  name_pt: z.string().trim().min(1, { message: "Nome em português é obrigatório." }),
  name_en: z.string().trim().min(1, { message: "Nome em inglês é obrigatório." }),
  order_index: z.coerce.number().int().default(0),
  id: uuidSchema.optional(),
})
export type UpsertExamCategoryInput = z.infer<typeof upsertExamCategorySchema>

export const upsertExamSchema = z.object({
  user_id: z.string().uuid({ message: "ID do usuário inválido." }),
  category_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, { message: "Título do exame é obrigatório." }),
  exam_date: z.string().trim().min(1, { message: "Data do exame é obrigatória." }),
  lab_name: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  file_bucket_path: z.string().trim().optional().nullable(),
  file_name: z.string().trim().optional().nullable(),
  file_size_bytes: z.coerce.number().int().nonnegative().optional().nullable(),
  file_mime_type: z.string().trim().optional().nullable(),
  results_summary: z.record(z.unknown()).default({}),
  id: uuidSchema.optional(),
})
export type UpsertExamInput = z.infer<typeof upsertExamSchema>
