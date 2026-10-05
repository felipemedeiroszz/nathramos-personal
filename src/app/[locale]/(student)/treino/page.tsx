import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Dumbbell,
  MessageCircle,
  Check,
  Timer,
  Play,
  SkipForward,
  Plus,
  Clock3,
  Gauge,
  ListChecks,
  Activity,
  Calendar,
  Star
} from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Treino",
};

type SetStatus = "done" | "active" | "pending";

interface WorkoutSet {
  number: number;
  targetReps: string;
  weight: string;
  status: SetStatus;
  doneReps?: string;
  doneWeight?: string;
}

interface Exercise {
  id: number;
  name: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  sets: WorkoutSet[];
}

const exercises: Exercise[] = [
  {
    id: 1,
    name: "Supino Reto",
    muscle: "Peito",
    equipment: "Barra",
    difficulty: "Intermediário",
    sets: [
      { number: 1, targetReps: "10", weight: "40", status: "done", doneReps: "10", doneWeight: "40" },
      { number: 2, targetReps: "10", weight: "50", status: "done", doneReps: "10", doneWeight: "50" },
      { number: 3, targetReps: "8", weight: "60", status: "active", doneReps: "", doneWeight: "60" },
      { number: 4, targetReps: "8", weight: "60", status: "pending" },
    ],
  },
  {
    id: 2,
    name: "Supino Inclinado Halteres",
    muscle: "Peito",
    equipment: "Halteres",
    difficulty: "Intermediário",
    sets: [
      { number: 1, targetReps: "12", weight: "20", status: "done", doneReps: "12", doneWeight: "20" },
      { number: 2, targetReps: "12", weight: "22", status: "done", doneReps: "12", doneWeight: "22" },
      { number: 3, targetReps: "10", weight: "24", status: "pending" },
      { number: 4, targetReps: "10", weight: "24", status: "pending" },
    ],
  },
  {
    id: 3,
    name: "Crucifixo Cabos",
    muscle: "Peito",
    equipment: "Cabos",
    difficulty: "Iniciante",
    sets: [
      { number: 1, targetReps: "15", weight: "15", status: "done", doneReps: "15", doneWeight: "15" },
      { number: 2, targetReps: "15", weight: "17.5", status: "active", doneReps: "", doneWeight: "17.5" },
      { number: 3, targetReps: "12", weight: "20", status: "pending" },
      { number: 4, targetReps: "12", weight: "20", status: "pending" },
    ],
  },
  {
    id: 4,
    name: "Tríceps Pulley Corda",
    muscle: "Tríceps",
    equipment: "Cabos",
    difficulty: "Intermediário",
    sets: [
      { number: 1, targetReps: "15", weight: "25", status: "done", doneReps: "15", doneWeight: "25" },
      { number: 2, targetReps: "15", weight: "30", status: "done", doneReps: "15", doneWeight: "30" },
      { number: 3, targetReps: "12", weight: "35", status: "done", doneReps: "12", doneWeight: "35" },
      { number: 4, targetReps: "12", weight: "35", status: "done", doneReps: "12", doneWeight: "35" },
    ],
  },
  {
    id: 5,
    name: "Tríceps Francês Halteres",
    muscle: "Tríceps",
    equipment: "Halteres",
    difficulty: "Intermediário",
    sets: [
      { number: 1, targetReps: "12", weight: "12", status: "pending" },
      { number: 2, targetReps: "12", weight: "12", status: "pending" },
      { number: 3, targetReps: "10", weight: "14", status: "pending" },
      { number: 4, targetReps: "10", weight: "14", status: "pending" },
    ],
  },
  {
    id: 6,
    name: "Desenvolvimento Militar",
    muscle: "Ombros",
    equipment: "Barra",
    difficulty: "Avançado",
    sets: [
      { number: 1, targetReps: "10", weight: "30", status: "pending" },
      { number: 2, targetReps: "10", weight: "35", status: "pending" },
      { number: 3, targetReps: "8", weight: "40", status: "pending" },
      { number: 4, targetReps: "8", weight: "40", status: "pending" },
    ],
  },
  {
    id: 7,
    name: "Elevação Lateral",
    muscle: "Ombros",
    equipment: "Halteres",
    difficulty: "Iniciante",
    sets: [
      { number: 1, targetReps: "15", weight: "8", status: "pending" },
      { number: 2, targetReps: "15", weight: "10", status: "pending" },
      { number: 3, targetReps: "12", weight: "10", status: "pending" },
      { number: 4, targetReps: "12", weight: "12", status: "pending" },
    ],
  },
];

const historyItems = [
  { day: "Ontem", title: "Dia B - Costas e Bíceps", progress: 92, duration: "48 min", volume: "3.420 kg" },
  { day: "3 dias atrás", title: "Dia C - Pernas", progress: 100, duration: "62 min", volume: "4.810 kg" },
  { day: "Semana passada", title: "Dia A - Peito, Tríceps & Ombros", progress: 78, duration: "41 min", volume: "2.650 kg" },
];

export default async function TrainingPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tWorkout = await getTranslations("workout");
  const tCommon = await getTranslations("common");
  await requireAuthenticated();

  const hasWorkout = true;

  if (!hasWorkout) {
    return (
      <div className="w-full px-4 sm:px-6 py-8 pb-safe">
        <div className="space-y-6 max-w-4xl mx-auto">
          <header className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-text">{tWorkout("title")}</h1>
            <p className="text-sm md:text-base text-text-secondary">{tWorkout("desc")}</p>
          </header>
          <Card>
            <CardContent>
              <EmptyState
                className="py-16"
                icon={<Dumbbell size={40} className="text-text-secondary" />}
                title={tWorkout("emptyTitle")}
                description={tWorkout("emptyDesc")}
                action={
                  <Button variant="secondary" size="md">
                    <MessageCircle size={16} className="mr-2" />
                    {tWorkout("ctaContact")}
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 py-8 pb-safe space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-text">{tWorkout("title")}</h1>
          <p className="text-sm md:text-base text-text-secondary">{tWorkout("desc")}</p>
        </header>

        <Card className="relative overflow-hidden p-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-surface to-surface" />
          <div className="relative">
            <div className="aspect-video w-full bg-gradient-to-br from-primary/25 via-surface-secondary/50 to-surface" />
            <div className="p-6 space-y-4 -mt-16 relative">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge variant="success">
                    <Play size={12} className="mr-1" /> Em andamento
                  </Badge>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-text">
                      Dia A - Peito, Tríceps &amp; Ombros
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Semana 4 de 12 | foco: Hipertrofia superior
                    </p>
                  </div>
                </div>
                <Button variant="primary" size="md">
                  <Check size={16} className="mr-2" />
                  {tWorkout("finish")}
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-3 sm:p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-text-secondary text-xs font-medium">
                    <Clock3 size={14} />
                    {tWorkout("duration")}
                  </div>
                  <div className="text-lg font-bold text-text">32 min</div>
                  <Progress value={53} max={60} className="h-1.5" />
                </div>
                <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-3 sm:p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-text-secondary text-xs font-medium">
                    <Gauge size={14} />
                    {tWorkout("volume")}
                  </div>
                  <div className="text-lg font-bold text-text">2.840 kg</div>
                  <div className="h-1.5" />
                </div>
                <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-3 sm:p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-text-secondary text-xs font-medium">
                    <ListChecks size={14} />
                    {tWorkout("series")}
                  </div>
                  <div className="text-lg font-bold text-text">14/20</div>
                  <Progress value={70} max={100} className="h-1.5" />
                </div>
                <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-3 sm:p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-text-secondary text-xs font-medium">
                    <Activity size={14} />
                    {tWorkout("exercise")}
                  </div>
                  <div className="text-lg font-bold text-text">4/7</div>
                  <Progress value={57} max={100} className="h-1.5" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {exercises.map((ex) => (
            <Card key={ex.id} className="overflow-hidden">
              <div className="sticky top-0 z-10 bg-surface border-b border-border">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                  <div className="w-32 h-20 sm:w-40 sm:h-24 rounded-xl bg-gradient-to-br from-primary/10 to-surface-secondary flex items-center justify-center shrink-0">
                    <Dumbbell size={24} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-bold text-text">{ex.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{ex.muscle}</Badge>
                      <Badge variant="outline">{ex.equipment}</Badge>
                      <Badge variant="default">{ex.difficulty}</Badge>
                    </div>
                  </div>
                  <div className="sm:w-44 shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                        <Timer size={14} />
                        {tWorkout("restTimer")}
                      </div>
                      <span className="text-sm font-bold text-text tabular-nums">1:30</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="secondary" size="sm" className="flex-1 h-9 text-xs">
                        <Timer size={14} className="mr-1" /> 90s
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-xs" title="+30s">
                        <Plus size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-xs" title={tWorkout("restSkip")}>
                        <SkipForward size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-secondary text-xs">
                      <th className="text-left font-semibold px-4 sm:px-5 py-3 w-20">
                      {tWorkout("setNumber")}
                      </th>
                      <th className="text-left font-semibold px-4 sm:px-5 py-3">
                      {tWorkout("targetReps")}
                      </th>
                      <th className="text-left font-semibold px-4 sm:px-5 py-3">
                      {tWorkout("weight")}
                      </th>
                      <th className="text-left font-semibold px-4 sm:px-5 py-3">
                      {tCommon("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((s) => (
                      <tr
                        key={s.number}
                        className={
                          s.status === "active"
                            ? "bg-primary/10 border-b border-border"
                            : "border-b border-border last:border-0"
                        }
                      >
                        <td className="px-4 sm:px-5 py-3 font-semibold text-text">
                          {s.number}
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {s.status === "done" ? (
                            <span className="font-medium text-text">{s.doneReps}</span>
                          ) : s.status === "active" ? (
                            <Input
                              defaultValue={s.doneReps || ""}
                              placeholder={s.targetReps}
                              className="h-9 text-sm max-w-[120px]"
                            />
                          ) : (
                            <span className="text-text-secondary">{s.targetReps}</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {s.status === "done" ? (
                            <span className="font-medium text-text">{s.doneWeight} kg</span>
                          ) : s.status === "active" ? (
                            <Input
                              defaultValue={s.doneWeight || ""}
                              placeholder={s.weight}
                              className="h-9 text-sm max-w-[120px]"
                            />
                          ) : (
                            <span className="text-text-secondary">{s.weight} kg</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {s.status === "done" ? (
                            <Badge variant="success">
                              <Check size={12} className="mr-1" /> Concluído
                            </Badge>
                          ) : s.status === "active" ? (
                            <Button variant="primary" size="sm" className="h-9 text-xs">
                              <Check size={14} className="mr-1" />
                              {tWorkout("logSet")}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>

        <div className="sticky bottom-20 sm:static z-20 sm:z-0">
          <Card className="sm:mb-0">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Timer size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Cronômetro global de descanso</CardTitle>
                  <CardDescription>
                    {tWorkout("restEnded")}
                  </CardDescription>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-2xl font-bold text-text tabular-nums">01:30</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" className="flex-1 sm:flex-none h-10">
                  <Timer size={16} className="mr-2" />
                  {tWorkout("restButton")}
                </Button>
                <Button variant="secondary" size="sm" className="h-10">
                  +30s
                </Button>
                <Button variant="ghost" size="sm" className="h-10">
                  {tWorkout("restSkip")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{tWorkout("finish")}</CardTitle>
            <CardDescription>
              {tWorkout("feeling")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const isActive = n === 4;
                return (
                  <button
                    key={n}
                    type="button"
                    className={
                      "flex flex-col items-center justify-center gap-1 h-16 rounded-xl border transition-colors " +
                      (isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text-secondary hover:border-primary/50")
                    }
                  >
                    <Star
                      size={18}
                      className={isActive ? "fill-current" : ""}
                    />
                    <span className="text-xs font-semibold">
                      {n === 1
                        ? tWorkout("feeling1")
                        : n === 2
                        ? tWorkout("feeling2")
                        : n === 3
                        ? tWorkout("feeling3")
                        : n === 4
                        ? tWorkout("feeling4")
                        : tWorkout("feeling5")}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text">
                {tWorkout("notes")}
              </label>
              <Textarea
                placeholder={tWorkout("notesPlaceholder")}
                rows={3}
              />
            </div>
            <Button variant="primary" className="w-full h-12">
              <Check size={18} className="mr-2" />
              Finalizar sessão de treino
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <CardTitle className="text-base">{tWorkout("history")}</CardTitle>
                <CardDescription>
                  {tWorkout("progress")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyItems.map((h, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-text-secondary mb-0.5">
                      {h.day}
                    </div>
                    <div className="text-sm font-bold text-text">{h.title}</div>
                    <div className="flex gap-3 mt-1 text-xs text-text-secondary">
                      <span>{h.duration}</span>
                      <span>{h.volume}</span>
                    </div>
                  </div>
                  <Badge variant={h.progress === 100 ? "success" : "default"}>
                    {h.progress}%
                  </Badge>
                </div>
                <Progress value={h.progress} max={100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
