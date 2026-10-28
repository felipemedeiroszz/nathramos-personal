import { StudentRoutineService, checked, type RoutineData } from "./StudentRoutineService"
import { getMaintenanceStatus } from "./PlatformSettingsService"
import { WorkoutService } from "./WorkoutService"
import { createServiceClientSSR } from "../lib/supabase/server"
import { NotificationService, ALWAYS_PUSH_TYPES } from "./NotificationService"
import { getZonedParts, isWithinQuietHours, zonedTimeToUtc } from "../lib/notifications/time"
import { canAccessPlatform } from "@/lib/auth/access"
import type { NotificationTypeT } from "../lib/supabase/types"

const MAX_DELIVERIES = 300
const MAX_USERS = 500

const WORKOUT_TIME = "07:00"

interface ProfileLite {
  id: string
  language: string | null
  timezone: string | null
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  push_enabled: boolean | null
}

function timeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map(Number)
  return (hh ?? 0) * 60 + (mm ?? 0)
}

/**
 * Orquestra a entrega agendada e a geração automática de lembretes de rotina.
 * Executado pela rota de cron protegida.
 */
export class NotificationDispatcher {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  /** Entrega as notificações cujo `scheduled_for` já venceu. */
  static async processDueNotifications(): Promise<{
    processed: number
    skipped: number
    pushed: number
  }> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, body, url, image_url, payload")
        .lte("scheduled_for", new Date().toISOString())
        .is("sent_at", null)
        .order("scheduled_for", { ascending: true })
        .limit(MAX_DELIVERIES)

      if (error) throw error
      if (!data) return { processed: 0, skipped: 0, pushed: 0 }

      const rows = data as {
        id: string
        user_id: string
        type: NotificationTypeT
        title: string
        body: string
        url: string | null
        image_url: string | null
        payload: { routine_date?: string; routine_kind?: string; item_key?: string } | null
      }[]

      if (rows.length === 0) return { processed: 0, skipped: 0, pushed: 0 }

      const userIds = Array.from(new Set(rows.map((row) => row.user_id)))
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, timezone, quiet_hours_start, quiet_hours_end")
        .in("id", userIds)

      if (profileError) throw profileError
      const profileById = new Map<string, { timezone: string | null; quiet_hours_start: string | null; quiet_hours_end: string | null }>()
      for (const profile of (profiles as {
        id: string
        timezone: string | null
        quiet_hours_start: string | null
        quiet_hours_end: string | null
      }[]) ?? []) {
        profileById.set(profile.id, profile)
      }

      const now = new Date()
      let processed = 0
      let skipped = 0
      let pushed = 0

      const routineCache = new Map<string, RoutineData>()
      for (const row of rows) {
        if (row.payload?.routine_date) {
          let data = routineCache.get(row.user_id)
          if (!data) { data = await StudentRoutineService.get(row.user_id); routineCache.set(row.user_id, data) }
          const kind = row.payload.routine_kind
          const item = [...data.diet, ...data.supplements].find(i => i.key === row.payload?.item_key)
          let invalid = row.payload.routine_date !== data.date ||
            ((kind === "diet" || kind === "supplement") && (!item || item.done)) ||
            (kind === "hydration" && (!data.hydrationReminders || !data.waterGoal || data.waterTotal >= data.waterGoal || (data.hydrationSilent && isWithinQuietHours(getZonedParts(now, data.timezone).hour * 60 + getZonedParts(now, data.timezone).minute, "22:00", "07:00")))) ||
            !(await canAccessPlatform(row.user_id, true)).allowed || (await getMaintenanceStatus()).active
          if (kind === "workout" && !invalid) {
            const plan = await WorkoutService.getTodaysProgram(row.user_id)
            invalid = !plan || plan.sessionCompletedToday
          }
          if (invalid) {
            checked(await supabase.from("notifications").update({ sent_at: now.toISOString(), error_text: "Rotina atualizada; lembrete cancelado." } as never).eq("id", row.id), "cancel reminder")
            skipped++; continue
          }
        }
        const profile = profileById.get(row.user_id)
        if (profile && !ALWAYS_PUSH_TYPES.includes(row.type)) {
          const parts = getZonedParts(now, profile.timezone)
          if (
            isWithinQuietHours(
              parts.hour * 60 + parts.minute,
              profile.quiet_hours_start,
              profile.quiet_hours_end
            )
          ) {
            skipped++
            continue
          }
        }

        pushed += await NotificationService.deliverPush(row.user_id, row.id, {
          title: row.title,
          body: row.body,
          url: row.url,
          type: row.type,
          image_url: row.image_url,
        })

        await supabase
          .from("notifications")
          .update({ sent_at: new Date().toISOString() } as never)
          .eq("id", row.id)
        processed++
      }

      return { processed, skipped, pushed }
    } catch (error) {
      console.error("[NotificationDispatcher] delivery", error)
      throw new Error("Não foi possível processar as notificações.")
    }
  }

  /**
   * Cria lembretes de rotina (refeições, água, suplementos e treino) para o
   * restante do dia local de cada aluno. Idempotente por chave de deduplicação.
   */
  static async generateRoutineReminders(): Promise<{ users: number; created: number }> {
    if ((await getMaintenanceStatus()).active) return { users: 0, created: 0 }
    const db: any = await this.getSupabase()
    const users = checked<ProfileLite[]>(await db.from("profiles").select("id, language, timezone, quiet_hours_start, quiet_hours_end, push_enabled").eq("role", "student").eq("is_deleted", false).limit(MAX_USERS), "reminder users")
    const now = new Date()
    let created = 0
    for (const user of users) {
      if (!(await canAccessPlatform(user.id, true)).allowed) continue
      const data = await StudentRoutineService.get(user.id)
      const parts = getZonedParts(now, data.timezone)
      const minutesNow = parts.hour * 60 + parts.minute
      const existing = checked<any[]>(await db.from("notifications").select("payload").eq("user_id", user.id).gte("created_at", new Date(now.getTime() - 36 * 3600000).toISOString()), "reminder dedupe")
      const seen = new Set(existing.map(n => n.payload?.dedupe_key))
      const candidates: { kind: NotificationTypeT; key: string; slot: string; name: string; itemKey?: string }[] = []
      for (const item of [...data.diet, ...data.supplements]) {
        if (item.done || !/^\d{2}:\d{2}/.test(item.slot)) continue
        candidates.push({ kind: item.kind, key: `${item.kind}:${item.key}:${data.date}`, itemKey: item.key, slot: item.slot, name: item.name })
      }
      if (data.waterGoal && data.hydrationReminders && data.waterTotal < data.waterGoal) {
        for (let minute = 0; minute < 24 * 60; minute += data.hydrationFrequency) {
          const slot = `${String(Math.floor(minute / 60)).padStart(2,'0')}:${String(minute % 60).padStart(2,'0')}`
          candidates.push({ kind: "hydration", key: `water:${data.date}:${slot}`, slot, name: `${data.waterGoal} ml` })
        }
      }
      const workout = await WorkoutService.getTodaysProgram(user.id)
      if (workout?.program && workout.day && !workout.isRestDay && !workout.sessionCompletedToday) candidates.push({ kind: "workout", key: `workout:${data.date}`, slot: WORKOUT_TIME, name: workout.program.title_pt })
      for (const item of candidates) {
        const minute = timeToMinutes(item.slot)
        // Schedule only the next cron window; do not send a backlog of old tasks.
        if (minute < minutesNow - 15 || minute > minutesNow + 15 || seen.has(item.key)) continue
        if (isWithinQuietHours(minute, data.quietStart, data.quietEnd)) continue
        if (item.kind === "hydration" && data.hydrationSilent && isWithinQuietHours(minute, "22:00", "07:00")) continue
        const result = await NotificationService.send(user.id, {
          type: item.kind,
          title_pt: item.kind === "diet" ? "Hora da sua refeição" : item.kind === "supplement" ? "Tomar suplemento" : item.kind === "hydration" ? "Hora de se hidratar" : "Treino de hoje",
          title_en: item.kind === "diet" ? "Meal time" : item.kind === "supplement" ? "Take your supplement" : item.kind === "hydration" ? "Time to hydrate" : "Today's workout",
          body_pt: `Lembrete: ${item.name}.`, body_en: `Reminder: ${item.name}.`,
          url: `/${data.locale || 'pt-BR'}/${item.kind === 'diet' ? 'dieta' : item.kind === 'supplement' ? 'suplementos' : item.kind === 'hydration' ? 'hidratacao' : 'treino'}`,
          scheduled_for: zonedTimeToUtc(data.date, item.slot, data.timezone).toISOString(),
          payload: { dedupe_key: item.key, routine_date: data.date, routine_kind: item.kind, item_key: item.itemKey || null },
        })
        if (result.inApp) { created++; seen.add(item.key) }
      }
    }
    return { users: users.length, created }
  }
}
