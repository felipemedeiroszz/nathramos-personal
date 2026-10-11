"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Tags,
  UtensilsCrossed,
  ClipboardList,
  Pill,
  FileText,
  BookOpen,
  FolderKanban,
  Package,
  Banknote,
  MessageSquare,
  Share2,
  Settings,
  User,
  LogOut,
  Bell,
  Calendar,
  CreditCard,
  DollarSign,
  Shield,
  Menu,
  Activity,
  Apple,
} from "lucide-react";

interface AdminSidebarProps {
  locale: string;
  onLogout?: () => Promise<void> | void;
  isMobile?: boolean;
  onClose?: () => void;
}

type NavSection = {
  titleKey?: string;
  titleFallback: string;
  items: {
    key: string;
    hrefSuffix: string;
    fallback: string;
    icon: React.ReactNode;
  }[];
};

const accountAndLogout = {
  account: {
    hrefSuffix: "/account",
    fallback: "Conta",
    icon: <User size={20} />,
  },
};

export function AdminSidebar({ locale, onLogout, isMobile, onClose }: AdminSidebarProps) {
  const tNav = useTranslations("adminNav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  const sections: NavSection[] = [
    {
      titleKey: "sectionOverview",
      titleFallback: "Visão Geral",
      items: [
        { key: "dashboard", hrefSuffix: "/admin/dashboard", fallback: "Dashboard", icon: <LayoutDashboard size={20} /> },
      ],
    },
    {
      titleKey: "sectionStudentsContent",
      titleFallback: "Alunos & Conteúdo",
      items: [
        { key: "students", hrefSuffix: "/admin/alunos", fallback: "Alunos", icon: <Users size={20} /> },
        { key: "workouts", hrefSuffix: "/admin/treinos", fallback: "Treinos", icon: <Dumbbell size={20} /> },
        { key: "workoutCategories", hrefSuffix: "/admin/categorias-treino", fallback: "Categorias de Treino", icon: <Tags size={20} /> },
        { key: "exercises", hrefSuffix: "/admin/exercicios", fallback: "Exercícios", icon: <Activity size={20} /> },
        { key: "diets", hrefSuffix: "/admin/dietas", fallback: "Dietas", icon: <UtensilsCrossed size={20} /> },
        { key: "dietCategories", hrefSuffix: "/admin/categorias-dieta", fallback: "Categorias de Dieta", icon: <ClipboardList size={20} /> },
        { key: "foods", hrefSuffix: "/admin/alimentos", fallback: "Alimentos", icon: <Apple size={20} /> },
        { key: "supplements", hrefSuffix: "/admin/suplementos", fallback: "Suplementos", icon: <Pill size={20} /> },
        { key: "exams", hrefSuffix: "/admin/exames", fallback: "Exames", icon: <FileText size={20} /> },
        { key: "ebooks", hrefSuffix: "/admin/ebooks", fallback: "Ebooks", icon: <BookOpen size={20} /> },
      ],
    },
    {
      titleKey: "sectionKitsAssignments",
      titleFallback: "Kits & Atribuições",
      items: [
        { key: "workoutKits", hrefSuffix: "/admin/kits/treinos", fallback: "Kits de Treino", icon: <FolderKanban size={20} /> },
        { key: "dietKits", hrefSuffix: "/admin/kits/dietas", fallback: "Kits de Dieta", icon: <UtensilsCrossed size={20} /> },
        { key: "supplementKits", hrefSuffix: "/admin/kits/suplementos", fallback: "Kits de Suplemento", icon: <Package size={20} /> },
      ],
    },
    {
      titleKey: "sectionRelationship",
      titleFallback: "Relacionamento",
      items: [
        { key: "mentoria", hrefSuffix: "/admin/mentoria", fallback: "Mentoria", icon: <MessageSquare size={20} /> },
        { key: "meetings", hrefSuffix: "/admin/reunioes", fallback: "Reuniões", icon: <Calendar size={20} /> },
        { key: "notifications", hrefSuffix: "/admin/notificacoes", fallback: "Notificações", icon: <Bell size={20} /> },
        { key: "social", hrefSuffix: "/admin/redes-sociais", fallback: "Redes Sociais", icon: <Share2 size={20} /> },
      ],
    },
    {
      titleKey: "sectionFinance",
      titleFallback: "Financeiro",
      items: [
        { key: "plans", hrefSuffix: "/admin/planos", fallback: "Planos", icon: <CreditCard size={20} /> },
        { key: "subscriptions", hrefSuffix: "/admin/assinaturas", fallback: "Assinaturas", icon: <CreditCard size={20} /> },
        { key: "payments", hrefSuffix: "/admin/pagamentos", fallback: "Pagamentos", icon: <DollarSign size={20} /> },
        { key: "financeiro", hrefSuffix: "/admin/financeiro", fallback: "Financeiro", icon: <Banknote size={20} /> },
      ],
    },
    {
      titleKey: "sectionSystem",
      titleFallback: "Sistema",
      items: [
        { key: "settings", hrefSuffix: "/admin/configuracoes", fallback: "Configurações", icon: <Settings size={20} /> },
        { key: "audit", hrefSuffix: "/admin/auditoria", fallback: "Auditoria", icon: <Shield size={20} /> },
      ],
    },
  ];

  const labelFor = (key: string, fallback: string) => {
    try {
      if (tNav.has(key)) return tNav(key);
    } catch {}
    return fallback;
  };

  const sectionTitleFor = (titleKey: string | undefined, fallback: string) => {
    if (!titleKey) return fallback;
    try {
      if (tNav.has(titleKey)) return tNav(titleKey);
    } catch {}
    return fallback;
  };

  const isActive = (hrefSuffix: string) => {
    const fullHref = `/${locale}${hrefSuffix}`;
    return pathname.startsWith(fullHref);
  };

  const logoutLabel = (() => {
    try {
      if (tCommon.has("logout")) return tCommon("logout");
    } catch {}
    try {
      if (tNav.has("logout")) return tNav("logout");
    } catch {}
    return "Sair";
  })();

  const accountLabel = labelFor("account", accountAndLogout.account.fallback);

  let itemCounter = 0;
  const nextDelay = (offset = 0) => {
    const delay = 60 * itemCounter + offset;
    itemCounter += 1;
    return `${delay}ms`;
  };

  return (
    <aside className={cn(
      "flex flex-col w-64 h-screen bg-surface border-r border-border overflow-y-auto overflow-x-hidden",
      "relative",
      isMobile ? "fixed" : "hidden md:flex sticky top-0"
    )}>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-accent-slide" />

      <div className="p-6 flex items-center justify-between shrink-0 relative">
        <Link
          href={`/${locale}/admin/dashboard`}
          className="flex items-center gap-3 min-w-0 group"
          onClick={() => isMobile && onClose?.()}
        >
          <div className="relative w-20 h-20 shrink-0 animate-logo-float drop-shadow-[0_0_18px_hsl(var(--primary)/0.35)]">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-glow" />
            <Image
              src="/logo.png"
              alt="Nath Ramos Admin"
              fill
              className="object-contain relative z-10"
              priority
            />
          </div>
        </Link>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-secondary text-text-secondary shrink-0 transition-transform hover:scale-110 active:scale-95"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>

      <div className="h-px mx-6 bg-gradient-to-r from-transparent via-border to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/60 to-transparent bg-[length:200%_100%] animate-shimmer" />
      </div>

      <nav className="flex-1 px-4 pb-4 pt-2">
        {sections.map((section, sIdx) => (
          <div
            key={sIdx}
            className="animate-slide-in-left"
            style={{ animationDelay: `${sIdx * 80}ms` }}
          >
            {section.titleKey || sIdx > 0 ? (
              <div className="relative mb-2 mt-4 px-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-1 rounded-full bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
                  <span className="text-xs uppercase text-text-secondary font-semibold tracking-wider">
                    {sectionTitleFor(section.titleKey, section.titleFallback)}
                  </span>
                </div>
              </div>
            ) : null}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.hrefSuffix);
                const delay = nextDelay();
                return (
                  <li key={item.hrefSuffix} className="animate-slide-in-left" style={{ animationDelay: delay }}>
                    <Link
                      href={`/${locale}${item.hrefSuffix}`}
                      onClick={() => isMobile && onClose?.()}
                      className={cn(
                        "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out",
                        active
                          ? "bg-primary text-primary-foreground animate-active-glow"
                          : "text-text-secondary hover:text-text hover:bg-surface-secondary hover:translate-x-1"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary-foreground/80" />
                      )}
                      <span className={cn(
                        "transition-transform duration-300",
                        active ? "scale-110" : "group-hover:scale-110"
                      )}>
                        {item.icon}
                      </span>
                      <span className="font-medium text-sm tracking-wide">{labelFor(item.key, item.fallback)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div
          className="relative mb-2 mt-6 px-3 animate-slide-in-left"
          style={{ animationDelay: `${sections.length * 80}ms` }}
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
            <span className="text-xs uppercase text-text-secondary font-semibold tracking-wider">
              {sectionTitleFor("sectionAccount", "Conta")}
            </span>
          </div>
        </div>
        <ul className="space-y-1">
          <li className="animate-slide-in-left" style={{ animationDelay: nextDelay() }}>
            <Link
              href={`/${locale}/account`}
              onClick={() => isMobile && onClose?.()}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out",
                isActive(accountAndLogout.account.hrefSuffix)
                  ? "bg-primary text-primary-foreground animate-active-glow"
                  : "text-text-secondary hover:text-text hover:bg-surface-secondary hover:translate-x-1"
              )}
            >
              {isActive(accountAndLogout.account.hrefSuffix) && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary-foreground/80" />
              )}
              <span className="transition-transform duration-300 group-hover:scale-110">
                {accountAndLogout.account.icon}
              </span>
              <span className="font-medium text-sm tracking-wide">{accountLabel}</span>
            </Link>
          </li>
          <li className="animate-slide-in-left" style={{ animationDelay: nextDelay() }}>
            <button
              onClick={() => {
                onLogout?.();
                onClose?.();
              }}
              className={cn(
                "group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out text-red-500 hover:bg-red-500/10 hover:translate-x-1"
              )}
            >
              <span className="transition-transform duration-300 group-hover:scale-110">
                <LogOut size={20} />
              </span>
              <span className="font-medium text-sm tracking-wide">{logoutLabel}</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
