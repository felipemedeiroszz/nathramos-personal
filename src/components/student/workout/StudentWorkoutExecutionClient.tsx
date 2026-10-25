"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Check, Clock3, Dumbbell, Loader2, Star, Gauge, FileText } from "lucide-react";
import { RestTimerDisplay } from "./RestTimerDisplay";
import { logWorkoutSetAction, completeWorkoutSessionAction } from "@/app/actions/workouts";
import type {
  WorkoutProgramRow,
  WorkoutDayRow,
  WorkoutExerciseRow,
  ExerciseRow,
} from "@/types";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface StudentWorkoutExecutionClientProps {
  program: WorkoutProgramRow;
  day: WorkoutDayRow;
  sessionId: string;
  exercises: Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>;
  locale?: string;
}

type SetState = {
  reps_done: string;
  weight_kg: string;
  logged: boolean;
  logKey: string;
};

export function StudentWorkoutExecutionClient({
  program,
  day,
  sessionId,
  exercises,
  locale = "pt-BR",
}: StudentWorkoutExecutionClientProps) {
  const tWorkout = useTranslations("workout");
  const tMuscle = useTranslations("muscleGroups");
  const tEquip = useTranslations("equipments");
  const tDiff = useTranslations("difficultyLevels");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [activeTimer, setActiveTimer] = useState<{ key: string; seconds: number } | null>(null);
  const [feeling, setFeeling] = useState<number>(0);
  const [rpe, setRpe] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const initialSets = useMemo(() => {
    const map: Record<string, SetState[]> = {};
    for (const wex of exercises) {
      const list: SetState[] = [];
      for (let i = 1; i <= Math.max(1, wex.sets || 0); i++) {
        list.push({
          reps_done: "",
          weight_kg: wex.weight_kg != null ? String(wex.weight_kg) : "",
          logged: false,
          logKey: `${wex.id}:${i}`,
        });
      }
      map[wex.id] = list;
    }
    return map;
  }, [exercises]);

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetState[]>>(initialSets);

  const updateSet = (wexId: string, idx: number, patch: Partial<SetState>) => {
    setSetsByExercise((prev) => {
      const arr = (prev[wexId] || []).slice();
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [wexId]: arr };
    });
  };

  const logSet = async (
    wex: WorkoutExerciseRow & { exercise?: ExerciseRow | null },
    idx: number
  ) => {
    const s = (setsByExercise[wex.id] || [])[idx];
    if (!s || s.logged) return;

    const repsNum = Math.max(0, Number(s.reps_done.replace(",", ".")) || 0);
    const weightNum = s.weight_kg ? Number(s.weight_kg.replace(",", ".")) : wex.weight_kg ?? null;
    const set_number = idx + 1;

    startTransition(async () => {
      const res = await logWorkoutSetAction({
        session_id: sessionId,
        workout_exercise_id: wex.id,
        exercise_id: wex.exercise_id,
        set_number,
        reps_done: repsNum,
        weight_kg: weightNum != null && !isNaN(weightNum) ? weightNum : null,
        completed: true,
        failure_at_end: false,
      });

      if (res.success) {
        updateSet(wex.id, idx, { logged: true });
        setToast({ type: "ok", msg: `Serie ${set_number} registrada.` });
        setTimeout(() => setToast(null), 2000);
        const restSec = wex.rest_seconds ?? 60;
        if (restSec > 0) {
          setActiveTimer({ key: `${wex.id}:${idx}`, seconds: restSec });
        }
      } else {
        setToast({ type: "err", msg: res.message || "Falha ao registrar serie." });
        setTimeout(() => setToast(null), 3500);
      }
    });
  };

  const completeSession = async () => {
    if (completing) return;
    setCompleting(true);
    startTransition(async () => {
      const res = await completeWorkoutSessionAction({
        sessionId,
        feeling: feeling > 0 ? feeling : undefined,
        rpe: rpe ? Math.min(10, Math.max(1, Number(rpe) || 0)) : undefined,
        notes: notes || undefined,
      });
      setCompleting(false);
      if (res.success) {
        setCompleted(true);
        setToast({ type: "ok", msg: "Sessao de treino finalizada com sucesso!" });
      } else {
        setToast({ type: "err", msg: res.message || "Falha ao finalizar sessao." });
        setTimeout(() => setToast(null), 3500);
      }
    });
  };

  const totalSets = Object.values(setsByExercise).reduce((acc, arr) => acc + arr.length, 0);
  const doneSets = Object.values(setsByExercise).reduce(
    (acc, arr) => acc + arr.filter((s) => s.logged).length,
    0
  );
  const progressPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  if (completed) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <Check size={24} />
            </div>
            <div>
              <CardTitle>{tWorkout("completed")}</CardTitle>
              <CardDescription>{tWorkout("completedDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface/70 p-4">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Check size={14} /> Series
            </div>
            <div className="text-xl font-bold text-text">
              {doneSets} / {totalSets}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface/70 p-4">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Dumbbell size={14} /> Exercicios
            </div>
            <div className="text-xl font-bold text-text">{exercises.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface/70 p-4">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Clock3 size={14} /> Concluido
            </div>
            <div className="text-xl font-bold text-text">{progressPct}%</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg animate-fade-in",
            toast.type === "ok"
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-text/25 bg-text/[0.08] text-text"
          )}
        >
          {toast.msg}
        </div>
      )}

      <div className="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-background/85 backdrop-blur border-b border-border/60">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-text">
              {locale === "pt-BR" ? day.name_pt : day.name_en}
            </h2>
            {day.focus_pt || day.focus_en ? (
              <p className="text-sm text-text-secondary">
                Foco: {locale === "pt-BR" ? day.focus_pt : day.focus_en}
              </p>
            ) : null}
          </div>
          <Badge variant={progressPct === 100 ? "success" : "default"}>
            {doneSets}/{totalSets} series ({progressPct}%)
          </Badge>
        </div>
      </div>

      {activeTimer && (
        <RestTimerDisplay
          key={activeTimer.key + ":" + activeTimer.seconds}
          seconds={activeTimer.seconds}
          autoStart
          onComplete={() => setActiveTimer(null)}
          onExtendSeconds={30}
        />
      )}

      {exercises.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center text-center gap-2 text-text-secondary">
              <Dumbbell size={36} className="text-text-secondary" />
              <div className="font-semibold text-text">Nenhum exercicio configurado para hoje.</div>
              <p className="text-sm max-w-md">
                Entre em contato com sua personal caso julgue necessario.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        exercises.map((wex) => {
          const ex = wex.exercise;
          const exName = ex
            ? locale === "pt-BR"
              ? ex.name_pt
              : ex.name_en
            : "Exercicio";
          const sets = setsByExercise[wex.id] || [];
          const primary = ex?.primary_muscle ?? "";
          const equipment = ex?.equipment ?? "";
          const difficulty = ex?.difficulty ?? "";
          const imgUrl = ex?.gif_url || ex?.thumbnail_url || null;

          return (
            <Card key={wex.id} className="overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-start border-b border-border">
                <div className="w-full sm:w-40 shrink-0">
                  <div
                    className="aspect-video w-full sm:h-24 rounded-xl bg-gradient-to-br from-primary/15 to-surface-secondary flex items-center justify-center overflow-hidden"
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={exName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Dumbbell size={28} className="text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-text mb-2">{exName}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {primary && (
                      <Badge variant="outline">
                        {tryTranslate(tMuscle, primary)}
                      </Badge>
                    )}
                    {equipment && (
                      <Badge variant="outline">
                        {tryTranslate(tEquip, equipment)}
                      </Badge>
                    )}
                    {difficulty && (
                      <Badge variant="default">
                        {tryTranslate(tDiff, difficulty)}
                      </Badge>
                    )}
                    {wex.sets && (
                      <Badge variant="outline">{wex.sets} series</Badge>
                    )}
                    {wex.reps && (
                      <Badge variant="outline">
                        {tWorkout("reps")}: {wex.reps}
                      </Badge>
                    )}
                  </div>
                  {(wex.notes_pt || wex.notes_en) && (
                    <div className="mt-3 rounded-xl border border-border bg-surface-secondary/40 p-3">
                      <div className="flex items-start gap-2">
                        <FileText size={14} className="mt-0.5 text-text-secondary shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-text-secondary mb-0.5">
                            {tWorkout("observations")}
                          </div>
                          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
                            {locale === "pt-BR" ? wex.notes_pt : wex.notes_en}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
                        {tWorkout("doneReps")}
                      </th>
                      <th className="text-left font-semibold px-4 sm:px-5 py-3">
                        {tWorkout("weight")}
                      </th>
                      <th className="text-left font-semibold px-4 sm:px-5 py-3 w-36">
                        {tCommon("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((s, i) => (
                      <tr
                        key={s.logKey}
                        className={cn(
                          "border-b border-border last:border-0 transition-colors",
                          s.logged ? "bg-primary/5" : ""
                        )}
                      >
                        <td className="px-4 sm:px-5 py-3 font-semibold text-text">
                          {i + 1}
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {s.logged ? (
                            <span className="font-medium text-text">
                              {s.reps_done || "-"}
                            </span>
                          ) : (
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={s.reps_done}
                              placeholder={wex.reps || tWorkout("enterReps")}
                              onChange={(e) =>
                                updateSet(wex.id, i, { reps_done: e.target.value })
                              }
                              className="h-9 text-sm max-w-[140px]"
                            />
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {s.logged ? (
                            <span className="font-medium text-text">
                              {s.weight_kg ? `${s.weight_kg} kg` : "-"}
                            </span>
                          ) : (
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={s.weight_kg}
                              placeholder={
                                wex.weight_kg != null
                                  ? String(wex.weight_kg)
                                  : tWorkout("enterWeight")
                              }
                              onChange={(e) =>
                                updateSet(wex.id, i, { weight_kg: e.target.value })
                              }
                              className="h-9 text-sm max-w-[140px]"
                            />
                          )}
                        </td>
                        <td className="px-4 sm:px-5 py-3">
                          {s.logged ? (
                            <Badge variant="success">
                              <Check size={12} className="mr-1" />
                              {tWorkout("completed")}
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              className="h-9 text-xs"
                              onClick={() => logSet(wex, i)}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <Loader2 size={14} className="mr-1 animate-spin" />
                              ) : (
                                <Check size={14} className="mr-1" />
                              )}
                              {tWorkout("completeSet")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Star size={20} />
            </div>
            <div>
              <CardTitle>{tWorkout("finish")}</CardTitle>
              <CardDescription>{tWorkout("feeling")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-text">
              Sentimento ({feeling > 0 ? `${feeling}/5` : "opcional"})
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = feeling >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFeeling(feeling === n ? 0 : n)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 h-16 sm:h-20 rounded-xl border transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text-secondary hover:border-primary/50 hover:text-text"
                    )}
                  >
                    <Star size={20} className={active ? "fill-current" : ""} />
                    <span className="text-xs font-semibold leading-tight">
                      {tWorkout(`feeling${n}` as any)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text flex items-center gap-2">
                <Gauge size={14} className="text-text-secondary" /> RPE Medio (1-10)
                <span className="text-xs font-normal text-text-secondary">(opcional)</span>
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                step={0.5}
                placeholder="Ex.: 7.5"
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text flex items-center gap-2">
                <Clock3 size={14} className="text-text-secondary" /> {tWorkout("duration")}
                <span className="text-xs font-normal text-text-secondary">
                  (minutos, opcional)
                </span>
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="Ex.: 45"
                defaultValue={day.est_minutes || undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-text">{tWorkout("notes")}</label>
            <Textarea
              rows={3}
              placeholder={tWorkout("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full h-12"
            onClick={completeSession}
            disabled={completing}
          >
            {completing ? (
              <Loader2 size={18} className="mr-2 animate-spin" />
            ) : (
              <Check size={18} className="mr-2" />
            )}
            {completing ? "Finalizando..." : "Finalizar sessao de treino"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function tryTranslate(t: (k: any) => string, key: string): string {
  try {
    if (!key) return key;
    return t(key as any);
  } catch {
    return key;
  }
}
