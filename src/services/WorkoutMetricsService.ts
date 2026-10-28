import { checked, readPages } from "./StudentRoutineService"
import { getZonedParts } from "@/lib/notifications/time"
import { createServiceClientSSR } from "../lib/supabase/server"
import type { WorkoutSessionRow, ExerciseSetLogRow } from "../types"

/**
 * Serviço de métricas de desempenho (Seção 20-21 do spec).
 * Baseia-se exclusivamente em workout_sessions + exercise_sets_log reais.
 */

export interface SessionVolumePoint {
  date: string // ISO date only
  volume_kg: number
  duration_min: number | null
}

export interface ExerciseProgressPoint {
  date: string
  weight_kg: number | null
  reps: number | null
  rpe: number | null
}

export interface ExerciseProgress {
  exercise_id: string
  name_pt: string
  name_en: string
  sessions_count: number
  first_log: string | null
  last_log: string | null
  max_weight_kg: number | null
  max_reps: number | null
  points: ExerciseProgressPoint[]
}

export interface PerformanceSummary {
  total_sessions: number
  total_volume_kg: number
  current_streak_days: number
  longest_streak_days: number
  weekly_frequency: number // média de sessões por semana
  avg_duration_min: number | null
  last_session_date: string | null
  top_exercises: Array<{
    exercise_id: string
    name_pt: string
    name_en: string
    count: number
    volume_kg: number
  }>
  recent_volume: SessionVolumePoint[] // últimos 30 dias
  personal_records: Array<{
    exercise_id: string
    name_pt: string
    name_en: string
    max_weight_kg: number | null
    max_reps: number | null
    max_volume_set_kg: number | null
    date: string | null
  }>
}

function dateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function daysBetween(a: Date, b: Date): number {
  const ms = 1000 * 60 * 60 * 24
  const da = new Date(a.toISOString().slice(0, 10))
  const db = new Date(b.toISOString().slice(0, 10))
  return Math.round((db.getTime() - da.getTime()) / ms)
}

export class WorkoutMetricsService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  /**
   * Resumo geral de desempenho do aluno.
   */
  static async getPerformanceSummary(userId: string): Promise<PerformanceSummary> {
    const empty: PerformanceSummary = {
      total_sessions: 0,
      total_volume_kg: 0,
      current_streak_days: 0,
      longest_streak_days: 0,
      weekly_frequency: 0,
      avg_duration_min: null,
      last_session_date: null,
      top_exercises: [],
      recent_volume: [],
      personal_records: [],
    }

    try {
      const supabase = await this.getSupabase()

      const profile = checked(await supabase.from("profiles").select("timezone").eq("id", userId).single(), "metrics timezone") as { timezone: string }
      const dateOnly = (iso: string) => getZonedParts(new Date(iso), profile.timezone).dateKey
      // Sessões concluídas do aluno
      const sessionsQ: any = await readPages<WorkoutSessionRow>(() => supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true }).order("id"), "metrics sessions")

      const sessions: any[] = sessionsQ?.data ?? []
      if (sessionsQ?.error) throw sessionsQ.error
      if (sessions.length === 0) return empty

      const rows = sessions as WorkoutSessionRow[]

      const totalSessions = rows.length
      const totalVolume = rows.reduce((acc, s) => acc + (Number(s.total_volume_kg) || 0), 0)
      const durations = rows.map((s) => Number(s.duration_min)).filter((d) => !isNaN(d) && d > 0)
      const avgDuration =
        durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

      const lastSessionDate = rows[rows.length - 1].completed_at ?? null

      // Streak baseado em dias com sessão concluída (calendário contínuo)
      const daysSet = new Set(rows.map((s) => dateOnly(s.completed_at!)))
      const sortedDays = Array.from(daysSet).sort()
      const today = dateOnly(new Date().toISOString())

      // streak atual: contar dias consecutivos até hoje (ou ontem)
      let currentStreak = 0
      if (daysSet.has(today) || daysSet.has(dateOnly(new Date(Date.now() - 86400000).toISOString()))) {
        let cursor = new Date()
        if (!daysSet.has(dateOnly(cursor.toISOString()))) cursor = new Date(Date.now() - 86400000)
        while (daysSet.has(dateOnly(cursor.toISOString()))) {
          currentStreak++
          cursor = new Date(cursor.getTime() - 86400000)
        }
      }

      // streak mais longa
      let longestStreak = 0
      let run = 0
      let prevDate: Date | null = null
      for (const d of sortedDays) {
        const dt = new Date(d)
        if (prevDate && daysBetween(prevDate, dt) === 1) {
          run++
        } else {
          run = 1
        }
        longestStreak = Math.max(longestStreak, run)
        prevDate = dt
      }

      // frequência semanal (últimas 12 semanas)
      const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 86400000)
      const recentSessions = rows.filter((s) => new Date(s.completed_at!) >= twelveWeeksAgo)
      const weeklyFrequency =
        recentSessions.length > 0 ? Math.round((recentSessions.length / 12) * 10) / 10 : 0

      // Volume recente (últimos 30 dias)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
      const recentVolumeMap = new Map<string, SessionVolumePoint>()
      for (const s of rows) {
        const dt = new Date(s.completed_at!)
        if (dt < thirtyDaysAgo) continue
        const key = dateOnly(s.completed_at!)
        const existing = recentVolumeMap.get(key)
        if (existing) {
          existing.volume_kg += Number(s.total_volume_kg) || 0
          if (s.duration_min) existing.duration_min = (existing.duration_min || 0) + Number(s.duration_min)
        } else {
          recentVolumeMap.set(key, {
            date: key,
            volume_kg: Number(s.total_volume_kg) || 0,
            duration_min: s.duration_min ? Number(s.duration_min) : null,
          })
        }
      }
      const recentVolume = Array.from(recentVolumeMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      )

      // Buscar todos os sets logs para métricas por exercício
      const sessionIds = rows.map((s) => s.id)
      const logs: ExerciseSetLogRow[] = []
      for (let offset = 0; offset < sessionIds.length; offset += 250) {
        const result = await readPages<ExerciseSetLogRow>(() => supabase.from("exercise_sets_log").select("*").in("session_id", sessionIds.slice(offset, offset + 250)).eq("completed",true).order("id"), "metrics sets")
        logs.push(...result.data)
      }
      if (logs.length === 0) {
        return {
          total_sessions: totalSessions,
          total_volume_kg: Math.round(totalVolume * 100) / 100,
          current_streak_days: currentStreak,
          longest_streak_days: longestStreak,
          weekly_frequency: weeklyFrequency,
          avg_duration_min: avgDuration,
          last_session_date: lastSessionDate,
          top_exercises: [],
          recent_volume: recentVolume,
          personal_records: [],
        }
      }

      // Agrupar por exercício
      const byExercise = new Map<string, ExerciseSetLogRow[]>()
      for (const log of logs) {
        if (!log.exercise_id) continue
        const arr = byExercise.get(log.exercise_id) ?? []
        arr.push(log)
        byExercise.set(log.exercise_id, arr)
      }

      // Buscar nomes dos exercícios
      const exerciseIds = Array.from(byExercise.keys())
      const exercisesQ: any = await supabase
        .from("exercises")
        .select("id, name_pt, name_en")
        .in("id", exerciseIds)

      if (exercisesQ?.error) throw exercisesQ.error
      const nameMap = new Map<string, { name_pt: string; name_en: string }>()
      for (const ex of (exercisesQ?.data ?? []) as any[]) {
        nameMap.set(ex.id, { name_pt: ex.name_pt, name_en: ex.name_en })
      }

      // Top exercícios (por quantidade de logs)
      const topExercises = Array.from(byExercise.entries())
        .map(([exId, list]) => {
          const names = nameMap.get(exId) ?? { name_pt: "Exercício", name_en: "Exercise" }
          const volume = list.reduce((acc, l) => {
            const w = Number(l.weight_kg) || 0
            const r = Number(l.reps_done) || 0
            return acc + w * r
          }, 0)
          return {
            exercise_id: exId,
            name_pt: names.name_pt,
            name_en: names.name_en,
            count: list.length,
            volume_kg: Math.round(volume * 100) / 100,
          }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Recordes pessoais (maior carga por exercício)
      const personalRecords = Array.from(byExercise.entries())
        .map(([exId, list]) => {
          const names = nameMap.get(exId) ?? { name_pt: "Exercício", name_en: "Exercise" }
          let maxW: number | null = null
          let maxR: number | null = null
          let maxVolSet: number | null = null
          let recordDate: string | null = null
          for (const l of list) {
            const w = Number(l.weight_kg)
            const r = Number(l.reps_done)
            if (w > 0 && (maxW === null || w > maxW)) {
              maxW = w
              recordDate = l.logged_at
            }
            if (r > 0 && (maxR === null || r > maxR)) maxR = r
            if (w > 0 && r > 0) {
              const vol = w * r
              if (maxVolSet === null || vol > maxVolSet) maxVolSet = vol
            }
          }
          return {
            exercise_id: exId,
            name_pt: names.name_pt,
            name_en: names.name_en,
            max_weight_kg: maxW,
            max_reps: maxR,
            max_volume_set_kg: maxVolSet ? Math.round(maxVolSet * 100) / 100 : null,
            date: recordDate,
          }
        })
        .filter((r) => r.max_weight_kg !== null || r.max_reps !== null)
        .sort((a, b) => (b.max_weight_kg ?? 0) - (a.max_weight_kg ?? 0))
        .slice(0, 10)

      return {
        total_sessions: totalSessions,
        total_volume_kg: Math.round(totalVolume * 100) / 100,
        current_streak_days: currentStreak,
        longest_streak_days: longestStreak,
        weekly_frequency: weeklyFrequency,
        avg_duration_min: avgDuration,
        last_session_date: lastSessionDate,
        top_exercises: topExercises,
        recent_volume: recentVolume,
        personal_records: personalRecords,
      }
    } catch (error) {
      console.error("[WorkoutMetrics] summary", error)
      throw new Error("Não foi possível carregar as métricas de treino.")
    }
  }

  /**
   * Evolução de carga/reps de um exercício específico ao longo do tempo.
   */
  static async getExerciseProgress(userId: string, exerciseId: string): Promise<ExerciseProgress | null> {
    try {
      const supabase = await this.getSupabase()

      const sessionsQ: any = await supabase
        .from("workout_sessions")
        .select("id, completed_at")
        .eq("user_id", userId)
        .not("completed_at", "is", null)

      const sessions: any[] = sessionsQ?.data ?? []
      if (sessions.length === 0) return null

      const sessionIds = sessions.map((s) => s.id)
      const logsQ: any = await supabase
        .from("exercise_sets_log")
        .select("*")
        .in("session_id", sessionIds)
        .eq("exercise_id", exerciseId)
        .order("logged_at", { ascending: true })

      const logsList = ((logsQ?.data ?? []) as ExerciseSetLogRow[])
      if (logsList.length === 0) return null

      const exQ: any = await supabase
        .from("exercises")
        .select("id, name_pt, name_en")
        .eq("id", exerciseId)
        .single()

      const exData: any = exQ?.data ?? null

      const sessionDateMap = new Map<string, string>()
      for (const s of sessions) {
        sessionDateMap.set(s.id, s.completed_at)
      }

      let maxW: number | null = null
      let maxR: number | null = null
      const points: ExerciseProgressPoint[] = logsList.map((l) => {
        const w = Number(l.weight_kg)
        const r = Number(l.reps_done)
        if (w > 0 && (maxW === null || w > maxW)) maxW = w
        if (r > 0 && (maxR === null || r > maxR)) maxR = r
        return {
          date: sessionDateMap.get(l.session_id) ?? l.logged_at,
          weight_kg: w > 0 ? w : null,
          reps: r > 0 ? r : null,
          rpe: l.rpe ? Number(l.rpe) : null,
        }
      })

      return {
        exercise_id: exerciseId,
        name_pt: exData?.name_pt ?? "Exercício",
        name_en: exData?.name_en ?? "Exercise",
        sessions_count: new Set(logsList.map((l) => l.session_id)).size,
        first_log: points[0]?.date ?? null,
        last_log: points[points.length - 1]?.date ?? null,
        max_weight_kg: maxW,
        max_reps: maxR,
        points,
      }
    } catch {
      return null
    }
  }
}
