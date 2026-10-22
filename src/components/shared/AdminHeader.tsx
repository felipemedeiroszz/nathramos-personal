"use client";

import { Fragment, useState } from "react";
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
  Menu,
} from "lucide-react";

interface AdminHeaderProps {
  locale: string;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  role: string;
  onLogout: () => Promise<void> | void;
  onLanguageChange?: (newLocale: string) => void;
  onMenuToggle?: () => void;
}

export function AdminHeader({
  locale,
  firstName,
  lastName,
  photoUrl,
  role,
  onLogout,
  onLanguageChange,
  onMenuToggle,
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

  // Mapeia cada segmento de rota para a chave correspondente em `adminNav`.
  const ROUTE_NAV_KEYS: Record<string, { key: string; fallback: string }> = {
    dashboard: { key: "dashboard", fallback: "Painel" },
    alunos: { key: "students", fallback: "Alunos" },
    treinos: { key: "workouts", fallback: "Treinos" },
    alimentos: { key: "foods", fallback: "Alimentos" },
    suplementos: { key: "supplements", fallback: "Suplementos" },
    exames: { key: "exams", fallback: "Exames" },
    ebooks: { key: "ebooks", fallback: "E-books" },
    mentoria: { key: "mentoria", fallback: "Mentoria" },
    reunioes: { key: "meetings", fallback: "Reuniões" },
    notificacoes: { key: "notifications", fallback: "Notificações" },
    "redes-sociais": { key: "social", fallback: "Redes Sociais" },
    planos: { key: "plans", fallback: "Planos" },
    assinaturas: { key: "subscriptions", fallback: "Assinaturas" },
    pagamentos: { key: "payments", fallback: "Pagamentos" },
    financeiro: { key: "financeiro", fallback: "Financeiro" },
    configuracoes: { key: "settings", fallback: "Configurações" },
    auditoria: { key: "audit", fallback: "Auditoria" },
    conta: { key: "account", fallback: "Minha Conta" },
  };

  const KIT_NAV_KEYS: Record<string, { key: string; fallback: string }> = {
    treinos: { key: "workoutKits", fallback: "Kits de Treino" },
    dietas: { key: "dietKits", fallback: "Kits de Dieta" },
    suplementos: { key: "supplementKits", fallback: "Kits de Suplementos" },
  };

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Resolve o rótulo traduzido com fallback seguro (evita exibir a chave crua).
  const resolveNavLabel = (key: string, fallback: string): string => {
    try {
      const has = (tNav as any).has;
      if (typeof has === "function") {
        return has.call(tNav, key) ? tNav(key) : fallback;
      }
      const value = tNav(key);
      if (value && value !== key && value !== `adminNav.${key}`) return value;
    } catch {}
    return fallback;
  };

  const prettifySegment = (segment: string) =>
    segment
      .split("-")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  // Gera o caminho (breadcrumb) a partir da URL: Painel / Alimentos / ...
  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const adminIndex = segments.indexOf("admin");
    if (adminIndex === -1) return [];

    const breadcrumbs = [
      {
        label: resolveNavLabel("dashboard", "Painel"),
        href: `/${locale}/admin/dashboard`,
      },
    ];

    const rest = segments.slice(adminIndex + 1).filter((segment) => segment !== "new");
    const pathParts: string[] = [];

    for (let i = 0; i < rest.length; i++) {
      const segment = rest[i];

      // Agrupa subrotas de kits: /admin/kits/treinos -> "Kits de Treino".
      if (segment === "kits" && rest[i + 1]) {
        const kitNav = KIT_NAV_KEYS[rest[i + 1]];
        if (kitNav) {
          pathParts.push(segment, rest[i + 1]);
          breadcrumbs.push({
            label: resolveNavLabel(kitNav.key, kitNav.fallback),
            href: `/${locale}/admin/${pathParts.join("/")}`,
          });
          i++;
          continue;
        }
      }

      pathParts.push(segment);
      const nav = ROUTE_NAV_KEYS[segment];
      const label = nav
        ? resolveNavLabel(nav.key, nav.fallback)
        : UUID_PATTERN.test(segment)
          ? "Detalhes"
          : prettifySegment(segment);

      breadcrumbs.push({ label, href: `/${locale}/admin/${pathParts.join("/")}` });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <div className="flex h-16 items-center px-4 md:px-6 gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg hover:bg-surface-secondary text-text-secondary shrink-0"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm overflow-hidden min-w-0">
          {breadcrumbs.length > 1 && (
            <>
              {breadcrumbs.slice(0, -1).map((crumb) => (
                <Fragment key={crumb.href}>
                  <Link
                    href={crumb.href}
                    className="text-text-secondary hover:text-text transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                  <span className="text-text-secondary/50 shrink-0">/</span>
                </Fragment>
              ))}
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
