export const locales = ["pt-BR", "en-US"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-BR";

export const localeNames: Record<Locale, string> = {
  "pt-BR": "Português",
  "en-US": "English",
};

export const localeCodes: Record<Locale, string> = {
  "pt-BR": "PT",
  "en-US": "EN",
};
