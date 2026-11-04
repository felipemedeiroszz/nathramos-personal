export type PublicPlatformSettings = {
  brand_name_pt: string; brand_name_en: string;
  brand_tagline_pt: string; brand_tagline_en: string;
  support_email: string; support_whatsapp: string;
  support_hours_pt: string; support_hours_en: string;
};

export const PUBLIC_SETTINGS_DEFAULTS: PublicPlatformSettings = {
  brand_name_pt: "Nath Ramos", brand_name_en: "Nath Ramos",
  brand_tagline_pt: "Personal Trainer", brand_tagline_en: "Personal Trainer",
  support_email: "", support_whatsapp: "", support_hours_pt: "", support_hours_en: "",
};

/** International phone number, with country code; optional formatting is accepted. */
export function whatsappDigits(value: string): string {
  if (!/^\+?[\d\s().-]+$/.test(value.trim())) return "";
  const digits = value.replace(/\D/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) && !/^(\d)\1+$/.test(digits) ? digits : "";
}

export function localizedBrand(settings: PublicPlatformSettings, locale: string) {
  return locale === "en-US"
    ? { name: settings.brand_name_en, tagline: settings.brand_tagline_en, hours: settings.support_hours_en }
    : { name: settings.brand_name_pt, tagline: settings.brand_tagline_pt, hours: settings.support_hours_pt };
}
