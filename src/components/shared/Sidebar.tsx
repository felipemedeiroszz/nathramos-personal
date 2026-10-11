"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Dumbbell,
  UtensilsCrossed,
  TrendingUp,
  MoreHorizontal,
  User,
  LogOut,
  Loader2,
} from "lucide-react";
import { MaisDrawer } from "./MaisDrawer";
import { logoutAction } from "@/app/actions/account";

interface SidebarProps {
  locale: string;
}

export function Sidebar({ locale }: SidebarProps) {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  type NavItemKey = "dashboard" | "training" | "diet" | "performance" | "more";

  const navItems: {
    key: NavItemKey;
    href: string;
    icon: React.ReactNode;
    isDrawer?: boolean;
  }[] = [
    { key: "dashboard", href: `/${locale}/dashboard`, icon: <LayoutDashboard size={20} /> },
    { key: "training", href: `/${locale}/treino`, icon: <Dumbbell size={20} /> },
    { key: "diet", href: `/${locale}/dieta`, icon: <UtensilsCrossed size={20} /> },
    { key: "performance", href: `/${locale}/progresso`, icon: <TrendingUp size={20} /> },
    { key: "more", href: `/${locale}/mais`, icon: <MoreHorizontal size={20} />, isDrawer: true },
  ];

  const labelForKey = (key: NavItemKey) => {
    switch (key) {
      case "dashboard": return t("dashboard");
      case "training": return t("training");
      case "diet": return t("diet");
      case "performance": return t("performance");
      case "more": return t("more");
    }
  };

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 h-screen bg-surface border-r border-border sticky top-0">
        <div className="p-6">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-3">
            <div className="relative w-20 h-20 shrink-0 drop-shadow-[0_0_12px_hsl(var(--primary)/0.3)]">
              <Image
                src="/logo.png"
                alt="Nath Ramos"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.endsWith(item.href.slice(item.href.lastIndexOf("/"))) || (item.href !== `/${locale}/dashboard` && pathname.includes(item.href.slice(`/${locale}`.length)));
              return (
                <li key={item.href}>
                  {item.isDrawer ? (
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-text-secondary hover:text-text hover:bg-surface-secondary"
                      )}
                    >
                      {item.icon}
                      <span className="font-medium">{labelForKey(item.key)}</span>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-text-secondary hover:text-text hover:bg-surface-secondary"
                      )}
                    >
                      {item.icon}
                      <span className="font-medium">{labelForKey(item.key)}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <Link
            href={`/${locale}/account`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:text-text hover:bg-surface-secondary transition-colors"
          >
            <User size={20} />
            <span className="font-medium">{t("account")}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <LogOut size={20} />
            )}
            <span className="font-medium">{t("logout")}</span>
          </button>
        </div>
      </aside>
      <MaisDrawer locale={locale} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
