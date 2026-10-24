import webpush from "web-push"
import { createServiceClientSSR } from "../lib/supabase/server"

export interface PushPayload {
  title: string
  body: string
  url?: string | null
  tag?: string | null
  type?: string | null
  notification_id?: string | null
  image_url?: string | null
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

interface StoredSubscription {
  id: string
  endpoint: string
  auth_p256dh: string
  auth_secret: string
}

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? ""
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ""
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:contato@nathramos.com"

/** Serviço server-side de Web Push (VAPID). */
export class PushService {
  private static configured = false

  private static ensureConfigured(): boolean {
    if (this.configured) return true
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
      this.configured = true
      return true
    } catch {
      return false
    }
  }

  /** true quando as chaves VAPID estão presentes no ambiente. */
  static isConfigured(): boolean {
    return this.ensureConfigured()
  }

  /** Salva (ou revalida) a subscription de um dispositivo. */
  static async saveSubscription(
    userId: string,
    input: PushSubscriptionInput,
    meta: { device_name?: string | null; user_agent?: string | null } = {}
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: input.endpoint,
          auth_p256dh: input.keys.p256dh,
          auth_secret: input.keys.auth,
          device_name: meta.device_name ?? null,
          user_agent: meta.user_agent ?? null,
          is_valid: true,
          invalidated_at: null,
          last_used_at: new Date().toISOString(),
        } as never,
        { onConflict: "endpoint" }
      )
      return !error
    } catch {
      return false
    }
  }

  /** Remove a subscription do dispositivo (logout/desativação). */
  static async removeSubscription(userId: string, endpoint: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint)
      return !error
    } catch {
      return false
    }
  }

  /** Invalida uma subscription que o provedor rejeitou (404/410). */
  private static async invalidate(id: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      await supabase
        .from("push_subscriptions")
        .update({ is_valid: false, invalidated_at: new Date().toISOString() } as never)
        .eq("id", id)
    } catch {
      /* noop */
    }
  }

  /**
   * Envia o push para todos os dispositivos válidos do usuário.
   * Subscriptions expiradas são marcadas como inválidas automaticamente.
   */
  static async sendToUser(
    userId: string,
    payload: PushPayload
  ): Promise<{ sent: number; removed: number }> {
    if (!this.ensureConfigured()) return { sent: 0, removed: 0 }

    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, auth_p256dh, auth_secret")
        .eq("user_id", userId)
        .eq("is_valid", true)

      if (error || !data) return { sent: 0, removed: 0 }

      const subs = data as StoredSubscription[]
      const body = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? undefined,
        tag: payload.tag ?? payload.notification_id ?? undefined,
        type: payload.type ?? undefined,
        notification_id: payload.notification_id ?? undefined,
        icon: payload.image_url ?? undefined,
      })

      let sent = 0
      let removed = 0

      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.auth_p256dh, auth: sub.auth_secret },
              },
              body,
              { TTL: 60 * 60 * 24 }
            )
            sent += 1
          } catch (err: any) {
            const status = err?.statusCode
            if (status === 404 || status === 410) {
              removed += 1
              await this.invalidate(sub.id)
            }
          }
        })
      )

      if (sent > 0) {
        try {
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() } as never)
            .eq("user_id", userId)
            .eq("is_valid", true)
        } catch {
          /* noop */
        }
      }

      return { sent, removed }
    } catch {
      return { sent: 0, removed: 0 }
    }
  }

  /** Quantidade de dispositivos ativos (para a tela de preferências). */
  static async countDevices(userId: string): Promise<number> {
    try {
      const supabase = await this.getSupabase()
      const { count, error } = await supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_valid", true)
      if (error) return 0
      return count ?? 0
    } catch {
      return 0
    }
  }

  private static async getSupabase() {
    return createServiceClientSSR()
  }
}
