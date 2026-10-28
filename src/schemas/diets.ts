import { z } from "zod";
import type { MealTypeT } from "../lib/supabase/types";

const MEAL_TYPE_ARR = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
  "supper",
  "pre_workout",
  "post_workout",
  "water",
  "other",
] as const;

const mealTypeSchema = z.enum(MEAL_TYPE_ARR) as z.ZodType<MealTypeT>;

const uuidSchema = z.string().uuid({ message: "ID inválido." });

export const upsertDietProgramSchema = z.object({
  title_pt: z
    .string()
    .trim()
    .min(1, { message: "Título em português é obrigatório." }),
  title_en: z
    .string()
    .trim()
    .min(1, { message: "Título em inglês é obrigatório." }),
  daily_calories: z.coerce.number().int().min(500).max(10000).default(2000),
  protein_g: z.coerce.number().nonnegative().default(150),
  carbs_g: z.coerce.number().nonnegative().default(200),
  fats_g: z.coerce.number().nonnegative().default(70),
  fiber_g: z.coerce.number().nonnegative().default(25),
  sodium_mg: z.coerce.number().int().nonnegative().default(2300),
  water_liters: z.coerce.number().nonnegative().default(2.0),
  start_date: z
    .string()
    .trim()
    .min(1, { message: "Data de início é obrigatória." }),
  end_date: z.string().trim().optional().nullable(),
  is_active: z.boolean().default(true),
  restrictions_pt: z.array(z.string()).default([]),
  restrictions_en: z.array(z.string()).default([]),
  notes_pt: z.string().trim().optional().nullable(),
  notes_en: z.string().trim().optional().nullable(),
  id: uuidSchema.optional(),
});
export type UpsertDietProgramInput = z.infer<typeof upsertDietProgramSchema>;

export const upsertDietMealSchema = z.object({
  diet_id: uuidSchema,
  meal_type: mealTypeSchema,
  time_of_day: z
    .string()
    .trim()
    .min(1, { message: "Horário da refeição é obrigatório." }),
  order_index: z.coerce.number().int().default(0),
  name_pt: z
    .string()
    .trim()
    .min(1, { message: "Nome da refeição em português é obrigatório." }),
  name_en: z
    .string()
    .trim()
    .min(1, { message: "Nome da refeição em inglês é obrigatório." }),
  instructions_pt: z.string().trim().optional().nullable(),
  instructions_en: z.string().trim().optional().nullable(),
  calories_kcal: z.coerce.number().int().nonnegative().default(0),
  protein_g: z.coerce.number().nonnegative().default(0),
  carbs_g: z.coerce.number().nonnegative().default(0),
  fats_g: z.coerce.number().nonnegative().default(0),
  id: uuidSchema.optional(),
});
export type UpsertDietMealInput = z.infer<typeof upsertDietMealSchema>;

export const upsertDietMealItemSchema = z.object({
  meal_id: uuidSchema,
  order_index: z.coerce.number().int().default(0),
  name_pt: z
    .string()
    .trim()
    .min(1, { message: "Nome do item em português é obrigatório." }),
  name_en: z
    .string()
    .trim()
    .min(1, { message: "Nome do item em inglês é obrigatório." }),
  quantity: z.coerce
    .number()
    .positive({ message: "Quantidade deve ser maior que zero." }),
  unit: z.string().trim().min(1, { message: "Unidade é obrigatória." }),
  calories_kcal: z.coerce.number().int().nonnegative().default(0),
  protein_g: z.coerce.number().nonnegative().default(0),
  carbs_g: z.coerce.number().nonnegative().default(0),
  fats_g: z.coerce.number().nonnegative().default(0),
  alternatives_pt: z.array(z.string()).default([]),
  alternatives_en: z.array(z.string()).default([]),
  id: uuidSchema.optional(),
});
export type UpsertDietMealItemInput = z.infer<typeof upsertDietMealItemSchema>;

// ---------------------------------------------------------------------
// CATÁLOGO DE ALIMENTOS
// ---------------------------------------------------------------------
export const upsertDietFoodSchema = z.object({
  name_pt: z
    .string()
    .trim()
    .min(1, { message: "Nome em português é obrigatório." }),
  name_en: z
    .string()
    .trim()
    .min(1, { message: "Nome em inglês é obrigatório." }),
  category_pt: z
    .string()
    .trim()
    .min(1, { message: "Categoria em português é obrigatória." }),
  category_en: z
    .string()
    .trim()
    .min(1, { message: "Categoria em inglês é obrigatória." }),
  description_pt: z.string().trim().optional().nullable(),
  description_en: z.string().trim().optional().nullable(),
  serving_size: z.coerce
    .number()
    .positive({ message: "Tamanho da porção deve ser maior que zero." })
    .default(100),
  serving_unit: z
    .string()
    .trim()
    .min(1, { message: "Unidade da porção é obrigatória." })
    .default("g"),
  calories_kcal: z.coerce.number().nonnegative().default(0),
  protein_g: z.coerce.number().nonnegative().default(0),
  carbs_g: z.coerce.number().nonnegative().default(0),
  fats_g: z.coerce.number().nonnegative().default(0),
  fiber_g: z.coerce.number().nonnegative().default(0),
  brand: z.string().trim().optional().nullable(),
  image_url: z.string().url().optional().or(z.literal("")).nullable(),
  is_active: z.boolean().default(true),
  id: uuidSchema.optional(),
});
export type UpsertDietFoodInput = z.infer<typeof upsertDietFoodSchema>;

// ---------------------------------------------------------------------
// KITS DE DIETA
// ---------------------------------------------------------------------
export const upsertDietKitSchema = z.object({
  revision: z.number().int().positive().optional(),
  name_pt: z
    .string()
    .trim()
    .min(1, { message: "Nome em português é obrigatório." }),
  name_en: z
    .string()
    .trim()
    .min(1, { message: "Nome em inglês é obrigatório." }),
  slug: z.string().trim().optional().nullable(),
  description_pt: z.string().trim().optional().nullable(),
  description_en: z.string().trim().optional().nullable(),
  short_desc_pt: z.string().trim().optional().nullable(),
  short_desc_en: z.string().trim().optional().nullable(),
  cover_image_url: z.string().url().optional().or(z.literal("")).nullable(),
  goal_pt: z.string().trim().optional().nullable(),
  goal_en: z.string().trim().optional().nullable(),
  tags: z.array(z.string()).default([]),
  is_published: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  id: uuidSchema.optional(),
});
export type UpsertDietKitInput = z.infer<typeof upsertDietKitSchema>;

export const upsertDietKitItemSchema = z.object({
  food_id: z.string().uuid({ message: "Alimento inválido." }),
  quantity: z.coerce.number().positive().optional().nullable(),
  unit: z.string().trim().optional().nullable(),
  meal_type: mealTypeSchema,
  time_of_day: z.string().trim().optional().nullable(),
  notes_pt: z.string().trim().optional().nullable(),
  notes_en: z.string().trim().optional().nullable(),
  order_index: z.coerce.number().int().default(0),
  id: uuidSchema.optional(),
});
export type UpsertDietKitItemInput = z.infer<typeof upsertDietKitItemSchema>;

export const saveDietKitSchema = z.object({
  kit: upsertDietKitSchema,
  items: z.array(upsertDietKitItemSchema).default([]),
});
export type SaveDietKitInput = z.infer<typeof saveDietKitSchema>;

export const syncDietKitStudentsSchema = z.object({
  expected_fingerprint: z
    .string()
    .regex(/^[a-f0-9]{32}$/)
    .optional(),
  kit_id: z.string().uuid({ message: "Kit inválido." }),
  student_ids: z.array(z.string().uuid()).default([]),
  start_date: z.string().trim().optional().nullable(),
  end_date: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});
export type SyncDietKitStudentsInput = z.infer<
  typeof syncDietKitStudentsSchema
>;

export const syncStudentDietKitsSchema = z.object({
  expected_fingerprint: z
    .string()
    .regex(/^[a-f0-9]{32}$/)
    .optional(),
  student_id: z.string().uuid({ message: "ID do aluno inválido." }),
  kit_ids: z.array(z.string().uuid()).default([]),
  start_date: z.string().trim().optional().nullable(),
  end_date: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});
export type SyncStudentDietKitsInput = z.infer<
  typeof syncStudentDietKitsSchema
>;
