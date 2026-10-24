import { DEFAULT_TIMEZONE_BR } from "@/config/constants"

export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 1 = segunda ... 7 = domingo (ISO) */
  weekday: number
  /** "YYYY-MM-DD" no fuso informado */
  dateKey: string
}

function safeTimeZone(timeZone?: string | null): string {
  const tz = (timeZone ?? "").trim()
  return tz.length > 0 ? tz : DEFAULT_TIMEZONE_BR
}

/** Diferença (ms) entre o horário local do fuso e o UTC para o instante dado. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const parts = dtf.formatToParts(date)
  const map: Record<string, string> = {}
  for (const part of parts) map[part.type] = part.value
  const hour = map.hour === "24" ? 0 : Number(map.hour)
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second)
  )
  return asUtc - date.getTime()
}

/** Decompõe um instante nos componentes de calendário de um fuso. */
export function getZonedParts(date: Date, timeZone?: string | null): ZonedParts {
  const tz = safeTimeZone(timeZone)
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  const parts = dtf.formatToParts(date)
  const map: Record<string, string> = {}
  for (const part of parts) map[part.type] = part.value
  const year = Number(map.year)
  const month = Number(map.month)
  const day = Number(map.day)
  const hour = map.hour === "24" ? 0 : Number(map.hour)
  const minute = Number(map.minute)
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday: ((utcDay + 6) % 7) + 1,
    dateKey: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  }
}

/** Converte uma hora de parede ("HH:MM" ou "HH:MM:SS") de um fuso para um instante UTC. */
export function zonedTimeToUtc(
  dateKey: string,
  time: string,
  timeZone?: string | null
): Date {
  const tz = safeTimeZone(timeZone)
  const [y, m, d] = dateKey.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  const guess = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
  const offset = timeZoneOffsetMs(new Date(guess), tz)
  return new Date(guess - offset)
}

/** "HH:MM:SS" -> minutos desde a meia-noite. */
export function timeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map(Number)
  return (hh ?? 0) * 60 + (mm ?? 0)
}

/**
 * Verifica se um horário (em minutos) está dentro da janela de silêncio.
 * A janela pode atravessar a meia-noite (ex.: 22:00 -> 08:00).
 */
export function isWithinQuietHours(
  minutes: number,
  quietStart?: string | null,
  quietEnd?: string | null
): boolean {
  if (!quietStart || !quietEnd) return false
  const start = timeToMinutes(quietStart)
  const end = timeToMinutes(quietEnd)
  if (start === end) return false
  if (start < end) return minutes >= start && minutes < end
  return minutes >= start || minutes < end
}

/** Subtrai/adição de dias em uma chave "YYYY-MM-DD". */
export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  const base = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}
