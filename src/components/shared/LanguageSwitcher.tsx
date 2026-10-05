"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import Image from "next/image";

const localeImages: Record<Locale, string> = {
  "pt-BR": "/portugues.png",
  "en-US": "/ingles.png",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const switchLocale = (newLocale: Locale) => {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const newPath = segments.join("/");
    window.location.href = newPath;
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors text-text"
        aria-label="Change language"
      >
        <div className="relative w-7 h-7 rounded-md overflow-hidden">
          <Image
            src={localeImages[locale]}
            alt={locale}
            fill
            className="object-cover"
          />
        </div>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {locales.map((loc) => (
              <button
                key={loc}
                onClick={() => switchLocale(loc)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  loc === locale
                    ? "bg-surface-secondary text-primary"
                    : "text-text hover:bg-surface-secondary"
                }`}
              >
                <div className="relative w-7 h-7 rounded-md overflow-hidden">
                  <Image
                    src={localeImages[loc]}
                    alt={loc}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-sm font-medium capitalize">{loc}</span>
                {loc === locale && <Check size={16} className="ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
