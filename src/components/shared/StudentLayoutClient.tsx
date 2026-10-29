"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { StudentHeader } from "@/components/shared/StudentHeader";
import { PushNotificationManager } from "@/components/shared/PushNotificationManager";
import { ShieldAlert, LogOut, Wrench } from "lucide-react";

interface MaintenanceInfo {
  active: boolean;
  until: string | null;
}

interface StudentLayoutClientProps {
  locale: string;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  subscriptionAllowed: boolean;
  accessExpiresAt?: string | null;
  maintenance: MaintenanceInfo;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}

export function StudentLayoutClient({
  locale,
  firstName,
  lastName,
  photoUrl,
  subscriptionAllowed,
  accessExpiresAt,
  maintenance,
  onLogout,
  children,
}: StudentLayoutClientProps) {
  const t = useTranslations("navigation");
  const localeTag = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isAccount =
    pathname === `/${locale}/account` ||
    pathname === `/${locale}/assinatura` ||
    pathname.startsWith(`/${locale}/assinatura/`);
  const [periodExpired, setPeriodExpired] = useState(() => {
    const expires = Date.parse(accessExpiresAt || "");
    return Number.isFinite(expires) && expires <= Date.now();
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(timer);
      const expires = Date.parse(accessExpiresAt || "");
      const remaining = expires - Date.now();
      setPeriodExpired(Number.isFinite(expires) && remaining <= 0);
      if (remaining > 0)
        timer = setTimeout(check, Math.min(remaining, 2147483647));
    };
    check();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [accessExpiresAt]);

  if (maintenance.active && !isAccount) {
    const date = maintenance.until ? new Date(maintenance.until) : null;
    const untilLabel =
      date && !Number.isNaN(date.getTime())
        ? new Intl.DateTimeFormat(localeTag, {
            dateStyle: "short",
            timeStyle: "short",
          }).format(date)
        : null;

    return (
      <div className="student-shell min-h-dvh flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Wrench size={28} />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">
            {t("maintenanceTitle")}
          </h1>
          <p className="text-text-secondary mb-4">
            {t("maintenanceDescription")}
          </p>
          {untilLabel && (
            <p className="text-sm font-medium text-primary mb-6">
              {t("maintenanceUntil", { date: untilLabel })}
            </p>
          )}
          <button
            onClick={onLogout}
            className="mt-2 w-full h-11 rounded-xl border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            {t("logout")}
          </button>
        </div>
      </div>
    );
  }

  if ((!subscriptionAllowed || periodExpired) && !isAccount) {
    return (
      <div className="student-shell min-h-dvh flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-border bg-surface-secondary flex items-center justify-center text-primary">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">
            {t("blockedTitle")}
          </h1>
          <p className="text-text-secondary mb-6">{t("blockedDescription")}</p>
          <button
            onClick={() => router.push(`/${locale}/assinatura`)}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
          >
            {t("blockedCta")}
          </button>
          <Link
            href={`/${locale}/account`}
            className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-border text-sm text-text-secondary transition hover:text-primary"
          >
            {locale === "en-US" ? "View my account" : "Consultar minha conta"}
          </Link>
          <button
            onClick={onLogout}
            className="mt-4 w-full h-11 rounded-xl border border-border text-text-secondary hover:text-text hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            {t("logout")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-shell min-h-dvh bg-background text-text">
      <a
        href="#student-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        {locale === "en-US" ? "Skip to content" : "Ir para o conteúdo"}
      </a>
      <PushNotificationManager />
      <div className="flex items-start">
        <Sidebar locale={locale} />
        <div className="min-w-0 flex-1">
          <StudentHeader
            locale={locale}
            firstName={firstName}
            photoUrl={photoUrl}
          />
          <main
            id="student-main"
            tabIndex={-1}
            className="student-content mx-auto w-full max-w-[1440px] px-4 py-6 pb-28 outline-none sm:px-6 md:py-8 md:pb-10 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav locale={locale} />
    </div>
  );
}
