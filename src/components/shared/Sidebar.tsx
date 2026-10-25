"use client";

import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";
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
  CreditCard,
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
  const searchParams = useSearchParams();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onAccountPage = pathname === `/${locale}/account` || pathname === `/${locale}/account/`;
  const isMembershipTab = searchParams.get("tab") === "subscription";

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

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

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border bg-surface md:flex">
        <div className="p-6">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-3">
            <div className="relative h-20 w-20 shrink-0 drop-shadow-[0_0_12px_hsl(var(--primary)/0.3)]">
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

        <nav className="flex-1 px-3" aria-label={t("moreOptions")}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = isItemActive(item.href) || (item.isDrawer && isDrawerOpen);
              const classes = cn(
                "relative flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text"
              );
              const content = (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-primary w-1" />
                  )}
                  <span className={cn(isActive ? "text-primary" : "text-text-secondary")}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{labelForKey(item.key)}</span>
                </>
              );

              return (
                <li key={item.href}>
                  {item.isDrawer ? (
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(true)}
                      className={classes}
                    >
                      {content}
                    </button>
                  ) : (
                    <Link href={item.href} aria-current={isActive ? "page" : undefined} className={classes}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-1 border-t border-border p-3">
          <Link
            href={`/${locale}/account`}
            aria-current={onAccountPage && !isMembershipTab ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
              onAccountPage && !isMembershipTab
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:bg-surface-secondary hover:text-text"
            )}
          >
            <User size={20} />
            <span className="font-medium">{t("account")}</span>
          </Link>
          <Link
            href={`/${locale}/account?tab=subscription`}
            aria-current={onAccountPage && isMembershipTab ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
              onAccountPage && isMembershipTab
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:bg-surface-secondary hover:text-text"
            )}
          >
            <CreditCard size={20} />
            <span className="font-medium">{t("membership")}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text disabled:opacity-50"
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
      <MaisDrawer
        locale={locale}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onLogout={handleLogout}
      />
    </>
  );
}
