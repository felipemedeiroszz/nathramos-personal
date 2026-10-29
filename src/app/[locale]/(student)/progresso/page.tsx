import { setRequestLocale } from "next-intl/server";
import {
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Flame,
  TrendingUp,
} from "lucide-react";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Chart } from "@/components/ui/Chart";
import { requireStudentPage } from "@/lib/auth/platform";
import { StudentRoutineService } from "@/services/StudentRoutineService";
import { WorkoutMetricsService } from "@/services/WorkoutMetricsService";
import { RoutineSummary } from "@/components/student/RoutineSummary";
import { HealthLogClient } from "@/components/student/RoutineClients";
import { WorkoutHistory } from "@/components/student/workout/WorkoutHistory";
export const dynamic = "force-dynamic";
export const metadata = { title: "Minha evolução" };
export default async function Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const userId = await requireStudentPage();
  const [data, metrics] = await Promise.all([
    StudentRoutineService.get(userId),
    WorkoutMetricsService.getPerformanceSummary(userId),
  ]);
  const t = (pt: string, en: string) => (locale === "en-US" ? en : pt);
  const values = [
    {
      label: t("Sessões concluídas", "Completed sessions"),
      value: metrics.total_sessions,
      icon: CheckCircle2,
      note: t("Seu histórico de treinos", "Your workout history"),
    },
    {
      label: t("Volume acumulado", "Total volume"),
      value: metrics.total_volume_kg,
      icon: Dumbbell,
      note: t("Quilos registrados nos treinos", "Kilograms logged in workouts"),
    },
    {
      label: t("Sequência atual", "Current streak"),
      value: metrics.current_streak_days,
      icon: Flame,
      note: t("Dias na sequência atual", "Days in your current streak"),
    },
    {
      label: t("Frequência semanal", "Weekly frequency"),
      value: metrics.weekly_frequency,
      icon: CalendarDays,
      note: t("Média nas últimas 12 semanas", "Average over the last 12 weeks"),
    },
  ];
  const date = (key: string) =>
    new Date(`${key.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    });
  return (
    <div className="space-y-6">
      <StudentPageHeader
        locale={locale}
        title={t("Minha evolução", "My progress")}
        description={t(
          "Cada registro conta uma parte da sua jornada.",
          "Every log tells a part of your journey.",
        )}
        icon={<TrendingUp size={22} />}
      />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {values.map(({ label, value, icon: Icon, note }) => (
          <article
            key={label}
            className="min-w-0 rounded-2xl border border-white/[0.07] bg-surface p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-2 text-[11px] text-zinc-400">
              <span>{label}</span>
              <Icon size={15} className="shrink-0 text-yellow-300/70" />
            </div>
            <p className="my-4 text-3xl font-semibold tracking-tight">
              {new Intl.NumberFormat(locale, {
                maximumFractionDigits: 1,
              }).format(Number(value) || 0)}
            </p>
            <p className="text-[10px] leading-relaxed text-zinc-500">{note}</p>
          </article>
        ))}
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("Seu volume de treino", "Your workout volume")}
            </CardTitle>
            <p className="text-xs text-zinc-500">
              {t(
                "Quilos registrados · últimos 30 dias",
                "Kilograms logged · last 30 days",
              )}
            </p>
          </CardHeader>
          <CardContent>
            {metrics.recent_volume.length ? (
              <Chart
                appearance="student"
                type="area"
                data={metrics.recent_volume.map((v) => ({
                  name: date(v.date),
                  value: v.volume_kg,
                }))}
              />
            ) : (
              <p className="py-16 text-center text-sm text-zinc-500">
                {t(
                  "Seus treinos concluídos aparecerão aqui.",
                  "Your completed workouts will appear here.",
                )}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {t("Seu histórico de peso", "Your weight history")}
            </CardTitle>
            <p className="text-xs text-zinc-500">
              {t(
                "Quilos registrados · últimos 30 dias",
                "Kilograms logged · last 30 days",
              )}
            </p>
          </CardHeader>
          <CardContent>
            {data.weight.length ? (
              <Chart
                appearance="student"
                type="line"
                color="#6ee7b7"
                data={[...data.weight].reverse().map((w) => ({
                  name: date(w.logged_date),
                  value: Number(w.weight_kg),
                }))}
              />
            ) : (
              <p className="py-16 text-center text-sm text-zinc-500">
                {t(
                  "Registre seu peso para acompanhar as mudanças.",
                  "Log your weight to track changes.",
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
      <HealthLogClient />
      <RoutineSummary data={{ ...data, locale }} />
      <WorkoutHistory locale={locale} userId={userId} />
    </div>
  );
}
