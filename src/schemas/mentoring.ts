import { z } from "zod"
import type { MeetingStatusT } from "../lib/supabase/types"

const uuidSchema = z.string().uuid({ message: "ID inválido." })

export const MEETING_STATUS_ARR = [
  "scheduled",
  "confirmed",
  "rescheduled",
  "canceled",
  "completed",
  "no_show",
] as const

const meetingStatusSchema = z.enum(MEETING_STATUS_ARR) as z.ZodType<MeetingStatusT>

// ---------------------------------------------------------------------
// CHAT
// ---------------------------------------------------------------------
export const sendChatMessageSchema = z.object({
  room_id: uuidSchema,
  content: z
    .string()
    .trim()
    .min(1, { message: "Escreva uma mensagem." })
    .max(4000, { message: "Mensagem muito longa (máx. 4000 caracteres)." }),
  reply_to_id: uuidSchema.optional().nullable(),
})
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>

export const ensureMentorshipRoomSchema = z.object({
  student_id: uuidSchema,
})
export type EnsureMentorshipRoomInput = z.infer<typeof ensureMentorshipRoomSchema>

// ---------------------------------------------------------------------
// REUNIÕES
// ---------------------------------------------------------------------
export const upsertMeetingSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  title_pt: z.string().trim().min(1, { message: "Título em português é obrigatório." }).max(160),
  title_en: z.string().trim().min(1, { message: "Título em inglês é obrigatório." }).max(160),
  description_pt: z.string().trim().optional().nullable(),
  description_en: z.string().trim().optional().nullable(),
  start_at: z.string().trim().min(1, { message: "Data e hora são obrigatórias." }),
  duration_min: z.coerce.number().int().min(5).max(480).default(60),
  status: meetingStatusSchema.default("scheduled"),
  meeting_url: z.string().trim().optional().nullable(),
  meeting_platform: z.string().trim().min(1).default("google_meet"),
  cancel_reason: z.string().trim().optional().nullable(),
})
export type UpsertMeetingInput = z.infer<typeof upsertMeetingSchema>

export const updateMeetingStatusSchema = z.object({
  id: uuidSchema,
  status: meetingStatusSchema,
  cancel_reason: z.string().trim().optional().nullable(),
})
export type UpdateMeetingStatusInput = z.infer<typeof updateMeetingStatusSchema>
