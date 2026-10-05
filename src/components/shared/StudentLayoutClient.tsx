"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { MoreHorizontal, LogOut } from "lucide-react";

interface StudentLayoutClientProps {
  locale: string;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  subscriptionAllowed: boolean;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}

export function StudentLayoutClient({
  locale,
  firstName,
  lastName,
  photoUrl,
  subscriptionAllowed,
  onLogout,
  children,
}: StudentLayoutClientProps) {
  const t = useTranslations("navigation");
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!subscriptionAllowed) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-lg text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
            <MoreHorizontal size={28} />
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
      <div className="flex">
        <Sidebar locale={locale} />
        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 md:py-10 pb-28 md:pb-10">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav locale={locale} />
    </div>
  );
}
