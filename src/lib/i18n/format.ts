import { Locale } from "@/i18n/config";

const currencyLocales: Record<Locale, string> = {
  "pt-BR": "pt-BR",
  "en-US": "en-US",
};

const currencyCodes: Record<Locale, string> = {
  "pt-BR": "BRL",
  "en-US": "USD",
};

export function formatCurrency(
  amount: number,
  currency: string = "BRL",
  locale: Locale = "pt-BR"
): string {
  try {
    return new Intl.NumberFormat(currencyLocales[locale], {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatCurrencyByLocale(
  amount: number,
  locale: Locale = "pt-BR"
): string {
  return formatCurrency(amount, currencyCodes[locale], locale);
}

export function formatDate(
  date: Date | string,
  locale: Locale = "pt-BR",
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(currencyLocales[locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...options,
    }).format(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(date);
  }
}

export function formatDateTime(
  date: Date | string,
  locale: Locale = "pt-BR",
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(currencyLocales[locale], {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    }).format(dateObj);
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return String(date);
  }
}

export function formatTime(
  date: Date | string,
  locale: Locale = "pt-BR",
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(currencyLocales[locale], {
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    }).format(dateObj);
  } catch (error) {
    console.error("Error formatting time:", error);
    return String(date);
  }
}

export function formatRelativeTime(
  date: Date | string,
  locale: Locale = "pt-BR"
): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(currencyLocales[locale], {
      numeric: "auto",
    });

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, "second");
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return rtf.format(-diffInMinutes, "minute");
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return rtf.format(-diffInHours, "hour");
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return rtf.format(-diffInDays, "day");
    }
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return rtf.format(-diffInMonths, "month");
    }
    const diffInYears = Math.floor(diffInMonths / 12);
    return rtf.format(-diffInYears, "year");
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return String(date);
  }
}

export function formatNumber(
  value: number,
  locale: Locale = "pt-BR",
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(currencyLocales[locale], options).format(value);
  } catch (error) {
    console.error("Error formatting number:", error);
    return String(value);
  }
}

export function formatPercent(
  value: number,
  locale: Locale = "pt-BR",
  options?: Intl.NumberFormatOptions
): string {
  return formatNumber(value, locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  });
}
