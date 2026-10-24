import { createServiceClientSSR } from "../lib/supabase/server"
import type { NotificationTypeT, LocaleT } from "../lib/supabase/types"
import { PushService } from "./PushService"
import { getZonedParts, isWithinQuietHours } from "../lib/notifications/time"
import { NOTIFICATION_TYPES } from "@/schemas/notifications"

/** Tipos considerados transacionais: ignoram a janela de silêncio. */
export const ALWAYS_PUSH_TYPES: NotificationTypeT[] = ["system", "payment", "chat", "meeting"]

export interface SendInAppPayload {
  type: NotificationTypeT
  title_pt: string
  title_en?: string
  body_pt: string
  body_en?: string
  url?: string
  scheduled_for?: string
  image_url?: string
  payload?: Record<string, unknown>
}

/** Preferências de canal por tipo de notificação. */
export interface NotificationPreferences {
  email: Partial<Record<NotificationTypeT, boolean>>
  push: Partial<Record<NotificationTypeT, boolean>>
}

export interface NotifySettings {
  push_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export interface NotificationRow {
  id: string
  user_id: string
  template_id?: string | null
  type: NotificationTypeT
  title: string
  body: string
  image_url?: string | null
  url?: string | null
  payload?: Record<string, unknown> | null
  scheduled_for?: string | null
  sent_at?: string | null
  read_at?: string | null
  clicked_at?: string | null
  error_text?: string | null
  provider?: string | null
  push_delivery_count?: number
  created_at: string
}

/** Notificação com o nome do destinatário (visão administrativa). */
export interface AdminNotificationRow extends NotificationRow {
  recipient_name?: string | null
}

export interface NotificationTemplateRow {
  id: string
  slug: string
  type: NotificationTypeT
  title_pt: string
  title_en: string
  body_pt: string
  body_en: string
  default_url?: string | null
  click_action?: string | null
  tag?: string | null
  icon_path?: string | null
  created_at: string
}

export interface TemplateInput {
  id?: string
  slug: string
  type: NotificationTypeT
  title_pt: string
  title_en: string
  body_pt: string
  body_en: string
  default_url?: string | null
}

export class NotificationService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  private static async getUserLocale(userId: string): Promise<LocaleT> {
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", userId)
        .maybeSingle()
      const lang = (data as any)?.language
      return lang === "en-US" ? "en-US" : "pt-BR"
    } catch {
      return "pt-BR"
    }
  }

  /**
   * Cria a notificação in-app e, quando imediata, dispara o Web Push
   * respeitando preferências e janela de silêncio do usuário.
   */
  static async send(
    userId: string,
    payload: SendInAppPayload
  ): Promise<{ inApp: boolean; push: number; notificationId: string | null }> {
    try {
      const supabase = await this.getSupabase()
      const locale = await this.getUserLocale(userId)
      const isEn = locale === "en-US"

      const title = isEn ? (payload.title_en ?? payload.title_pt) : payload.title_pt
      const body = isEn ? (payload.body_en ?? payload.body_pt) : payload.body_pt

      const now = new Date().toISOString()
      const hasScheduled = !!payload.scheduled_for

      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: payload.type,
          title,
          body,
          image_url: payload.image_url ?? null,
          url: payload.url ?? null,
          payload: (payload.payload ?? {}) as Record<string, unknown>,
          scheduled_for: payload.scheduled_for ?? null,
          sent_at: hasScheduled ? null : now,
        } as never)
        .select("id")
        .maybeSingle()

      if (error) return { inApp: false, push: 0, notificationId: null }

      const notificationId = (data as { id: string } | null)?.id ?? null
      if (hasScheduled || !notificationId) {
        return { inApp: true, push: 0, notificationId }
      }

      const push = await this.deliverPush(userId, notificationId, {
        title,
        body,
        url: payload.url ?? null,
        type: payload.type,
        image_url: payload.image_url ?? null,
      })

      return { inApp: true, push, notificationId }
    } catch {
      return { inApp: false, push: 0, notificationId: null }
    }
  }

  /** Compatibilidade: apenas cria a notificação in-app. */
  static async sendInApp(userId: string, payload: SendInAppPayload): Promise<boolean> {
    const result = await this.send(userId, payload)
    return result.inApp
  }

  /**
   * Dispara o push de uma notificação já persistida.
   * Retorna a quantidade de dispositivos entregues.
   */
  static async deliverPush(
    userId: string,
    notificationId: string,
    payload: {
      title: string
      body: string
      url?: string | null
      type: NotificationTypeT
      image_url?: string | null
    }
  ): Promise<number> {
    try {
      if (!PushService.isConfigured()) return 0

      const supabase = await this.getSupabase()
      const { data: profile } = await supabase
        .from("profiles")
        .select("push_enabled, timezone, quiet_hours_start, quiet_hours_end")
        .eq("id", userId)
        .maybeSingle()

      const p = (profile ?? {}) as {
        push_enabled?: boolean
        timezone?: string
        quiet_hours_start?: string | null
        quiet_hours_end?: string | null
      }

      if (p.push_enabled === false) return 0

      const prefs = await this.getPreferences(userId)
      if (prefs.push[payload.type] === false) return 0

      if (!ALWAYS_PUSH_TYPES.includes(payload.type)) {
        const parts = getZonedParts(new Date(), p.timezone)
        const inQuiet = isWithinQuietHours(
          parts.hour * 60 + parts.minute,
          p.quiet_hours_start,
          p.quiet_hours_end
        )
        if (inQuiet) return 0
      }

      const result = await PushService.sendToUser(userId, {
        title: payload.title,
        body: payload.body,
        url: payload.url,
        type: payload.type,
        tag: payload.type,
        notification_id: notificationId,
        image_url: payload.image_url ?? null,
      })

      try {
        await supabase
          .from("notifications")
          .update({
            provider: result.sent > 0 ? "webpush" : null,
            push_delivery_count: result.sent,
          } as never)
          .eq("id", notificationId)
      } catch {
        /* noop */
      }

      return result.sent
    } catch {
      return 0
    }
  }

  /** Preferências de canal por tipo (defaults = habilitado). */
  static async getPreferences(userId: string): Promise<NotificationPreferences> {
    const email: Partial<Record<NotificationTypeT, boolean>> = {}
    const push: Partial<Record<NotificationTypeT, boolean>> = {}
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()
      const row = (data ?? {}) as Record<string, unknown>
      for (const type of NOTIFICATION_TYPES) {
        const e = row[`email_${type}`]
        const p = row[`push_${type}`]
        email[type] = typeof e === "boolean" ? e : true
        push[type] = typeof p === "boolean" ? p : true
      }
    } catch {
      for (const type of NOTIFICATION_TYPES) {
        email[type] = true
        push[type] = true
      }
    }
    return { email, push }
  }

  static async savePreferences(
    userId: string,
    prefs: NotificationPreferences
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const record: Record<string, unknown> = { user_id: userId }
      for (const type of NOTIFICATION_TYPES) {
        if (typeof prefs.email[type] === "boolean") record[`email_${type}`] = prefs.email[type]
        if (typeof prefs.push[type] === "boolean") record[`push_${type}`] = prefs.push[type]
      }
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(record as never, { onConflict: "user_id" })
      return !error
    } catch {
      return false
    }
  }

  /** Configurações gerais de notificação do perfil (push + janela de silêncio). */
  static async getNotifySettings(userId: string): Promise<NotifySettings> {
    try {
      const supabase = await this.getSupabase()
      const { data } = await supabase
        .from("profiles")
        .select("push_enabled, quiet_hours_start, quiet_hours_end")
        .eq("id", userId)
        .maybeSingle()
      const row = (data ?? {}) as {
        push_enabled?: boolean
        quiet_hours_start?: string | null
        quiet_hours_end?: string | null
      }
      return {
        push_enabled: row.push_enabled ?? true,
        quiet_hours_start: row.quiet_hours_start ?? null,
        quiet_hours_end: row.quiet_hours_end ?? null,
      }
    } catch {
      return { push_enabled: true, quiet_hours_start: null, quiet_hours_end: null }
    }
  }

  static async saveNotifySettings(
    userId: string,
    settings: NotifySettings
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("profiles")
        .update({
          push_enabled: settings.push_enabled,
          quiet_hours_start: settings.quiet_hours_start,
          quiet_hours_end: settings.quiet_hours_end,
        } as never)
        .eq("id", userId)
      return !error
    } catch {
      return false
    }
  }

  static async markRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as never)
        .eq("id", notificationId)
        .eq("user_id", userId)
      if (error) return false
      return true
    } catch {
      return false
    }
  }

  static async listForUser(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 50
  ): Promise<NotificationRow[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit)
      if (unreadOnly) q = q.is("read_at", null)
      const { data, error } = await q
      if (error) return []
      return (data as NotificationRow[]) ?? []
    } catch {
      return []
    }
  }

  static async unreadCount(userId: string): Promise<number> {
    try {
      const supabase = await this.getSupabase()
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null)
      if (error) return 0
      return count ?? 0
    } catch {
      return 0
    }
  }

  /** Marca todas as notificações do usuário como lidas. */
  static async markAllRead(userId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as never)
        .eq("user_id", userId)
        .is("read_at", null)
      if (error) return false
      return true
    } catch {
      return false
    }
  }

  /** Quantidade de alunos ativos (destinatários do envio em massa). */
  static async countStudents(): Promise<number> {
    try {
      const supabase = await this.getSupabase()
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student")
        .eq("is_deleted", false)
      if (error) return 0
      return count ?? 0
    } catch {
      return 0
    }
  }

  /** Histórico administrativo de notificações com nome do destinatário. */
  static async listHistory(
    opts: { limit?: number; offset?: number } = {}
  ): Promise<{ rows: AdminNotificationRow[]; total: number }> {
    try {
      const supabase = await this.getSupabase()
      const limit = opts.limit ?? 50
      const offset = opts.offset ?? 0
      const { data, count, error } = await supabase
        .from("notifications")
        .select("*, profiles(full_name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)
      if (error) return { rows: [], total: 0 }
      const rows = ((data as any[]) ?? []).map((row) => ({
        ...row,
        recipient_name: row?.profiles?.full_name ?? null,
      })) as AdminNotificationRow[]
      return { rows, total: count ?? 0 }
    } catch {
      return { rows: [], total: 0 }
    }
  }

  /** Envia a mesma notificação para todos os alunos, respeitando o idioma de cada um. */
  static async broadcastToStudents(
    payload: SendInAppPayload
  ): Promise<{ sent: number; total: number }> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("profiles")
        .select("id, language")
        .eq("role", "student")
        .eq("is_deleted", false)
      if (error || !data) return { sent: 0, total: 0 }

      const students = data as { id: string; language: string | null }[]
      const now = new Date().toISOString()
      const hasScheduled = !!payload.scheduled_for

      const rows = students.map((student) => {
        const isEn = student.language === "en-US"
        return {
          user_id: student.id,
          type: payload.type,
          title: isEn ? (payload.title_en ?? payload.title_pt) : payload.title_pt,
          body: isEn ? (payload.body_en ?? payload.body_pt) : payload.body_pt,
          image_url: payload.image_url ?? null,
          url: payload.url ?? null,
          payload: (payload.payload ?? {}) as Record<string, unknown>,
          scheduled_for: payload.scheduled_for ?? null,
          sent_at: hasScheduled ? null : now,
        }
      })

      if (rows.length === 0) return { sent: 0, total: 0 }

      const CHUNK = 500
      let sent = 0
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const { error: insertError } = await supabase
          .from("notifications")
          .insert(chunk as never)
        if (insertError) return { sent, total: students.length }
        sent += chunk.length
      }

      return { sent, total: students.length }
    } catch {
      return { sent: 0, total: 0 }
    }
  }

  static async listTemplates(): Promise<NotificationTemplateRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) return []
      return (data as NotificationTemplateRow[]) ?? []
    } catch {
      return []
    }
  }

  static async saveTemplate(input: TemplateInput): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const record = {
        slug: input.slug,
        type: input.type,
        title_pt: input.title_pt,
        title_en: input.title_en,
        body_pt: input.body_pt,
        body_en: input.body_en,
        default_url: input.default_url || null,
      }

      if (input.id) {
        const { error } = await supabase
          .from("notification_templates")
          .update(record as never)
          .eq("id", input.id)
        if (error) return false
        return true
      }

      const { error } = await supabase
        .from("notification_templates")
        .insert(record as never)
      if (error) return false
      return true
    } catch {
      return false
    }
  }

  static async deleteTemplate(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("notification_templates")
        .delete()
        .eq("id", id)
      if (error) return false
      return true
    } catch {
      return false
    }
  }
}
