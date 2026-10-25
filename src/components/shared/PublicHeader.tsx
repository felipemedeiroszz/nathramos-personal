"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Menu, X } from "lucide-react";
import Image from "next/image";

const publicNavItems = [
  { navKey: "home", href: "" },
  { navKey: "about", href: "/sobre" },
  { navKey: "howItWorks", href: "/como-funciona" },
  { navKey: "workouts", href: "/treinos" },
  { navKey: "diets", href: "/dietas" },
  { navKey: "performance", href: "/desempenho" },
  { navKey: "mentoring", href: "/mentoria" },
  { navKey: "plans", href: "/planos" },
  { navKey: "faq", href: "/faq" },
] as const;

export function PublicHeader({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    const base = `/${locale}${href}`;
    if (href === "") return pathname === `/${locale}`;
    return pathname.startsWith(base);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <div className="relative h-10 w-10">
            <Image
              src="/logo.png"
              alt="Nath Ramos"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {publicNavItems.map((item) => (
            <Link
              key={item.navKey}
              href={`/${locale}${item.href}`}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "text-primary"
                  : "text-text-secondary hover:text-text hover:bg-surface-secondary"
              )}
            >
              {t(item.navKey)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/login`}>{t("login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/${locale}/cadastro`}>{t("signup")}</Link>
          </Button>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-secondary hover:text-text hover:bg-surface-secondary transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-surface lg:hidden">
          <div className="space-y-1 px-4 py-4">
            {publicNavItems.map((item) => (
              <Link
                key={item.navKey}
                href={`/${locale}${item.href}`}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:text-text hover:bg-surface-secondary"
                )}
              >
                {t(item.navKey)}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-border space-y-3">
              <LanguageSwitcher />
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link href={`/${locale}/login`}>{t("login")}</Link>
                </Button>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/${locale}/cadastro`}>{t("signup")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
