import type { ReactNode } from "react";
import {
  Activity,
  CreditCard,
  Dumbbell,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

const sections = {
  content: {
    pt: "Biblioteca e conteúdo",
    en: "Library & content",
    icon: Dumbbell,
  },
  kits: {
    pt: "Kits e prescrições",
    en: "Kits & prescriptions",
    icon: Dumbbell,
  },
  relationship: {
    pt: "Relacionamento",
    en: "Relationships",
    icon: MessageSquare,
  },
  finance: {
    pt: "Gestão financeira",
    en: "Financial management",
    icon: CreditCard,
  },
  system: {
    pt: "Gestão da plataforma",
    en: "Platform management",
    icon: Settings,
  },
  students: { pt: "Gestão de alunos", en: "Student management", icon: Users },
  analytics: {
    pt: "Inteligência do negócio",
    en: "Business intelligence",
    icon: Activity,
  },
};
export function AdminPageHeader({
  locale,
  section,
  children,
}: {
  locale: string;
  section: keyof typeof sections;
  children: ReactNode;
}) {
  const context = sections[section],
    Icon = context.icon;
  return (
    <header className="admin-page-header">
      <div className="min-w-0">
        <div className="admin-module-context">
          {locale === "en-US" ? context.en : context.pt}
        </div>
        {children}
      </div>
      <span
        aria-hidden="true"
        className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-600 sm:flex"
      >
        <Icon size={20} strokeWidth={1.5} />
      </span>
    </header>
  );
}
