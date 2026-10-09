"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";
import {
  Bell,
  ChevronDown,
  LogOut,
} from "lucide-react";

interface AdminHeaderProps {
  locale: string;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  role: string;
  onLogout: () => Promise<void> | void;
  onLanguageChange?: (newLocale: string) => void;
}

export function AdminHeader({
  locale,
  firstName,
  lastName,
  photoUrl,
  role,
  onLogout,
  onLanguageChange,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const tCommon = useTranslations("common");
  const tNav = useTranslations("adminNav");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const locales = [
    { code: "pt-BR", label: "Português", flag: "🇧🇷" },
    { code: "en-US", label: "English", flag: "🇺🇸" },
  ];

  const currentLocale = locales.find((l) => l.code === locale) || locales[0];

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < 2 || segments[1] !== "admin") return [];

    const breadcrumbs = [
      { label: tNav("dashboard") || "Dashboard", href: `/${locale}/admin/dashboard` },
    ];

    for (let i = 2; i < segments.length; i++) {
      const segment = segments[i];
      const href = `/${locale}/${segments.slice(0, i + 1).join("/")}`;
      
      // Try to translate the segment
      let label = segment;
      try {
        const translated = tNav(segment);
        if (translated && translated !== segment) {
          label = translated;
        }
      } catch {}

      breadcrumbs.push({ label, href });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm overflow-hidden">
          {breadcrumbs.length > 1 && (
            <>
              {breadcrumbs.slice(0, -1).map((crumb, idx) => (
                <Link
                  key={crumb.href}
                  href={crumb.href}
                  className="text-text-secondary hover:text-text transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              ))}
              <span className="text-text-secondary">/</span>
            </>
          )}
          <h1 className="font-semibold text-text truncate">{pageTitle}</h1>
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Language selector */}
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="text-lg">{currentLocale.flag}</span>
                <span className="hidden md:inline">{currentLocale.label}</span>
                <ChevronDown size={14} />
              </Button>
            }
          >
            <DropdownMenuContent>
              {locales.map((loc) => (
                <DropdownMenuItem
                  key={loc.code}
                  onClick={() => {
                    if (onLanguageChange && loc.code !== locale) {
                      onLanguageChange(loc.code);
                    }
                    setLanguageOpen(false);
                  }}
                  className={cn(loc.code === locale && "bg-surface-secondary")}
                >
                  <span className="mr-2 text-lg">{loc.flag}</span>
                  {loc.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
          </Button>

          {/* User menu - simplified for now */}
          <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
            <Avatar
              src={photoUrl || undefined}
              alt={firstName || "User"}
              size="sm"
              fallback={firstName?.[0] || "A"}
            />
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-text">
                {firstName || "Admin"}
              </p>
              <p className="text-xs text-text-secondary capitalize">
                {role}
              </p>
            </div>
            <LogOut size={14} className="hidden md:block ml-2" />
          </Button>
        </div>
      </div>
    </header>
  );
}
