import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Droplets,
  MessageCircle,
  Pill,
  Utensils,
} from "lucide-react";
import type {
  RoutineData,
  RoutineItem,
} from "@/services/StudentRoutineService";
import { getZonedParts } from "@/lib/notifications/time";
import { RoutineSummary } from "./RoutineSummary";
import { TodayWorkoutCard } from "./workout/TodayWorkoutCard";
export function StudentHome({
  locale,
  userId,
  data,
  notices,
  upcoming,
  unread,
}: {
  locale: string;
  userId: string;
  data: RoutineData;
  notices: {
    id: string;
    title: string;
    body: string;
    read_at: string | null;
  }[];
  upcoming: {
    id: string;
    title_pt: string;
    title_en: string;
    start_at: string;
  }[];
  unread: number;
}) {
  const en = locale === "en-US",
    t = (pt: string, eng: string) => (en ? eng : pt);
  const clock = getZonedParts(new Date(), data.timezone),
    time = `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
  const nextMeal = data.diet
    .filter((i) => !i.done && (!i.slot || i.slot >= time))
    .sort((a, b) => a.slot.localeCompare(b.slot))[0];
  const nextSupp = data.supplements.find((i) => !i.done);
  const date = new Date(`${data.date}T12:00:00Z`).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${data.date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      label: d
        .toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" })
        .replace(".", ""),
      day: d.getUTCDate(),
      count: data.logs.filter((l) => l.logged_date === key).length,
    };
  });
  const focus = (
    item: RoutineItem | undefined,
    path: string,
    label: string,
    icon: typeof Utensils,
  ) => {
    const Icon = icon;
    return (
      <Link
        href={`/${locale}/${path}`}
        className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5 transition hover:border-white/15"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400">
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-zinc-500">{label}</p>
          <p className="mt-1 truncate text-xs font-medium text-zinc-200">
            {item
              ? item.name
              : t("Consulte seu acompanhamento", "Check your coaching plan")}
          </p>
          <p className="mt-1 text-[10px] text-zinc-500">
            {item
              ? `${item.slot && !item.slot.startsWith("dose-") ? item.slot + " · " : ""}${item.quantity} ${item.unit}`
              : t("Ver orientações", "View guidance")}
          </p>
        </div>
        <ArrowUpRight
          size={14}
          className="mt-1 text-zinc-600 group-hover:text-yellow-300"
        />
      </Link>
    );
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="student-eyebrow">
            {t("UM DIA DE CADA VEZ", "ONE DAY AT A TIME")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[34px]">
            {t("Olá", "Hello")}
            {data.firstName ? `, ${data.firstName}` : ""}
            <span className="text-yellow-300">.</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {t(
              "Seu cuidado diário, com direção e acompanhamento.",
              "Your daily care, with guidance and coaching.",
            )}
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-surface px-3 py-2.5 text-[11px] capitalize text-zinc-400">
          <CalendarDays size={14} className="text-zinc-500" />
          {date}
        </span>
      </header>
      <RoutineSummary data={{ ...data, locale }} />
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <TodayWorkoutCard locale={locale} userId={userId} />
        <article className="min-w-0 rounded-[20px] border border-white/[0.07] bg-surface p-5">
          <h2 className="text-sm font-semibold">
            {t("Seu dia, no seu ritmo", "Your day, your pace")}
          </h2>
          <p className="mb-4 mt-1 text-xs text-zinc-500">
            {t(
              "Os próximos cuidados da sua rotina.",
              "The next steps in your daily routine.",
            )}
          </p>
          <div className="space-y-2.5">
            {focus(
              nextMeal,
              "dieta",
              t("Próxima refeição pendente", "Next pending meal"),
              Utensils,
            )}
            {focus(
              nextSupp,
              "suplementos",
              t("Suplementação pendente", "Pending supplements"),
              Pill,
            )}
            <Link
              href={`/${locale}/hidratacao`}
              className="flex items-center justify-between rounded-xl border border-blue-400/10 bg-blue-400/[0.04] px-4 py-3 text-xs"
            >
              <span className="flex items-center gap-2 text-blue-300">
                <Droplets size={15} />
                {t("Registrar água", "Log water")}
              </span>
              <ArrowRight size={14} className="text-blue-400/60" />
            </Link>
          </div>
        </article>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <article className="min-w-0 rounded-[20px] border border-white/[0.07] bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {t("Sua semana de registros", "Your week of logs")}
            </h2>
            <Link
              href={`/${locale}/progresso`}
              aria-label={t("Abrir evolução", "Open progress")}
              className="text-zinc-500 hover:text-yellow-300"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {t(
              "Alimentação e suplementos · últimos 7 dias",
              "Nutrition and supplements · last 7 days",
            )}
          </p>
          <div className="my-5 grid grid-cols-7 gap-1.5">
            {days.map((day) => (
              <div key={day.key} className="min-w-0 text-center">
                <p className="mb-2 text-[9px] capitalize text-zinc-500">
                  {day.label}
                </p>
                <div
                  title={`${day.count} ${t("registros", "logs")}`}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-xs ${day.count ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300" : "border-white/[0.06] bg-white/[0.015] text-zinc-500"}`}
                >
                  {day.count ? <Check size={15} /> : day.day}
                </div>
                <p className="mt-2 text-[9px] text-zinc-600">{day.count}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-zinc-500">
            {t(
              "Cada marca representa um dia com pelo menos um registro. Os números indicam a quantidade de itens registrados.",
              "Each check marks a day with at least one log. Numbers show the amount of logged items.",
            )}
          </p>
        </article>
        <article className="min-w-0 rounded-[20px] border border-white/[0.07] bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {t("Acompanhamento de perto", "Coaching that stays close")}
            </h2>
            <MessageCircle size={17} className="text-zinc-500" />
          </div>
          <p className="mb-5 mt-1 text-xs text-zinc-500">
            {t(
              "Orientação para seguir em frente.",
              "Guidance to keep you moving forward.",
            )}
          </p>
          <Link
            href={`/${locale}/conversas`}
            className="flex items-center justify-between rounded-xl border border-white/[0.07] p-4"
          >
            <div>
              <p className="text-sm font-medium">
                {t("Falar com minha treinadora", "Talk with my coach")}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {unread
                  ? `${unread} ${t("mensagens não lidas", "unread messages")}`
                  : t(
                      "Seu canal de orientação e dúvidas",
                      "Your channel for guidance and questions",
                    )}
              </p>
            </div>
            <ArrowUpRight size={16} className="text-yellow-300" />
          </Link>
          <div className="mt-4 space-y-3">
            {upcoming.length ? (
              upcoming.map((m) => (
                <Link
                  key={m.id}
                  href={`/${locale}/reunioes`}
                  className="flex items-center gap-3 text-xs"
                >
                  <CalendarDays size={15} className="shrink-0 text-zinc-500" />
                  <div className="min-w-0">
                    <p className="truncate text-zinc-300">
                      {en ? m.title_en : m.title_pt}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {new Date(m.start_at).toLocaleString(locale, {
                        timeZone: data.timezone,
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="flex items-center gap-2 text-[11px] text-zinc-500">
                <CalendarDays size={14} />
                {t(
                  "Nenhum encontro agendado no momento.",
                  "No upcoming meetings right now.",
                )}
              </p>
            )}
          </div>
        </article>
      </section>
      <article className="rounded-[20px] border border-white/[0.07] bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Bell size={15} className="text-zinc-500" />
            {t("Novidades para você", "Updates for you")}
          </h2>
          <Link
            href={`/${locale}/notificacoes`}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-yellow-300"
          >
            {t("Ver todas", "View all")}
            <ArrowRight size={13} />
          </Link>
        </div>
        {notices.length ? (
          <div className="divide-y divide-white/[0.06]">
            {notices.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 py-3 first:pt-0"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read_at ? "bg-zinc-700" : "bg-yellow-400"}`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200">{n.title}</p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-zinc-500">
                    {n.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-3 text-xs text-zinc-500">
            {t(
              "Tudo em dia. Suas próximas atualizações aparecerão aqui.",
              "All caught up. Your next updates will appear here.",
            )}
          </p>
        )}
      </article>
    </div>
  );
}
