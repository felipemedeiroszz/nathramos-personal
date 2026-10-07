import { z } from "zod"

const emailSchema = z
  .string({ required_error: "Email é obrigatório." })
  .min(5, { message: "Email muito curto." })
  .email({ message: "Digite um e-mail válido." })
  .trim()
  .toLowerCase()

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Senha é obrigatória." })
    .min(6, { message: "Senha deve ter pelo menos 6 caracteres." }),
  remember: z.boolean().optional().default(false),
})

export type LoginInput = z.infer<typeof loginSchema>

export const signUpSchema = z.object({
  first_name: z
    .string({ required_error: "Nome é obrigatório." })
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres." })
    .max(60, { message: "Nome muito longo." })
    .trim(),
  last_name: z
    .string({ required_error: "Sobrenome é obrigatório." })
    .min(2, { message: "Sobrenome deve ter pelo menos 2 caracteres." })
    .max(60, { message: "Sobrenome muito longo." })
    .trim(),
  phone: z
    .string({ required_error: "Telefone é obrigatório." })
    .refine(
      (v) => v === "" || /^(\+?\d{10,15})$/.test(String(v).replace(/\D/g, "")),
      { message: "Telefone inválido." }
    ),
  email: emailSchema,
  password: z
    .string({ required_error: "Senha é obrigatória." })
    .min(8, { message: "Senha deve ter pelo menos 8 caracteres." })
    .max(128, { message: "Senha muito longa." })
    .regex(/[A-Za-z]/, { message: "Senha deve conter letras." })
    .regex(/[0-9]/, { message: "Senha deve conter pelo menos 1 número." }),
  confirmPassword: z.string(),
  birth_date: z
    .string({ required_error: "Data de nascimento é obrigatória." })
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Data inválida." }),
  gender: z.enum(["M", "F", "O"], { required_error: "Sexo é obrigatório." }),
  height_cm: z.coerce
    .number({ required_error: "Altura é obrigatória.", invalid_type_error: "Altura deve ser um número." })
    .min(50, { message: "Altura mínima 50." })
    .max(300, { message: "Altura máxima 300." }),
  weight_kg: z.coerce
    .number({ required_error: "Peso é obrigatório.", invalid_type_error: "Peso deve ser um número." })
    .min(20)
    .max(400),
  country: z
    .string({ required_error: "País é obrigatório." })
    .min(2, { message: "Selecione um país." })
    .max(60),
  language: z.enum(["pt-BR", "en-US"]).default("pt-BR"),
  accepts_terms: z
    .coerce.boolean({ required_error: "Você deve aceitar os Termos de Uso." })
    .refine((v) => v === true, { message: "Você deve aceitar os Termos de Uso." }),
  accepts_privacy: z
    .coerce.boolean({ required_error: "Você deve aceitar a Política de Privacidade." })
    .refine((v) => v === true, { message: "Você deve aceitar a Política de Privacidade." }),
})
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  })

export type SignUpInput = z.infer<typeof signUpSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  password: z
    .string({ required_error: "Senha é obrigatória." })
    .min(8, { message: "Senha deve ter pelo menos 8 caracteres." })
    .max(128, { message: "Senha muito longa." })
    .regex(/[A-Za-z]/, { message: "Senha deve conter letras." })
    .regex(/[0-9]/, { message: "Senha deve conter pelo menos 1 número." }),
  confirmPassword: z.string(),
})
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const updateProfileSchema = z.object({
  full_name: z.string().min(3).max(120).trim(),
  display_name: z.string().min(2).max(60).trim().optional().or(z.literal("")),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => v == null || v === "" || /^(\+?\d{10,15})$/.test(v.replace(/\D/g, "")),
      { message: "Telefone inválido." }
    ),
  gender: z.enum(["M","F","O",""]).optional().default(""),
  birth_date: z
    .string()
    .refine((s) => s === "" || !Number.isNaN(Date.parse(s)), { message: "Data inválida." })
    .optional()
    .or(z.literal("")),
  language: z.enum(["pt-BR","en-US"]).default("pt-BR"),
  timezone: z.string().min(3).default("America/Sao_Paulo"),
  currency: z.enum(["BRL","USD"]).default("BRL"),
  height_cm: z.coerce
    .number({ invalid_type_error: "Altura deve ser um número." })
    .min(0, { message: "Altura mínima 0." })
    .max(300, { message: "Altura máxima 300." })
    .nullish(),
  weight_kg: z.coerce
    .number({ invalid_type_error: "Peso deve ser um número." })
    .min(0)
    .max(400)
    .nullish(),
  body_fat_pct: z.coerce.number().min(0).max(70).nullish(),
  primary_goal: z.string().max(200).optional().or(z.literal("")),
  training_level: z.enum(["beginner","intermediate","advanced"]).nullish(),
  medical_conditions: z.array(z.string()).default([]),
  food_restrictions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
