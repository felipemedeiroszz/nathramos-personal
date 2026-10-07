import { createServiceClientSSR } from "../lib/supabase/server"
import type { NotificationTypeT, LocaleT } from "../lib/supabase/types"

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

  static async sendInApp(userId: string, payload: SendInAppPayload): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const locale = await this.getUserLocale(userId)
      const isEn = locale === "en-US"

      const title = isEn ? (payload.title_en ?? payload.title_pt) : payload.title_pt
      const body = isEn ? (payload.body_en ?? payload.body_pt) : payload.body_pt

      const now = new Date().toISOString()
      const hasScheduled = !!payload.scheduled_for

      const insertPayload: Record<string, any> = {
        user_id: userId,
        type: payload.type,
        title,
        body,
        image_url: payload.image_url ?? null,
        url: payload.url ?? null,
        payload: (payload.payload ?? {}) as Record<string, unknown>,
        scheduled_for: payload.scheduled_for ?? null,
        sent_at: hasScheduled ? null : now,
      }

      const { error } = await supabase
        .from("notifications")
        .insert(insertPayload as never)

      if (error) return false
      return true
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
}
