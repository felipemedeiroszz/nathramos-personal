import { Droplets, Moon, Pill, Scale, Utensils } from "lucide-react";
import type { RoutineData } from "@/services/StudentRoutineService";
export function RoutineSummary({ data }: { data: RoutineData }) {
  const en = data.locale === "en-US",
    t = (pt: string, eng: string) => (en ? eng : pt);
  const foodDone = data.diet.filter((i) => i.done).length,
    suppDone = data.supplements.filter((i) => i.done).length;
  const date = (key: string) =>
    new Date(`${key}T12:00:00Z`).toLocaleDateString(data.locale || "pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    });
  const metrics = [
    {
      label: t("Alimentação", "Nutrition"),
      value: `${foodDone}`,
      suffix: `/ ${data.diet.length}`,
      detail: t("alimentos registrados hoje", "food items logged today"),
      icon: Utensils,
      color: "#facc15",
      progress: data.diet.length ? (foodDone / data.diet.length) * 100 : null,
    },
    {
      label: t("Hidratação", "Hydration"),
      value: new Intl.NumberFormat(data.locale || "pt-BR").format(
        data.waterTotal,
      ),
      suffix: "ml",
      detail: data.waterGoal
        ? `${t("Meta de", "Goal of")} ${data.waterGoal} ml`
        : t("Sua meta ainda não foi definida", "Your goal has not been set"),
      icon: Droplets,
      color: "#60a5fa",
      progress: data.waterGoal
        ? Math.min(100, (data.waterTotal / data.waterGoal) * 100)
        : null,
    },
    {
      label: t("Suplementos", "Supplements"),
      value: `${suppDone}`,
      suffix: `/ ${data.supplements.length}`,
      detail: t("doses registradas hoje", "doses logged today"),
      icon: Pill,
      color: "#a78bfa",
      progress: data.supplements.length
        ? (suppDone / data.supplements.length) * 100
        : null,
    },
    {
      label: t("Último peso", "Latest weight"),
      value: data.weight[0] ? String(data.weight[0].weight_kg) : "—",
      suffix: data.weight[0] ? "kg" : "",
      detail: data.weight[0]
        ? `${t("Registrado em", "Logged on")} ${date(data.weight[0].logged_date)}`
        : t("Sem registro nos últimos 30 dias", "No logs in the last 30 days"),
      icon: Scale,
      color: "#6ee7b7",
      progress: null,
    },
  ];
  return (
    <section
      aria-label={t("Resumo da sua rotina", "Your routine summary")}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(
          ({ label, value, suffix, detail, icon: Icon, color, progress }) => (
            <article
              key={label}
              className="min-w-0 rounded-2xl border border-white/[0.07] bg-surface p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                <span>{label}</span>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="my-4 flex flex-wrap items-baseline gap-1.5">
                <strong className="text-[28px] font-semibold leading-none tracking-tight">
                  {value}
                </strong>
                <span className="text-xs text-zinc-500">{suffix}</span>
              </div>
              {progress !== null && (
                <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, background: color }}
                  />
                </div>
              )}
              <p className="text-[10px] leading-relaxed text-zinc-500">
                {detail}
              </p>
            </article>
          ),
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Moon size={12} />
          {data.sleep[0]
            ? `${t("Último sono", "Latest sleep")}: ${(data.sleep[0].total_minutes / 60).toFixed(1)} h · ${date(data.sleep[0].logged_date)}`
            : t(
                "Sono: sem registro nos últimos 30 dias",
                "Sleep: no logs in the last 30 days",
              )}
        </span>
        <span>
          {
            new Set(
              data.logs
                .filter((l) => l.kind === "diet")
                .map((l) => l.logged_date),
            ).size
          }{" "}
          {t(
            "dias com alimentação registrada em 30 dias",
            "days with food logs in 30 days",
          )}
        </span>
      </div>
    </section>
  );
}
