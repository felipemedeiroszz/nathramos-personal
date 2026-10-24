import { z } from "zod"

export const NOTIFICATION_TYPES = [
  "system",
  "payment",
  "workout",
  "diet",
  "supplement",
  "hydration",
  "sleep",
  "exam",
  "ebook",
  "chat",
  "meeting",
  "performance",
  "reminder",
  "marketing",
] as const

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .or(z.literal(""))

export const sendNotificationSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  title_pt: z.string().trim().min(1, "Informe o título em português.").max(120),
  title_en: z.string().trim().min(1, "Informe o título em inglês.").max(120),
  body_pt: z.string().trim().min(1, "Informe a mensagem em português.").max(500),
  body_en: z.string().trim().min(1, "Informe a mensagem em inglês.").max(500),
  url: optionalUrl,
})

export const templateSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Informe o identificador.")
    .max(80)
    .regex(/^[a-z0-9_-]+$/, "Use apenas letras minúsculas, números, hífen e underline."),
  type: z.enum(NOTIFICATION_TYPES),
  title_pt: z.string().trim().min(1, "Informe o título em português.").max(120),
  title_en: z.string().trim().min(1, "Informe o título em inglês.").max(120),
  body_pt: z.string().trim().min(1, "Informe a mensagem em português.").max(500),
  body_en: z.string().trim().min(1, "Informe a mensagem em inglês.").max(500),
  default_url: optionalUrl,
})

const timeString = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.")

export const notifySettingsSchema = z.object({
  push_enabled: z.boolean(),
  quiet_hours_start: timeString.nullable(),
  quiet_hours_end: timeString.nullable(),
})

export const notificationPreferencesSchema = z.object({
  email: z.record(z.boolean()),
  push: z.record(z.boolean()),
})

export type SendNotificationInput = z.input<typeof sendNotificationSchema>
export type TemplateInput = z.input<typeof templateSchema>
export type NotifySettingsInput = z.input<typeof notifySettingsSchema>
export type NotificationPreferencesInput = z.input<typeof notificationPreferencesSchema>
