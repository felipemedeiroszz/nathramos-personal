"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { NotificationBell } from "@/components/shared/NotificationBell";
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
  maintenance,
  onLogout,
  children,
}: StudentLayoutClientProps) {
  const t = useTranslations("navigation");
  const localeTag = useLocale();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (maintenance.active) {
    const date = maintenance.until ? new Date(maintenance.until) : null;
    const untilLabel =
      date && !Number.isNaN(date.getTime())
        ? new Intl.DateTimeFormat(localeTag, {
            dateStyle: "short",
            timeStyle: "short",
          }).format(date)
        : null;

    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Wrench size={28} />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">{t("maintenanceTitle")}</h1>
          <p className="text-text-secondary mb-4">{t("maintenanceDescription")}</p>
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

  if (!subscriptionAllowed) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-border bg-surface-secondary flex items-center justify-center text-primary">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">{t("blockedTitle")}</h1>
          <p className="text-text-secondary mb-6">{t("blockedDescription")}</p>
          <button
            onClick={() => router.push(`/${locale}/planos`)}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
          >
            {t("blockedCta")}
          </button>
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
    <div className="min-h-dvh bg-background">
      <PushNotificationManager />
      <div className="flex">
        <Sidebar locale={locale} />
        <main className="flex-1 min-w-0">
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:justify-end md:px-6">
            <Link href={`/${locale}/dashboard`} className="relative h-9 w-24 md:hidden" aria-label="Nath Ramos">
              <Image src="/logo.png" alt="Nath Ramos" fill className="object-contain object-left" priority />
            </Link>
            <NotificationBell
              locale={locale}
              namespace="studentNotifications"
              viewAllHref={`/${locale}/notificacoes`}
            />
          </div>
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-10">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav locale={locale} />
    </div>
  );
}
