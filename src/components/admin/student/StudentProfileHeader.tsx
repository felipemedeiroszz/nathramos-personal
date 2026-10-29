import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  History,
  Mail,
  Pill,
  Utensils,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export interface StudentProfileHeaderProps {
  locale: string;
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  country?: string | null;
  registered: string;
  activeWorkouts: number;
  maxWorkouts: number;
  sessions: number;
  diets: number;
  supplements: number;
  lastSession: string;
}

export function StudentProfileHeader({
  locale,
  id,
  name,
  email,
  avatar,
  country,
  registered,
  activeWorkouts,
  maxWorkouts,
  sessions,
  diets,
  supplements,
  lastSession,
}: StudentProfileHeaderProps) {
  const t = (pt: string, en: string) => (locale === "en-US" ? en : pt);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/admin/alunos`}
          className="flex items-center gap-2 text-xs text-zinc-500 transition hover:text-yellow-400"
        >
          <ArrowLeft size={14} />
          {t("Voltar para alunos", "Back to students")}
        </Link>
        <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
          {t("Área do aluno", "Student workspace")}
        </span>
      </div>
      <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101113]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-yellow-400/[0.08] via-yellow-400/[0.02] to-transparent" />
        <div className="relative flex flex-wrap items-center justify-between gap-5 p-5 sm:p-7">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div className="shrink-0 rounded-full border border-yellow-400/20 p-1.5">
              <Avatar
                size="xl"
                src={avatar || undefined}
                alt={name}
                fallback={
                  name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("") || "?"
                }
              />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-yellow-400">
                {t("Perfil e acompanhamento", "Profile and coaching")}
              </p>
              <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                {name}
              </h1>
              {email && (
                <p className="mt-2 flex items-center gap-1.5 break-all text-xs text-zinc-400">
                  <Mail size={12} className="shrink-0" />
                  {email}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={11} />
                  {t("Desde", "Since")} {registered}
                </span>
                {country && <span>{country}</span>}
              </div>
            </div>
          </div>
          <Link
            href={`/${locale}/admin/historico?student=${encodeURIComponent(id)}`}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs text-zinc-300 transition hover:border-yellow-400/30 hover:text-yellow-400"
          >
            <History size={14} />
            {t("Histórico de atribuições", "Assignment history")}
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3 sm:px-7">
          <p className="text-[10px] text-zinc-500">
            {t(
              "Uma visão integrada para um acompanhamento mais próximo.",
              "An integrated view for more personal coaching.",
            )}
          </p>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            {t("Última sessão", "Last session")}: {lastSession}
          </span>
        </div>
      </header>
      <section
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label={t("Resumo do acompanhamento", "Coaching summary")}
      >
        {[
          {
            title: t("Treinos ativos", "Active workouts"),
            value: activeWorkouts,
            note: `${activeWorkouts} / ${maxWorkouts} ${t("vagas em uso", "slots used")}`,
            icon: Dumbbell,
            accent: true,
          },
          {
            title: t("Sessões concluídas", "Completed sessions"),
            value: sessions,
            note: t(
              "Nos últimos 20 registros consultados",
              "In the last 20 retrieved records",
            ),
            icon: CheckCircle2,
          },
          {
            title: t("Dietas atribuídas", "Assigned diets"),
            value: diets,
            note: t("Prescrições ativas", "Active prescriptions"),
            icon: Utensils,
          },
          {
            title: t("Kits de suplementos", "Supplement kits"),
            value: supplements,
            note: t("Atribuições ativas", "Active assignments"),
            icon: Pill,
          },
        ].map(({ title, value, note, icon: Icon, accent }) => (
          <div
            key={title}
            className={cn(
              "rounded-2xl border border-white/[0.08] bg-[#101113] p-4 sm:p-5",
              accent && "border-yellow-400/20",
            )}
          >
            <div className="flex justify-between gap-2 text-[11px] text-zinc-400">
              <span>{title}</span>
              <Icon
                size={15}
                className={
                  accent ? "shrink-0 text-yellow-400" : "shrink-0 text-zinc-600"
                }
              />
            </div>
            <p className="my-3 text-3xl font-semibold tracking-tight">
              {value}
            </p>
            {accent && (
              <div className="mb-2 h-1 rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{
                    width: `${Math.min(100, (activeWorkouts / maxWorkouts) * 100)}%`,
                  }}
                />
              </div>
            )}
            <p className="text-[10px] leading-relaxed text-zinc-500">{note}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
