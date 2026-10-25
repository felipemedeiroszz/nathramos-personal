"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Dumbbell,
  UtensilsCrossed,
  TrendingUp,
  MoreHorizontal,
} from "lucide-react";
import { MaisDrawer } from "./MaisDrawer";

interface MobileBottomNavProps {
  locale: string;
}

export function MobileBottomNav({ locale }: MobileBottomNavProps) {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  type NavItemKey = "dashboard" | "diet" | "training" | "performance" | "more";

  const navItems: {
    key: NavItemKey;
    href: string;
    icon: React.ReactNode;
    isDrawer?: boolean;
  }[] = [
    { key: "dashboard", href: `/${locale}/dashboard`, icon: <LayoutDashboard size={20} /> },
    { key: "diet", href: `/${locale}/dieta`, icon: <UtensilsCrossed size={20} /> },
    { key: "training", href: `/${locale}/treino`, icon: <Dumbbell size={20} /> },
    { key: "performance", href: `/${locale}/progresso`, icon: <TrendingUp size={20} /> },
    { key: "more", href: `/${locale}/mais`, icon: <MoreHorizontal size={20} />, isDrawer: true },
  ];

  const labelForKey = (key: NavItemKey) => {
    switch (key) {
      case "dashboard": return t("dashboard");
      case "diet": return t("diet");
      case "training": return t("training");
      case "performance": return t("performance");
      case "more": return t("more");
    }
  };

  const isItemActive = (href: string) => {
    const rest = href.slice(`/${locale}`.length);
    if (rest === "/dashboard") return pathname === href || pathname === `${href}/`;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const activeIndex = navItems.findIndex((item) => isItemActive(item.href));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border pb-safe md:hidden z-40">
        <div className="relative flex items-center justify-around h-16 px-2">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const content = (
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full w-full transition-colors",
                  isActive ? "text-primary" : "text-text-secondary"
                )}
              >
                {isActive && (
                  <div className="absolute -top-3 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                    <div className="text-primary-foreground">{item.icon}</div>
                  </div>
                )}
                {!isActive && <div className="mb-1">{item.icon}</div>}
                <span className={cn("text-xs font-medium", isActive ? "mt-6" : "")}>
                  {labelForKey(item.key)}
                </span>
              </div>
            );
            if (item.isDrawer) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  aria-label={labelForKey(item.key)}
                  className="flex-1 h-full flex items-center justify-center"
                >
                  {content}
                </button>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="flex-1 h-full flex items-center justify-center"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>
      <MaisDrawer locale={locale} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
