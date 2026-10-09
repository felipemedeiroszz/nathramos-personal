"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";
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

export function AdminSidebar({ locale, onLogout }: AdminSidebarProps) {
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

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-surface border-r border-border sticky top-0 overflow-y-auto">
      <div className="p-6">
        <Link href={`/${locale}/admin/dashboard`} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.25)]">
            <Dumbbell size={20} className="text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-text">Nath Ramos Admin</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 pb-4">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className={sIdx === 0 ? "" : ""}>
            {section.titleKey || sIdx > 0 ? (
              <div
                className={cn(
                  "text-xs uppercase text-text-secondary mb-2 mt-4 px-3 font-semibold tracking-wider"
                )}
              >
                {sectionTitleFor(section.titleKey, section.titleFallback)}
              </div>
            ) : null}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.hrefSuffix);
                return (
                  <li key={item.hrefSuffix}>
                    <Link
                      href={`/${locale}${item.hrefSuffix}`}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-text-secondary hover:text-text hover:bg-surface-secondary"
                      )}
                    >
                      {item.icon}
                      <span className="font-medium text-sm">{labelFor(item.key, item.fallback)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="text-xs uppercase text-text-secondary mb-2 mt-6 px-3 font-semibold tracking-wider">
          {sectionTitleFor("sectionAccount", "Conta")}
        </div>
        <ul className="space-y-1">
          <li>
            <Link
              href={`/${locale}/account`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive(accountAndLogout.account.hrefSuffix)
                  ? "bg-primary text-primary-foreground"
                  : "text-text-secondary hover:text-text hover:bg-surface-secondary"
              )}
            >
              {accountAndLogout.account.icon}
              <span className="font-medium text-sm">{accountLabel}</span>
            </Link>
          </li>
          <li>
            <button
              onClick={onLogout}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-500 hover:bg-red-500/10"
              )}
            >
              <LogOut size={20} />
              <span className="font-medium text-sm">{logoutLabel}</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
