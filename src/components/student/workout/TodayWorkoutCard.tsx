"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Play,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WorkoutProgramRow, WorkoutDayRow } from "@/types";
interface TodayWorkoutData {
  program: WorkoutProgramRow | null;
  day: WorkoutDayRow | null;
  exerciseCount: number;
  estimatedMinutes: number;
  available: boolean;
  reason?: string;
  completedToday?: boolean;
}
export function TodayWorkoutCard({
  locale,
  userId,
}: {
  locale: string;
  userId: string;
}) {
  const en = locale === "en-US",
    t = (pt: string, eng: string) => (en ? eng : pt);
  const [loading, setLoading] = useState(true),
    [data, setData] = useState<TodayWorkoutData | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(false);
    fetch("/api/workout/today", { cache: "no-store", signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw Error("Workout unavailable");
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [locale, userId, retry]);
  return (
    <article className="relative flex min-h-[310px] min-w-0 flex-col overflow-hidden rounded-[20px] border border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.07] via-surface to-surface p-5 sm:p-7">
      <div
        className="pointer-events-none absolute -right-10 top-6 rotate-[-25deg] text-yellow-300/[0.035]"
        aria-hidden="true"
      >
        <Dumbbell size={250} strokeWidth={1} />
      </div>
      <div className="relative mb-5 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-yellow-300">
          <Dumbbell size={15} />
          {t("Seu treino de hoje", "Your workout today")}
        </span>
        {data?.completedToday && (
          <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">
            {t("Concluído", "Completed")}
          </span>
        )}
      </div>
      {loading ? (
        <div
          className="space-y-4"
          role="status"
          aria-label={t("Carregando treino", "Loading workout")}
        >
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-8 h-12 w-full" />
        </div>
      ) : error || !data ? (
        <div className="relative my-auto">
          <h2 className="text-lg font-semibold">
            {t(
              "Não foi possível carregar seu treino",
              "Could not load your workout",
            )}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {t(
              "Tente novamente para consultar sua programação.",
              "Try again to check your schedule.",
            )}
          </p>
          <button
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs text-zinc-300"
            onClick={() => setRetry((v) => v + 1)}
          >
            <RefreshCw size={14} />
            {t("Tentar novamente", "Try again")}
          </button>
        </div>
      ) : data.available && data.program && data.day ? (
        <div className="relative flex flex-1 flex-col">
          <p className="mb-1 text-xs text-zinc-500">
            {en ? data.program.title_en : data.program.title_pt}
          </p>
          <h2 className="max-w-md text-2xl font-semibold tracking-tight sm:text-[28px]">
            {en ? data.day.name_en : data.day.name_pt}
          </h2>
          {(data.day.focus_pt || data.day.focus_en) && (
            <p className="mt-2 text-sm text-zinc-400">
              {en ? data.day.focus_en : data.day.focus_pt}
            </p>
          )}
          <div className="mb-6 mt-5 flex flex-wrap gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Dumbbell size={14} />
              {data.exerciseCount} {t("exercícios", "exercises")}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} />
              {data.estimatedMinutes} min {t("estimados", "estimated")}
            </span>
          </div>
          <Link
            href={`/${locale}/treino`}
            className="mt-auto flex min-h-12 items-center justify-between rounded-xl bg-yellow-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-300"
          >
            <span className="flex items-center gap-2">
              <Play size={16} />
              {t("Abrir meu treino", "Open my workout")}
            </span>
            <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col">
          <CheckCircle2 size={30} className="mb-4 text-yellow-300" />
          <h2 className="text-2xl font-semibold tracking-tight">
            {data.completedToday
              ? t("Treino de hoje concluído.", "Today's workout is complete.")
              : t("Sem treino programado hoje.", "No workout scheduled today.")}
          </h2>
          <p className="mb-6 mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            {data.completedToday
              ? t(
                  "Seu registro já faz parte da sua evolução.",
                  "Your log is now part of your progress.",
                )
              : t(
                  "Consulte sua programação ou converse com sua treinadora sobre os próximos passos.",
                  "Check your schedule or talk with your coach about the next steps.",
                )}
          </p>
          <Link
            href={`/${locale}/${data.completedToday ? "progresso" : "treino"}`}
            className="mt-auto flex items-center gap-2 text-xs font-medium text-yellow-300"
          >
            {data.completedToday
              ? t("Ver minha evolução", "View my progress")
              : t("Consultar meus treinos", "Check my workouts")}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </article>
  );
}
