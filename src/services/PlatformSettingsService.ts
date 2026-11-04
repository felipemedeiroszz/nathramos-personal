import { cache } from "react";
import { createServiceClientSSR } from "../lib/supabase/server";
import { DatabaseOperationError } from "@/lib/supabase/errors";
import { platformSettingsSchema, type PlatformSettingsInput } from "../schemas/settings";
import { PUBLIC_SETTINGS_DEFAULTS, whatsappDigits, type PublicPlatformSettings } from "@/lib/platform/publicSettings";

export type MaintenanceUnit = "hours" | "days";
export type PlatformSettingsForm = PublicPlatformSettings & {
  maintenance_mode: boolean; maintenance_duration: number; maintenance_duration_unit: MaintenanceUnit;
  maintenance_until: string | null; maintenance_active: boolean; signup_open: boolean; trial_days_default: number;
  revision?: string | null;
};
export const PLATFORM_SETTINGS_DEFAULTS: PlatformSettingsForm = {
  ...PUBLIC_SETTINGS_DEFAULTS, maintenance_mode: false, maintenance_duration: 24,
  maintenance_duration_unit: "hours", maintenance_until: null, maintenance_active: false,
  signup_open: true, trial_days_default: 0, revision: null,
};
export const SETTINGS_KEYS = ["brand_name", "brand_tagline", "support_email", "support_whatsapp", "support_hours", "maintenance_mode", "maintenance_duration", "maintenance_duration_unit", "maintenance_until", "signup_open", "trial_days_default"];
export const MAINTENANCE_KEYS = ["maintenance_mode", "maintenance_until", "maintenance_duration", "maintenance_duration_unit"];
type SettingsDbRow = { key: string; value_pt: string | null; value_en: string | null; value_json: unknown; value_num: number | null; updated_at: string };

export function resolveMaintenance(mode: boolean, until: string | null, now = Date.now()) {
  if (!mode) return { active: false, until: null };
  if (!until) return { active: true, until: null };
  const end = Date.parse(until);
  if (!Number.isFinite(end)) throw new Error("Prazo de manutenção inválido.");
  return { active: end > now, until };
}
function check<T>(response: { data: T | null; error: any }, operation: string): T {
  if (response.error) throw new DatabaseOperationError(operation, response.error);
  if (response.data === null) throw new Error("Não foi possível ler as configurações.");
  return response.data;
}
function formFromRows(rows: SettingsDbRow[]): PlatformSettingsForm {
  const map = new Map(rows.map(r => [r.key, r]));
  if (SETTINGS_KEYS.some(key => !map.has(key))) throw new Error("Configurações incompletas. Confira as migrações do banco.");
  const text = (key: string, lang: "pt" | "en", fallback = "") => {
    const value = map.get(key)?.[lang === "pt" ? "value_pt" : "value_en"];
    return typeof value === "string" ? value : fallback;
  };
  const boolean = (key: string) => {
    const value = map.get(key)?.value_json;
    if (typeof value !== "boolean") throw new Error("Configuração de acesso inválida.");
    return value;
  };
  const mode = boolean("maintenance_mode"), until = text("maintenance_until", "pt") || null;
  const duration = Number(map.get("maintenance_duration")?.value_num);
  const unit = text("maintenance_duration_unit", "pt");
  if (!Number.isInteger(duration) || duration < 1 || duration > 8760 || !["hours", "days"].includes(unit)) throw new Error("Duração de manutenção inválida.");
  const timestamps = rows.filter(r => SETTINGS_KEYS.includes(r.key)).map(r => r.updated_at);
  if (timestamps.some(v => !v || !Number.isFinite(Date.parse(v)))) throw new Error("Não foi possível verificar a versão das configurações.");
  return {
    brand_name_pt: text("brand_name", "pt", PUBLIC_SETTINGS_DEFAULTS.brand_name_pt),
    brand_name_en: text("brand_name", "en", PUBLIC_SETTINGS_DEFAULTS.brand_name_en),
    brand_tagline_pt: text("brand_tagline", "pt", PUBLIC_SETTINGS_DEFAULTS.brand_tagline_pt),
    brand_tagline_en: text("brand_tagline", "en", PUBLIC_SETTINGS_DEFAULTS.brand_tagline_en),
    support_email: text("support_email", "pt"), support_whatsapp: text("support_whatsapp", "pt"),
    support_hours_pt: text("support_hours", "pt"), support_hours_en: text("support_hours", "en"),
    maintenance_mode: mode, maintenance_duration: duration, maintenance_duration_unit: unit as MaintenanceUnit,
    maintenance_until: until, maintenance_active: resolveMaintenance(mode, until).active,
    signup_open: boolean("signup_open"), trial_days_default: 0,
    revision: timestamps.sort().at(-1)!,
  };
}

export class PlatformSettingsService {
  static async getForm(): Promise<PlatformSettingsForm> {
    const db = await createServiceClientSSR();
    const rows = check(await (db.from("platform_settings") as any).select("key,value_pt,value_en,value_json,value_num,updated_at").in("key", SETTINGS_KEYS), "settings.read") as SettingsDbRow[];
    return formFromRows(rows);
  }
  /** Version check, maintenance deadline, settings and audit are committed together. */
  static async save(input: PlatformSettingsInput, adminId?: string): Promise<PlatformSettingsForm> {
    const parsed = platformSettingsSchema.parse(input);
    if (!adminId || !parsed.revision) throw new Error("Recarregue as configurações antes de salvar.");
    const db = await createServiceClientSSR();
    const response = await (db.rpc as any)("admin_save_platform_settings", { p_actor: adminId, p_input: parsed, p_expected: parsed.revision });
    if (response.error?.message?.includes("SETTINGS_CONFLICT")) throw new Error("As configurações foram alteradas em outra sessão. Recarregue antes de salvar.");
    return formFromRows(check(response, "settings.save") as SettingsDbRow[]);
  }
}

/** Read public fields only; privileged settings never become client props. */
export const getPublicPlatformSettings = cache(async (): Promise<PublicPlatformSettings> => {
  try {
    const db = await createServiceClientSSR();
    const rows = check(await (db.from("platform_settings") as any).select("key,value_pt,value_en").in("key", ["brand_name", "brand_tagline", "support_email", "support_whatsapp", "support_hours"]), "settings.public") as SettingsDbRow[];
    const map = new Map(rows.map(r => [r.key, r]));
    const value = (key: string, lang: "pt" | "en", fallback = "") => map.get(key)?.[lang === "pt" ? "value_pt" : "value_en"] ?? fallback;
    return {
      brand_name_pt: value("brand_name", "pt") || PUBLIC_SETTINGS_DEFAULTS.brand_name_pt,
      brand_name_en: value("brand_name", "en") || PUBLIC_SETTINGS_DEFAULTS.brand_name_en,
      brand_tagline_pt: value("brand_tagline", "pt", PUBLIC_SETTINGS_DEFAULTS.brand_tagline_pt),
      brand_tagline_en: value("brand_tagline", "en", PUBLIC_SETTINGS_DEFAULTS.brand_tagline_en),
      support_email: value("support_email", "pt"), support_whatsapp: whatsappDigits(value("support_whatsapp", "pt")),
      support_hours_pt: value("support_hours", "pt"), support_hours_en: value("support_hours", "en"),
    };
  } catch {
    console.error("[settings] public_contact_unavailable");
    return { ...PUBLIC_SETTINGS_DEFAULTS };
  }
});
export const getMaintenanceStatus = cache(async () => {
  const db = await createServiceClientSSR();
  const rows = check(await (db.from("platform_settings") as any).select("key,value_pt,value_json").in("key", ["maintenance_mode", "maintenance_until"]), "settings.maintenance") as SettingsDbRow[];
  const mode = rows.find(r => r.key === "maintenance_mode"), until = rows.find(r => r.key === "maintenance_until");
  if (typeof mode?.value_json !== "boolean" || !until) throw new Error("Não foi possível verificar a disponibilidade da plataforma.");
  return resolveMaintenance(mode.value_json, until.value_pt || null);
});
/** A failed or missing setting never opens enrollment. */
export const isSignupOpen = cache(async (): Promise<boolean> => {
  try {
    const db = await createServiceClientSSR();
    const row = check(await (db.from("platform_settings") as any).select("value_json").eq("key", "signup_open").maybeSingle(), "settings.signup") as { value_json: unknown };
    return row.value_json === true;
  } catch {
    console.error("[settings] signup_availability_unavailable");
    return false;
  }
});
export async function getSupportWhatsapp(): Promise<string> {
  return (await getPublicPlatformSettings()).support_whatsapp;
}
