import { createServiceClientSSR } from "../lib/supabase/server"
import type { ChatSenderT, MeetingStatusT } from "../lib/supabase/types"
import { AuditLogService } from "./AuditLogService"
import { NotificationService } from "./NotificationService"
import {
  ensureMentorshipRoomSchema,
  sendChatMessageSchema,
  updateMeetingStatusSchema,
  upsertMeetingSchema,
  type EnsureMentorshipRoomInput,
  type SendChatMessageInput,
  type UpdateMeetingStatusInput,
  type UpsertMeetingInput,
} from "../schemas/mentoring"

// ---------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------
export interface MentorshipRoomRow {
  id: string
  user_id: string
  coach_id: string | null
  is_active: boolean
  last_message_at: string | null
  unread_count_user: number
  unread_count_coach: number
  created_at: string
  updated_at: string
}

export interface ChatMessageRow {
  id: string
  room_id: string
  sender_id: string | null
  sender_type: ChatSenderT
  content: string
  attachments: unknown[]
  read_at: string | null
  delivered_at: string | null
  reply_to_id: string | null
  reactions: Record<string, unknown>
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
}

export interface MeetingRow {
  id: string
  user_id: string
  coach_id: string | null
  title_pt: string
  title_en: string
  description_pt: string | null
  description_en: string | null
  start_at: string
  end_at: string | null
  duration_min: number
  status: MeetingStatusT
  meeting_url: string | null
  meeting_platform: string
  reschedule_count: number
  cancel_reason: string | null
  notes_after: string | null
  recording_url: string | null
  created_by_id: string | null
  created_at: string
  updated_at: string
}

export interface MentorshipRoomListItem extends MentorshipRoomRow {
  student_name: string
  student_email: string | null
  student_avatar_url: string | null
  coach_name: string | null
  last_message_preview: string | null
  last_message_sender_type: ChatSenderT | null
  message_count: number
}

export interface MeetingWithStudent extends MeetingRow {
  student_name: string
  student_avatar_url: string | null
}

interface ProfileLite {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

// ---------------------------------------------------------------------
// SERVIÇO
// ---------------------------------------------------------------------
export class MentorshipService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  private static async getProfilesMap(ids: string[]): Promise<Map<string, ProfileLite>> {
    const map = new Map<string, ProfileLite>()
    const unique = Array.from(new Set(ids.filter(Boolean)))
    if (unique.length === 0) return map
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", unique)
      for (const p of ((data as ProfileLite[] | null) ?? [])) {
        map.set(p.id, p)
      }
    } catch {}
    return map
  }

  private static async getFallbackCoachId(excludeUserId?: string): Promise<string | null> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("profiles")
        .select("id")
        .in("role", ["coach", "admin"])
        .limit(1)
      if (excludeUserId) q = q.neq("id", excludeUserId)
      const { data } = await q.maybeSingle()
      return (data as { id: string } | null)?.id ?? null
    } catch {
      return null
    }
  }

  // -------------------------------------------------------------------
  // SALAS
  // -------------------------------------------------------------------
  static async listRooms(filters?: {
    search?: string
    onlyUnread?: boolean
    includeInactive?: boolean
  }): Promise<MentorshipRoomListItem[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("mentorship_rooms")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(300)
      if (!filters?.includeInactive) q = q.eq("is_active", true)

      const { data, error } = await q
      if (error || !data) return []
      const rooms = data as MentorshipRoomRow[]
      if (rooms.length === 0) return []

      const profilesMap = await this.getProfilesMap([
        ...rooms.map((r) => r.user_id),
        ...rooms.map((r) => r.coach_id).filter((id): id is string => !!id),
      ])

      const roomIds = rooms.map((r) => r.id)
      const lastByRoom = new Map<string, { content: string; sender_type: ChatSenderT; created_at: string }>()
      const countByRoom = new Map<string, number>()
      try {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("room_id, content, sender_type, created_at")
          .in("room_id", roomIds)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(2000)
        for (const m of ((msgs as any[] | null) ?? [])) {
          const roomId = m.room_id as string
          countByRoom.set(roomId, (countByRoom.get(roomId) ?? 0) + 1)
          if (!lastByRoom.has(roomId)) {
            lastByRoom.set(roomId, {
              content: m.content as string,
              sender_type: m.sender_type as ChatSenderT,
              created_at: m.created_at as string,
            })
          }
        }
      } catch {}

      let items: MentorshipRoomListItem[] = rooms.map((room) => {
        const profile = profilesMap.get(room.user_id)
        const last = lastByRoom.get(room.id)
        return {
          ...room,
          student_name: profile?.full_name ?? "Aluno",
          student_email: profile?.email ?? null,
          student_avatar_url: profile?.avatar_url ?? null,
          coach_name: room.coach_id ? profilesMap.get(room.coach_id)?.full_name ?? null : null,
          last_message_preview: last?.content ?? null,
          last_message_sender_type: last?.sender_type ?? null,
          message_count: countByRoom.get(room.id) ?? 0,
        }
      })

      const term = filters?.search?.trim().toLowerCase()
      if (term) {
        items = items.filter(
          (i) =>
            i.student_name.toLowerCase().includes(term) ||
            (i.student_email ?? "").toLowerCase().includes(term)
        )
      }
      if (filters?.onlyUnread) {
        items = items.filter((i) => i.unread_count_coach > 0)
      }

      return items
    } catch {
      return []
    }
  }

  static async getRoom(roomId: string): Promise<MentorshipRoomListItem | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("mentorship_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle()
      if (error || !data) return null
      const room = data as MentorshipRoomRow
      const profilesMap = await this.getProfilesMap(
        [room.user_id, room.coach_id].filter((id): id is string => !!id)
      )
      const profile = profilesMap.get(room.user_id)
      return {
        ...room,
        student_name: profile?.full_name ?? "Aluno",
        student_email: profile?.email ?? null,
        student_avatar_url: profile?.avatar_url ?? null,
        coach_name: room.coach_id ? profilesMap.get(room.coach_id)?.full_name ?? null : null,
        last_message_preview: null,
        last_message_sender_type: null,
        message_count: 0,
      }
    } catch {
      return null
    }
  }

  static async ensureRoomForUser(userId: string): Promise<MentorshipRoomRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data: existing } = await supabase
        .from("mentorship_rooms")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()
      if (existing) return existing as MentorshipRoomRow

      const coachId = await this.getFallbackCoachId(userId)
      const { data, error } = await supabase
        .from("mentorship_rooms")
        .insert({ user_id: userId, coach_id: coachId, is_active: true } as never)
        .select()
        .single()

      if (error || !data) {
        const { data: retry } = await supabase
          .from("mentorship_rooms")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle()
        return (retry as MentorshipRoomRow | null) ?? null
      }
      return data as MentorshipRoomRow
    } catch {
      return null
    }
  }

  static async ensureRoom(input: EnsureMentorshipRoomInput): Promise<MentorshipRoomRow | null> {
    const parsed = ensureMentorshipRoomSchema.parse(input)
    return this.ensureRoomForUser(parsed.student_id)
  }

  static async getRoomForStudent(userId: string): Promise<MentorshipRoomListItem | null> {
    const room = await this.ensureRoomForUser(userId)
    if (!room) return null
    return this.getRoom(room.id)
  }

  static async countUnreadForCoach(): Promise<number> {
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("mentorship_rooms")
        .select("unread_count_coach")
        .eq("is_active", true)
      return ((data as { unread_count_coach: number }[] | null) ?? []).reduce(
        (acc, r) => acc + (r.unread_count_coach ?? 0),
        0
      )
    } catch {
      return 0
    }
  }

  // -------------------------------------------------------------------
  // MENSAGENS
  // -------------------------------------------------------------------
  static async listMessages(
    roomId: string,
    options?: { limit?: number }
  ): Promise<ChatMessageRow[]> {
    try {
      const supabase = await this.getSupabase()
      const limit = options?.limit ?? 100
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error || !data) return []
      return (data as ChatMessageRow[]).slice().reverse()
    } catch {
      return []
    }
  }

  static async listMessagesAfter(roomId: string, afterIso: string): Promise<ChatMessageRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .eq("is_deleted", false)
        .gt("created_at", afterIso)
        .order("created_at", { ascending: true })
        .limit(200)
      if (error || !data) return []
      return data as ChatMessageRow[]
    } catch {
      return []
    }
  }

  static async sendMessage(
    input: SendChatMessageInput,
    senderId: string,
    senderType: ChatSenderT
  ): Promise<ChatMessageRow | null> {
    try {
      const parsed = sendChatMessageSchema.parse(input)
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          room_id: parsed.room_id,
          sender_id: senderId,
          sender_type: senderType,
          content: parsed.content,
          reply_to_id: parsed.reply_to_id ?? null,
          delivered_at: new Date().toISOString(),
        } as never)
        .select()
        .single()
      if (error || !data) return null

      const message = data as ChatMessageRow
      const room = await this.getRoom(parsed.room_id)
      if (room) {
        const isCoachSide = senderType === "coach" || senderType === "system"
        await supabase
          .from("mentorship_rooms")
          .update({
            last_message_at: message.created_at,
            unread_count_user: isCoachSide ? (room.unread_count_user ?? 0) + 1 : 0,
            unread_count_coach: isCoachSide ? 0 : (room.unread_count_coach ?? 0) + 1,
          } as never)
          .eq("id", parsed.room_id)

        const recipientId = isCoachSide ? room.user_id : room.coach_id
        if (recipientId && recipientId !== senderId) {
          void NotificationService.sendInApp(recipientId, {
            type: "chat",
            title_pt: isCoachSide ? "Nova mensagem da sua mentoria" : "Nova mensagem de um aluno",
            title_en: isCoachSide
              ? "New message from your mentorship"
              : "New message from a student",
            body_pt: parsed.content.slice(0, 140),
            body_en: parsed.content.slice(0, 140),
            url: isCoachSide ? "/conversas" : "/admin/mentoria",
          })
        }
      }

      return message
    } catch {
      return null
    }
  }

  static async markRoomRead(roomId: string, viewer: ChatSenderT): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const isCoachSide = viewer === "coach" || viewer === "system"

      await supabase
        .from("mentorship_rooms")
        .update((isCoachSide
          ? { unread_count_coach: 0 }
          : { unread_count_user: 0 }) as never)
        .eq("id", roomId)

      await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() } as never)
        .eq("room_id", roomId)
        .is("read_at", null)
        .neq("sender_type", viewer)

      return true
    } catch {
      return false
    }
  }

  static async setRoomActive(roomId: string, isActive: boolean, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("mentorship_rooms")
        .update({ is_active: isActive } as never)
        .eq("id", roomId)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: isActive ? "mentorship_room.activate" : "mentorship_room.deactivate",
        entity_type: "mentorship_room",
        entity_id: roomId,
      })
      return true
    } catch {
      return false
    }
  }

  // -------------------------------------------------------------------
  // REUNIÕES
  // -------------------------------------------------------------------
  static async listMeetings(filters?: {
    userId?: string
    status?: MeetingStatusT | ""
    search?: string
    upcomingOnly?: boolean
    limit?: number
  }): Promise<MeetingWithStudent[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("meetings")
        .select("*")
        .order("start_at", { ascending: true })
        .limit(filters?.limit ?? 200)

      if (filters?.userId) q = q.eq("user_id", filters.userId)
      if (filters?.status) q = q.eq("status", filters.status)
      if (filters?.upcomingOnly) {
        q = q.gte("start_at", new Date().toISOString()).neq("status", "canceled")
      }

      const { data, error } = await q
      if (error || !data) return []
      const meetings = data as MeetingRow[]
      if (meetings.length === 0) return []

      const profilesMap = await this.getProfilesMap(meetings.map((m) => m.user_id))
      let items: MeetingWithStudent[] = meetings.map((m) => ({
        ...m,
        student_name: profilesMap.get(m.user_id)?.full_name ?? "Aluno",
        student_avatar_url: profilesMap.get(m.user_id)?.avatar_url ?? null,
      }))

      const term = filters?.search?.trim().toLowerCase()
      if (term) {
        items = items.filter(
          (m) =>
            m.student_name.toLowerCase().includes(term) ||
            m.title_pt.toLowerCase().includes(term) ||
            m.title_en.toLowerCase().includes(term)
        )
      }
      return items
    } catch {
      return []
    }
  }

  static async upsertMeeting(
    input: UpsertMeetingInput,
    createdById?: string
  ): Promise<MeetingRow | null> {
    try {
      const parsed = upsertMeetingSchema.parse(input)
      const supabase = await this.getSupabase()

      const start = new Date(parsed.start_at)
      if (Number.isNaN(start.getTime())) {
        throw new Error("Data e hora inválidas.")
      }
      const end = new Date(start.getTime() + parsed.duration_min * 60_000)

      const payload: Record<string, unknown> = {
        user_id: parsed.user_id,
        title_pt: parsed.title_pt,
        title_en: parsed.title_en,
        description_pt: parsed.description_pt ?? null,
        description_en: parsed.description_en ?? null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        duration_min: parsed.duration_min,
        status: parsed.status,
        meeting_url: parsed.meeting_url ?? null,
        meeting_platform: parsed.meeting_platform,
        cancel_reason: parsed.cancel_reason ?? null,
      }

      let q: any
      if (parsed.id) {
        q = supabase.from("meetings").update(payload as never).eq("id", parsed.id)
      } else {
        const coachId = createdById ?? (await this.getFallbackCoachId(parsed.user_id))
        payload.coach_id = coachId
        payload.created_by_id = createdById ?? null
        q = supabase.from("meetings").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null
      const meeting = data as MeetingRow

      void AuditLogService.log({
        adminId: createdById,
        action: parsed.id ? "meeting.update" : "meeting.create",
        entity_type: "meeting",
        entity_id: meeting.id,
        details: { user_id: meeting.user_id, start_at: meeting.start_at },
      })

      void NotificationService.sendInApp(meeting.user_id, {
        type: "meeting",
        title_pt: parsed.id ? "Reunião atualizada" : "Nova reunião agendada",
        title_en: parsed.id ? "Meeting updated" : "New meeting scheduled",
        body_pt: `${meeting.title_pt} — ${new Date(meeting.start_at).toLocaleString("pt-BR")}`,
        body_en: `${meeting.title_en} — ${new Date(meeting.start_at).toLocaleString("en-US")}`,
        url: "/conversas",
      })

      return meeting
    } catch {
      return null
    }
  }

  static async updateMeetingStatus(input: UpdateMeetingStatusInput): Promise<MeetingRow | null> {
    try {
      const parsed = updateMeetingStatusSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, unknown> = { status: parsed.status }
      if (parsed.status === "canceled") {
        payload.cancel_reason = parsed.cancel_reason ?? null
      }
      if (parsed.status === "rescheduled") {
        const current = await supabase
          .from("meetings")
          .select("reschedule_count")
          .eq("id", parsed.id)
          .maybeSingle()
        const count = (current.data as { reschedule_count: number } | null)?.reschedule_count ?? 0
        payload.reschedule_count = count + 1
      }

      const { data, error } = await supabase
        .from("meetings")
        .update(payload as never)
        .eq("id", parsed.id)
        .select()
        .single()
      if (error || !data) return null

      const meeting = data as MeetingRow
      void AuditLogService.log({
        action: `meeting.${parsed.status}`,
        entity_type: "meeting",
        entity_id: meeting.id,
        details: { status: parsed.status, cancel_reason: parsed.cancel_reason ?? null },
      })

      void NotificationService.sendInApp(meeting.user_id, {
        type: "meeting",
        title_pt: "Status da reunião atualizado",
        title_en: "Meeting status updated",
        body_pt: `${meeting.title_pt} — ${parsed.status}`,
        body_en: `${meeting.title_en} — ${parsed.status}`,
        url: "/conversas",
      })

      return meeting
    } catch {
      return null
    }
  }

  static async deleteMeeting(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("meetings").delete().eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "meeting.delete",
        entity_type: "meeting",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }
}
