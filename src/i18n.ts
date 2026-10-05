import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, defaultLocale } from "./i18n/config";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  const typedLocale = locale as (typeof locales)[number];

  return {
    locale: typedLocale,
    messages: (await import(`./messages/${typedLocale}.json`)).default,
    timeZone: "America/Sao_Paulo",
    now: new Date(),
  };
});
