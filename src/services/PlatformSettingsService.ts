import { cache } from "react"
import { createServiceClientSSR } from "../lib/supabase/server"
import { AuditLogService } from "./AuditLogService"
import { platformSettingsSchema, type PlatformSettingsInput } from "../schemas/settings"

export type MaintenanceUnit = "hours" | "days"

export type PlatformSettingsForm = {
  brand_name_pt: string
  brand_name_en: string
  brand_tagline_pt: string
  brand_tagline_en: string
  support_email: string
  support_whatsapp: string
  support_hours_pt: string
  support_hours_en: string
  maintenance_mode: boolean
  maintenance_duration: number
  maintenance_duration_unit: MaintenanceUnit
  /** ISO da data/hora prevista para o fim da manutenção (null = sem prazo). */
  maintenance_until: string | null
  /** Manutenção ligada e ainda dentro da janela de tempo. */
  maintenance_active: boolean
  signup_open: boolean
  trial_days_default: number
}

export const PLATFORM_SETTINGS_DEFAULTS: PlatformSettingsForm = {
  brand_name_pt: "Nath Ramos",
  brand_name_en: "Nath Ramos",
  brand_tagline_pt: "Personal Trainer",
  brand_tagline_en: "Personal Trainer",
  support_email: "",
  support_whatsapp: "",
  support_hours_pt: "",
  support_hours_en: "",
  maintenance_mode: false,
  maintenance_duration: 24,
  maintenance_duration_unit: "hours",
  maintenance_until: null,
  maintenance_active: false,
  signup_open: true,
  trial_days_default: 7,
}

export const MAINTENANCE_KEYS = [
  "maintenance_mode",
  "maintenance_until",
  "maintenance_duration",
  "maintenance_duration_unit",
]

type SettingsDbRow = {
  key: string
  value_pt: string | null
  value_en: string | null
  value_json: unknown
  value_num: number | null
}

function addDuration(from: Date, amount: number, unit: MaintenanceUnit): Date {
  const ms = unit === "days" ? amount * 86_400_000 : amount * 3_600_000
  return new Date(from.getTime() + ms)
}

/** Manutenção válida apenas enquanto o modo está ligado e a janela não expirou. */
function resolveMaintenance(
  mode: boolean,
  until: string | null
): { active: boolean; until: string | null } {
  if (!mode) return { active: false, until: null }
  if (!until) return { active: true, until: null }
  const end = new Date(until).getTime()
  if (!Number.isFinite(end)) return { active: true, until: null }
  return { active: end > Date.now(), until }
}

export class PlatformSettingsService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  /** Lê todas as configurações e devolve um objeto plano pronto para o formulário. */
  static async getForm(): Promise<PlatformSettingsForm> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value_pt, value_en, value_json, value_num")

      if (error || !data) return { ...PLATFORM_SETTINGS_DEFAULTS }

      const byKey = new Map<string, SettingsDbRow>()
      for (const row of data as unknown as SettingsDbRow[]) {
        byKey.set(row.key, row)
      }

      const text = (key: string, lang: "pt" | "en"): string | null => {
        const row = byKey.get(key)
        const value = lang === "pt" ? row?.value_pt : row?.value_en
        return typeof value === "string" ? value : null
      }
      const bool = (key: string, fallback: boolean): boolean => {
        const value = byKey.get(key)?.value_json
        return typeof value === "boolean" ? value : fallback
      }
      const num = (key: string, fallback: number): number => {
        const value = byKey.get(key)?.value_num
        return typeof value === "number" ? Number(value) : fallback
      }

      const maintenanceMode = bool(
        "maintenance_mode",
        PLATFORM_SETTINGS_DEFAULTS.maintenance_mode
      )
      const maintenanceUntil = text("maintenance_until", "pt")
      const unit = text("maintenance_duration_unit", "pt")

      return {
        brand_name_pt: text("brand_name", "pt") ?? PLATFORM_SETTINGS_DEFAULTS.brand_name_pt,
        brand_name_en: text("brand_name", "en") ?? PLATFORM_SETTINGS_DEFAULTS.brand_name_en,
        brand_tagline_pt:
          text("brand_tagline", "pt") ?? PLATFORM_SETTINGS_DEFAULTS.brand_tagline_pt,
        brand_tagline_en:
          text("brand_tagline", "en") ?? PLATFORM_SETTINGS_DEFAULTS.brand_tagline_en,
        support_email: text("support_email", "pt") ?? PLATFORM_SETTINGS_DEFAULTS.support_email,
        support_whatsapp:
          text("support_whatsapp", "pt") ?? PLATFORM_SETTINGS_DEFAULTS.support_whatsapp,
        support_hours_pt:
          text("support_hours", "pt") ?? PLATFORM_SETTINGS_DEFAULTS.support_hours_pt,
        support_hours_en:
          text("support_hours", "en") ?? PLATFORM_SETTINGS_DEFAULTS.support_hours_en,
        maintenance_mode: maintenanceMode,
        maintenance_duration: num(
          "maintenance_duration",
          PLATFORM_SETTINGS_DEFAULTS.maintenance_duration
        ),
        maintenance_duration_unit: unit === "days" ? "days" : "hours",
        maintenance_until: maintenanceUntil,
        maintenance_active: resolveMaintenance(maintenanceMode, maintenanceUntil).active,
        signup_open: bool("signup_open", PLATFORM_SETTINGS_DEFAULTS.signup_open),
        trial_days_default: num(
          "trial_days_default",
          PLATFORM_SETTINGS_DEFAULTS.trial_days_default
        ),
      }
    } catch {
      return { ...PLATFORM_SETTINGS_DEFAULTS }
    }
  }

  /** Persiste as configurações (upsert por chave) e registra auditoria. */
  static async save(input: PlatformSettingsInput, adminId?: string): Promise<boolean> {
    try {
      const parsed = platformSettingsSchema.parse(input)
      const supabase = await this.getSupabase()

      // Estado atual: define se a janela de manutenção deve ser recalculada.
      const { data: current } = await supabase
        .from("platform_settings")
        .select("key, value_pt, value_json, value_num")
        .in("key", MAINTENANCE_KEYS)

      const previous = new Map<string, SettingsDbRow>()
      for (const row of (current ?? []) as unknown as SettingsDbRow[]) {
        previous.set(row.key, row)
      }
      const previousMode = previous.get("maintenance_mode")?.value_json === true
      const previousUntilRaw = previous.get("maintenance_until")?.value_pt
      const previousUntil = typeof previousUntilRaw === "string" ? previousUntilRaw : null
      const previousDurationRaw = previous.get("maintenance_duration")?.value_num
      const previousUnitRaw = previous.get("maintenance_duration_unit")?.value_pt

      let maintenanceUntil: string | null = null
      if (parsed.maintenance_mode) {
        const durationChanged =
          (typeof previousDurationRaw === "number" ? Number(previousDurationRaw) : null) !==
            parsed.maintenance_duration ||
          (typeof previousUnitRaw === "string" ? previousUnitRaw : null) !==
            parsed.maintenance_duration_unit

        // Recria a janela ao ativar, ao alterar a duração, quando não há prazo
        // definido ou quando a janela anterior já expirou.
        const expired =
          !previousUntil || new Date(previousUntil).getTime() <= Date.now()
        if (!previousMode || durationChanged || expired) {
          maintenanceUntil = addDuration(
            new Date(),
            parsed.maintenance_duration,
            parsed.maintenance_duration_unit
          ).toISOString()
        } else {
          maintenanceUntil = previousUntil
        }
      }

      const rows = [
        {
          key: "brand_name",
          value_pt: parsed.brand_name_pt || null,
          value_en: parsed.brand_name_en || null,
          value_json: null,
          value_num: null,
        },
        {
          key: "brand_tagline",
          value_pt: parsed.brand_tagline_pt || null,
          value_en: parsed.brand_tagline_en || null,
          value_json: null,
          value_num: null,
        },
        {
          key: "support_email",
          value_pt: parsed.support_email || null,
          value_en: null,
          value_json: null,
          value_num: null,
        },
        {
          key: "support_whatsapp",
          value_pt: parsed.support_whatsapp || null,
          value_en: null,
          value_json: null,
          value_num: null,
        },
        {
          key: "support_hours",
          value_pt: parsed.support_hours_pt || null,
          value_en: parsed.support_hours_en || null,
          value_json: null,
          value_num: null,
        },
        {
          key: "maintenance_mode",
          value_pt: null,
          value_en: null,
          value_json: parsed.maintenance_mode,
          value_num: null,
        },
        {
          key: "maintenance_duration",
          value_pt: null,
          value_en: null,
          value_json: null,
          value_num: parsed.maintenance_duration,
        },
        {
          key: "maintenance_duration_unit",
          value_pt: parsed.maintenance_duration_unit,
          value_en: null,
          value_json: null,
          value_num: null,
        },
        {
          key: "maintenance_until",
          value_pt: maintenanceUntil,
          value_en: null,
          value_json: null,
          value_num: null,
        },
        {
          key: "signup_open",
          value_pt: null,
          value_en: null,
          value_json: parsed.signup_open,
          value_num: null,
        },
        {
          key: "trial_days_default",
          value_pt: null,
          value_en: null,
          value_json: null,
          value_num: parsed.trial_days_default,
        },
      ].map((row) => ({ ...row, updated_by_id: adminId ?? null }))

      const { error } = await supabase
        .from("platform_settings")
        .upsert(rows as never, { onConflict: "key" })

      if (error) return false

      void AuditLogService.log({
        adminId,
        action: "platform_settings.update",
        entity_type: "platform_settings",
        details: {
          keys: rows.map((row) => row.key),
          maintenance_mode: parsed.maintenance_mode,
          maintenance_until: maintenanceUntil,
          signup_open: parsed.signup_open,
        },
      })

      return true
    } catch {
      return false
    }
  }
}

/** Usado pelos gates (layout do aluno). Cacheado por request. */
export const getMaintenanceStatus = cache(
  async (): Promise<{ active: boolean; until: string | null }> => {
    try {
      const supabase = await createServiceClientSSR()
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value_pt, value_json")
        .in("key", ["maintenance_mode", "maintenance_until"])

      const byKey = new Map<string, SettingsDbRow>()
      for (const row of (data ?? []) as unknown as SettingsDbRow[]) {
        byKey.set(row.key, row)
      }
      const mode = byKey.get("maintenance_mode")?.value_json === true
      const untilRaw = byKey.get("maintenance_until")?.value_pt
      const until = typeof untilRaw === "string" ? untilRaw : null
      return resolveMaintenance(mode, until)
    } catch {
      return { active: false, until: null }
    }
  }
)

/** Usado pelo gate de cadastro. Cacheado por request. */
export const isSignupOpen = cache(async (): Promise<boolean> => {
  try {
    const supabase = await createServiceClientSSR()
    const { data } = await supabase
      .from("platform_settings")
      .select("value_json")
      .eq("key", "signup_open")
      .maybeSingle()

    const value = (data as { value_json?: unknown } | null)?.value_json
    return typeof value === "boolean" ? value : PLATFORM_SETTINGS_DEFAULTS.signup_open
  } catch {
    return PLATFORM_SETTINGS_DEFAULTS.signup_open
  }
})

/** WhatsApp de suporte configurado no admin (usado no fluxo de "esqueci minha senha"). */
export async function getSupportWhatsapp(): Promise<string> {
  try {
    const supabase = await createServiceClientSSR()
    const { data } = await supabase
      .from("platform_settings")
      .select("value_pt")
      .eq("key", "support_whatsapp")
      .maybeSingle()

    const value = (data as { value_pt?: unknown } | null)?.value_pt
    return typeof value === "string" ? value : ""
  } catch {
    return ""
  }
}
