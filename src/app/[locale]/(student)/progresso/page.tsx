import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Chart } from "@/components/ui/Chart";
import {
  Activity,
  Dumbbell,
  Flame,
  Calendar,
  TrendingUp,
  Trophy,
  Dumbbell as DumbbellIcon,
  ChevronUp,
  Calendar as CalendarIcon,
  Apple,
  Droplets,
  Moon,
} from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";
import { WorkoutMetricsService } from "@/services/WorkoutMetricsService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Progresso & Desempenho",
};

const adherenceData = [
  {
    label: "Dieta",
    percentage: 88,
    detail: "26/30 dias",
    icon: Apple,
  },
  {
    label: "Hidratação",
    percentage: 95,
    detail: "28.5/30 dias",
    icon: Droplets,
  },
  {
    label: "Sono",
    percentage: 83,
    detail: "25/30 dias",
    icon: Moon,
  },
];

export default async function ProgressPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  await getTranslations("navigation");
  await getTranslations("studentPages");
  const userId = await requireAuthenticated();

  const metrics = await WorkoutMetricsService.getPerformanceSummary(userId);

  const volumeChartData = metrics.recent_volume.map((v) => ({
    name: new Date(v.date).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-US", { month: "short", day: "numeric" }),
    value: Math.round(v.volume_kg),
  }));

  const workoutAdherencePct =
    metrics.total_sessions > 0
      ? Math.min(100, Math.round((metrics.total_sessions / Math.max(1, metrics.total_sessions + 2)) * 100))
      : 0;

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-US", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="space-y-6 w-full pb-20 md:pb-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">Progresso & Desempenho</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Acompanhe sua evolução ao longo do tempo
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DumbbellIcon size={22} />
            </div>
            <Badge variant="outline" className="text-xs">
              {metrics.last_session_date ? formatDate(metrics.last_session_date) : "—"}
            </Badge>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-sm text-text-secondary">Sessões concluídas</p>
            <p className="text-2xl font-bold text-text">{metrics.total_sessions}</p>
            <p className="text-xs text-text-secondary">total</p>
          </div>
        </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Activity size={22} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-text-secondary">Volume total</p>
              <p className="text-2xl font-bold text-text">
                {metrics.total_volume_kg.toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US")} kg
              </p>
              <p className="text-xs text-text-secondary">carga levantada</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Flame size={22} />
              </div>
              <Badge variant="success" className="text-xs">
                {metrics.current_streak_days} dias
              </Badge>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-text-secondary">Sequência atual</p>
              <p className="text-2xl font-bold text-text">{metrics.current_streak_days}</p>
              <p className="text-xs text-text-secondary">
                {locale === "pt-BR" ? "recorde: " : "best: "}
                {metrics.longest_streak_days} dias
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <CalendarIcon size={22} />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm text-text-secondary">
                {locale === "pt-BR" ? "Frequência semanal" : "Weekly frequency"}
              </p>
              <p className="text-2xl font-bold text-text">{metrics.weekly_frequency}x</p>
              <p className="text-xs text-text-secondary">
                {metrics.avg_duration_min
                  ? `${metrics.avg_duration_min} min/sessão`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                {locale === "pt-BR" ? "Evolução do Volume" : "Volume Evolution"}
                </CardTitle>
                <CardDescription>
                {locale === "pt-BR" ? "Últimos 30 dias" : "Last 30 days"}
                </CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <TrendingUp size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {volumeChartData.length > 0 ? (
              <Chart type="line" data={volumeChartData} xKey="name" yKey="value" className="h-72" />
            ) : (
              <div className="h-72 flex items-center justify-center text-text-secondary text-sm">
                {locale === "pt-BR"
                  ? "Nenhum treino concluído nos últimos 30 dias."
                  : "No workouts completed in the last 30 days."}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {locale === "pt-BR" ? "Exercícios mais feitos" : "Most used exercises"}
                </CardTitle>
                <CardDescription>
                  {locale === "pt-BR" ? "Por número de séries" : "By set count"}
                </CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Dumbbell size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.top_exercises.length > 0 ? (
              <div className="space-y-3">
                {metrics.top_exercises.map((ex) => (
                  <div key={ex.exercise_id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-text truncate pr-2">
                        {locale === "pt-BR" ? ex.name_pt : ex.name_en}
                      </span>
                      <span className="text-text-secondary shrink-0">{ex.count} séries</span>
                    </div>
                    <Progress
                      value={ex.count}
                      max={metrics.top_exercises[0].count || 1}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-text-secondary text-sm">
                {locale === "pt-BR" ? "Sem dados ainda." : "No data yet."}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {locale === "pt-BR" ? "Recordes Pessoais" : "Personal Records"}
              </CardTitle>
              <CardDescription>
                {locale === "pt-BR" ? "Suas maiores conquistas" : "Your best lifts"}
              </CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
              <Trophy size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {metrics.personal_records.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.personal_records.map((pr) => (
                <div
                  key={pr.exercise_id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-secondary/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
                      <Trophy size={22} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-text">
                        {locale === "pt-BR" ? pr.name_pt : pr.name_en}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {pr.max_reps ? `${pr.max_reps} reps` : ""}
                        {pr.date ? ` • ${formatDate(pr.date)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-xl font-bold text-text">
                      {pr.max_weight_kg != null ? `${pr.max_weight_kg} kg` : `${pr.max_reps} reps`}
                    </p>
                    {pr.max_volume_set_kg != null && (
                      <Badge variant="success" className="flex items-center gap-1 justify-end">
                        <ChevronUp size={12} />
                        {Math.round(pr.max_volume_set_kg)} kg
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-text-secondary text-sm">
              {locale === "pt-BR"
                ? "Conclua treinos para ver seus recordes pessoais."
                : "Complete workouts to see your personal records."}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {locale === "pt-BR" ? "Adesão Geral" : "Overall Adherence"}
              </CardTitle>
              <CardDescription>
                {locale === "pt-BR" ? "Últimos 30 dias" : "Last 30 days"}
              </CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
              <ChevronUp size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <DumbbellIcon size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-text text-sm">
                      {locale === "pt-BR" ? "Treino" : "Workout"}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {metrics.total_sessions} {locale === "pt-BR" ? "sessões" : "sessions"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text">{workoutAdherencePct}%</p>
                </div>
              </div>
              <Progress value={workoutAdherencePct} max={100} />
            </div>

            {adherenceData.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-text text-sm">{item.label}</p>
                        <p className="text-xs text-text-secondary">{item.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-text">{item.percentage}%</p>
                    </div>
                  </div>
                  <Progress value={item.percentage} max={100} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
