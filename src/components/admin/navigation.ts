import {
  Activity,
  Apple,
  Banknote,
  Bell,
  BookOpen,
  CalendarDays,
  CreditCard,
  Dumbbell,
  FileClock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Package,
  Pill,
  Settings,
  Share2,
  ShieldCheck,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  key: string;
  path: string;
  pt: string;
  en: string;
  icon: LucideIcon;
  coach?: boolean;
};
export type AdminNavGroup = {
  key: string;
  pt: string;
  en: string;
  items: AdminNavItem[];
};
export const adminNavigation: AdminNavGroup[] = [
  {
    key: "overview",
    pt: "Visão geral",
    en: "Overview",
    items: [
      {
        key: "dashboard",
        path: "dashboard",
        pt: "Dashboard",
        en: "Dashboard",
        icon: LayoutDashboard,
        coach: true,
      },
      {
        key: "analytics",
        path: "relatorios",
        pt: "Análises e relatórios",
        en: "Analytics & reports",
        icon: Activity,
        coach: true,
      },
    ],
  },
  {
    key: "content",
    pt: "Alunos e conteúdo",
    en: "Students & content",
    items: [
      {
        key: "students",
        path: "alunos",
        pt: "Alunos",
        en: "Students",
        icon: Users,
        coach: true,
      },
      {
        key: "workouts",
        path: "treinos",
        pt: "Treinos",
        en: "Workouts",
        icon: Dumbbell,
        coach: true,
      },
      {
        key: "foods",
        path: "alimentos",
        pt: "Alimentos",
        en: "Foods",
        icon: Apple,
      },
      {
        key: "supplements",
        path: "suplementos",
        pt: "Suplementos",
        en: "Supplements",
        icon: Pill,
      },
      {
        key: "exams",
        path: "exames",
        pt: "Exames",
        en: "Exams",
        icon: FileText,
        coach: true,
      },
      {
        key: "ebooks",
        path: "ebooks",
        pt: "E-books",
        en: "E-books",
        icon: BookOpen,
      },
    ],
  },
  {
    key: "kits",
    pt: "Kits e prescrições",
    en: "Kits & prescriptions",
    items: [
      {
        key: "workoutKits",
        path: "kits/treinos",
        pt: "Kits de treino",
        en: "Workout kits",
        icon: FolderKanban,
        coach: true,
      },
      {
        key: "dietKits",
        path: "kits/dietas",
        pt: "Kits de dieta",
        en: "Diet kits",
        icon: UtensilsCrossed,
        coach: true,
      },
      {
        key: "supplementKits",
        path: "kits/suplementos",
        pt: "Kits de suplementos",
        en: "Supplement kits",
        icon: Package,
        coach: true,
      },
    ],
  },
  {
    key: "relationship",
    pt: "Relacionamento",
    en: "Relationships",
    items: [
      {
        key: "mentoria",
        path: "mentoria",
        pt: "Mentoria",
        en: "Mentoring",
        icon: MessageSquare,
        coach: true,
      },
      {
        key: "meetings",
        path: "reunioes",
        pt: "Reuniões",
        en: "Meetings",
        icon: CalendarDays,
        coach: true,
      },
      {
        key: "notifications",
        path: "notificacoes",
        pt: "Notificações",
        en: "Notifications",
        icon: Bell,
      },
      {
        key: "social",
        path: "redes-sociais",
        pt: "Redes sociais",
        en: "Social links",
        icon: Share2,
      },
    ],
  },
  {
    key: "finance",
    pt: "Financeiro",
    en: "Finance",
    items: [
      {
        key: "plans",
        path: "planos",
        pt: "Planos",
        en: "Plans",
        icon: CreditCard,
      },
      {
        key: "subscriptions",
        path: "assinaturas",
        pt: "Assinaturas",
        en: "Subscriptions",
        icon: CreditCard,
      },
      {
        key: "payments",
        path: "pagamentos",
        pt: "Pagamentos",
        en: "Payments",
        icon: Banknote,
      },
      {
        key: "financeiro",
        path: "financeiro",
        pt: "Visão financeira",
        en: "Financial overview",
        icon: Banknote,
      },
    ],
  },
  {
    key: "system",
    pt: "Plataforma",
    en: "Platform",
    items: [
      {
        key: "settings",
        path: "configuracoes",
        pt: "Configurações",
        en: "Settings",
        icon: Settings,
      },
      {
        key: "pages",
        path: "paginas",
        pt: "Páginas",
        en: "Pages",
        icon: FileText,
      },
      {
        key: "history",
        path: "historico",
        pt: "Histórico de prescrições",
        en: "Prescription history",
        icon: FileClock,
      },
      {
        key: "audit",
        path: "auditoria",
        pt: "Auditoria",
        en: "Audit log",
        icon: ShieldCheck,
      },
    ],
  },
];
export function navigationForRole(role: string) {
  return adminNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => role === "admin" || item.coach),
    }))
    .filter((group) => group.items.length);
}
