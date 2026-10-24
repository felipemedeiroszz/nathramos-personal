import { createServiceClientSSR } from "../lib/supabase/server"
import { NotificationService, ALWAYS_PUSH_TYPES } from "./NotificationService"
import { getZonedParts, isWithinQuietHours, zonedTimeToUtc, shiftDateKey } from "../lib/notifications/time"
import { canAccessPlatform } from "@/lib/auth/access"
import type { NotificationTypeT } from "../lib/supabase/types"

const MAX_DELIVERIES = 300
const MAX_USERS = 500

/** Horários fixos dos lembretes de hidratação. */
const WATER_SLOTS = ["09:00", "12:30", "16:00", "19:30"]
/** Horário padrão dos lembretes de treino. */
const WORKOUT_TIME = "07:00"

const MEAL_LABELS: Record<string, { pt: string; en: string }> = {
  breakfast: { pt: "Café da manhã", en: "Breakfast" },
  morning_snack: { pt: "Lanche da manhã", en: "Morning snack" },
  lunch: { pt: "Almoço", en: "Lunch" },
  afternoon_snack: { pt: "Lanche da tarde", en: "Afternoon snack" },
  dinner: { pt: "Jantar", en: "Dinner" },
  supper: { pt: "Ceia", en: "Supper" },
  pre_workout: { pt: "Pré-treino", en: "Pre-workout" },
  post_workout: { pt: "Pós-treino", en: "Post-workout" },
  water: { pt: "Água", en: "Water" },
  other: { pt: "Refeição", en: "Meal" },
}

interface ReminderInput {
  dedupeKey: string
  type: NotificationTypeT
  titlePt: string
  titleEn: string
  bodyPt: string
  bodyEn: string
  url: string
  scheduledFor: string
}

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
        .select("id, user_id, type, title, body, url, image_url")
        .lte("scheduled_for", new Date().toISOString())
        .is("sent_at", null)
        .order("scheduled_for", { ascending: true })
        .limit(MAX_DELIVERIES)

      if (error || !data) return { processed: 0, skipped: 0, pushed: 0 }

      const rows = data as {
        id: string
        user_id: string
        type: NotificationTypeT
        title: string
        body: string
        url: string | null
        image_url: string | null
      }[]

      if (rows.length === 0) return { processed: 0, skipped: 0, pushed: 0 }

      const userIds = Array.from(new Set(rows.map((row) => row.user_id)))
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, timezone, quiet_hours_start, quiet_hours_end")
        .in("id", userIds)

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

      for (const row of rows) {
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
    } catch {
      return { processed: 0, skipped: 0, pushed: 0 }
    }
  }

  /**
   * Cria lembretes de rotina (refeições, água, suplementos e treino) para o
   * restante do dia local de cada aluno. Idempotente por chave de deduplicação.
   */
  static async generateRoutineReminders(): Promise<{ users: number; created: number }> {
    try {
      const supabase = await this.getSupabase()
      const { data: usersData, error } = await supabase
        .from("profiles")
        .select("id, language, timezone, quiet_hours_start, quiet_hours_end, push_enabled")
        .eq("role", "student")
        .eq("is_deleted", false)
        .limit(MAX_USERS)

      if (error || !usersData) return { users: 0, created: 0 }

      const users = usersData as ProfileLite[]
      if (users.length === 0) return { users: 0, created: 0 }

      const now = new Date()
      const userIds = users.map((user) => user.id)
      const logsSince = shiftDateKey(now.toISOString().slice(0, 10), -1)

      const [dietsRes, hydrationRes, supplementsRes, sessionsRes, mealLogsRes] = await Promise.all([
        supabase
          .from("diet_programs")
          .select("id, user_id, start_date, end_date")
          .in("user_id", userIds)
          .eq("is_active", true),
        supabase
          .from("hydration_goals")
          .select("user_id, daily_target_ml, active_from, active_until")
          .in("user_id", userIds),
        supabase
          .from("user_supplements")
          .select("id, user_id, name_pt_snapshot, dosage, dosage_unit, times_of_day, start_date, end_date")
          .in("user_id", userIds)
          .eq("is_active", true),
        supabase
          .from("workout_sessions")
          .select("id, user_id, scheduled_date")
          .in("user_id", userIds)
          .is("started_at", null),
        supabase
          .from("meal_logs")
          .select("user_id, meal_id, logged_date")
          .in("user_id", userIds)
          .gte("logged_date", logsSince),
      ])

      const diets = (dietsRes.data ?? []) as {
        id: string
        user_id: string
        start_date: string | null
        end_date: string | null
      }[]
      const dietIds = diets.map((diet) => diet.id)
      const mealsRes = dietIds.length
        ? await supabase
            .from("diet_meals")
            .select("id, diet_id, meal_type, time_of_day, name_pt, name_en")
            .in("diet_id", dietIds)
        : { data: [] as unknown[] }

      const meals = (mealsRes.data ?? []) as {
        id: string
        diet_id: string
        meal_type: string
        time_of_day: string
        name_pt: string
        name_en: string
      }[]
      const mealsByDiet = new Map<string, typeof meals>()
      for (const meal of meals) {
        const list = mealsByDiet.get(meal.diet_id) ?? []
        list.push(meal)
        mealsByDiet.set(meal.diet_id, list)
      }

      const hydration = (hydrationRes.data ?? []) as {
        user_id: string
        daily_target_ml: number
        active_from: string | null
        active_until: string | null
      }[]
      const supplements = (supplementsRes.data ?? []) as {
        id: string
        user_id: string
        name_pt_snapshot: string
        dosage: number
        dosage_unit: string
        times_of_day: string[] | null
        start_date: string | null
        end_date: string | null
      }[]
      const sessions = (sessionsRes.data ?? []) as {
        id: string
        user_id: string
        scheduled_date: string
      }[]

      // Refeições já registradas (evita lembrete de tarefa concluída).
      const loggedMeals = new Set<string>()
      for (const log of (mealLogsRes.data ?? []) as {
        user_id: string
        meal_id: string | null
        logged_date: string
      }[]) {
        if (log.meal_id) loggedMeals.add(`${log.user_id}:${log.meal_id}:${log.logged_date}`)
      }

      let created = 0

      for (const user of users) {
        const locale = user.language === "en-US" ? "en-US" : "pt-BR"
        const parts = getZonedParts(now, user.timezone)
        const dateKey = parts.dateKey
        const nowMinutes = parts.hour * 60 + parts.minute
        const tolerance = nowMinutes - 10
        const pending: ReminderInput[] = []

        // Refeições
        for (const diet of diets) {
          if (diet.user_id !== user.id) continue
          if (diet.start_date && diet.start_date > dateKey) continue
          if (diet.end_date && diet.end_date < dateKey) continue
          for (const meal of mealsByDiet.get(diet.id) ?? []) {
            const minutes = timeToMinutes(meal.time_of_day)
            if (minutes < tolerance) continue
            if (loggedMeals.has(`${user.id}:${meal.id}:${dateKey}`)) continue
            const label = MEAL_LABELS[meal.meal_type] ?? MEAL_LABELS.other
            pending.push({
              dedupeKey: `meal:${meal.id}:${dateKey}`,
              type: "diet",
              titlePt: `Hora do ${label.pt.toLowerCase()}`,
              titleEn: `${label.en} time`,
              bodyPt: `Lembrete da sua refeição: ${meal.name_pt}.`,
              bodyEn: `Meal reminder: ${meal.name_en}.`,
              url: `/${locale}/dieta`,
              scheduledFor: zonedTimeToUtc(dateKey, meal.time_of_day, user.timezone).toISOString(),
            })
          }
        }

        // Hidratação
        const activeGoal = hydration.find(
          (goal) =>
            goal.user_id === user.id &&
            (!goal.active_from || goal.active_from <= dateKey) &&
            (!goal.active_until || goal.active_until >= dateKey)
        )
        if (activeGoal) {
          for (const slot of WATER_SLOTS) {
            if (timeToMinutes(slot) < tolerance) continue
            pending.push({
              dedupeKey: `water:${dateKey}:${slot}`,
              type: "hydration",
              titlePt: "Hora de se hidratar",
              titleEn: "Time to hydrate",
              bodyPt: `Beba água para atingir sua meta de ${activeGoal.daily_target_ml} ml hoje.`,
              bodyEn: `Drink water to reach your ${activeGoal.daily_target_ml} ml goal today.`,
              url: `/${locale}/hidratacao`,
              scheduledFor: zonedTimeToUtc(dateKey, slot, user.timezone).toISOString(),
            })
          }
        }

        // Suplementos
        for (const supplement of supplements) {
          if (supplement.user_id !== user.id) continue
          if (supplement.start_date && supplement.start_date > dateKey) continue
          if (supplement.end_date && supplement.end_date < dateKey) continue
          for (const time of supplement.times_of_day ?? []) {
            if (timeToMinutes(time) < tolerance) continue
            pending.push({
              dedupeKey: `supp:${supplement.id}:${dateKey}:${time}`,
              type: "supplement",
              titlePt: "Tomar suplemento",
              titleEn: "Take your supplement",
              bodyPt: `Lembrete: ${supplement.name_pt_snapshot} (${supplement.dosage}${supplement.dosage_unit}).`,
              bodyEn: `Reminder: ${supplement.name_pt_snapshot} (${supplement.dosage}${supplement.dosage_unit}).`,
              url: `/${locale}/suplementos`,
              scheduledFor: zonedTimeToUtc(dateKey, time, user.timezone).toISOString(),
            })
          }
        }

        // Treino
        for (const session of sessions) {
          if (session.user_id !== user.id) continue
          if (session.scheduled_date !== dateKey) continue
          const scheduled = zonedTimeToUtc(dateKey, WORKOUT_TIME, user.timezone)
          pending.push({
            dedupeKey: `session:${session.id}`,
            type: "workout",
            titlePt: "Treino de hoje",
            titleEn: "Today's workout",
            bodyPt: "Seu treino de hoje está agendado. Bora treinar!",
            bodyEn: "Your workout is scheduled for today. Let's go!",
            url: `/${locale}/treino`,
            scheduledFor: (scheduled.getTime() < now.getTime() ? now : scheduled).toISOString(),
          })
        }

        if (pending.length === 0) continue

        // Respeita o status da assinatura (não envia lembretes a alunos bloqueados).
        const access = await canAccessPlatform(user.id, true)
        if (!access.allowed) continue

        const since = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()
        const { data: existing } = await supabase
          .from("notifications")
          .select("payload")
          .eq("user_id", user.id)
          .gte("created_at", since)

        const seen = new Set<string>()
        for (const row of (existing as { payload: Record<string, unknown> | null }[]) ?? []) {
          const key = row?.payload?.dedupe_key
          if (typeof key === "string") seen.add(key)
        }

        for (const reminder of pending) {
          if (seen.has(reminder.dedupeKey)) continue
          const result = await NotificationService.send(user.id, {
            type: reminder.type,
            title_pt: reminder.titlePt,
            title_en: reminder.titleEn,
            body_pt: reminder.bodyPt,
            body_en: reminder.bodyEn,
            url: reminder.url,
            scheduled_for: reminder.scheduledFor,
            payload: { dedupe_key: reminder.dedupeKey },
          })
          if (result.inApp) created++
        }
      }

      return { users: users.length, created }
    } catch {
      return { users: 0, created: 0 }
    }
  }
}
