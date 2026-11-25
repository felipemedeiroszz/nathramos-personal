"use client";
import type { CardioData } from "@/lib/cardio";
import { ExerciseMedia } from "@/components/shared/ExerciseMedia";
import { ExerciseSetTracker } from "./ExerciseSetTracker";
import { exerciseMediaSource, exerciseMediaKind } from "@/lib/exercise-media";
import { mergeWorkoutSets } from "@/lib/live/workout";
import { notifyDataChanged } from "@/lib/live/events";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import {
  Check,
  Clock3,
  Dumbbell,
  Loader2,
  Star,
  Gauge,
  FileText,
} from "lucide-react";
import { RestTimerDisplay } from "./RestTimerDisplay";
import {
  logWorkoutSetAction,
  completeWorkoutSessionAction,
} from "@/app/actions/workouts";
import type {
  WorkoutProgramRow,
  WorkoutDayRow,
  WorkoutExerciseRow,
  ExerciseRow,
  ExerciseSetLogRow,
} from "@/types";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getWorkoutLabels } from "@/lib/workoutLabels";

export interface StudentWorkoutExecutionClientProps {
  program: WorkoutProgramRow;
  day: WorkoutDayRow;
  sessionId: string;
  exercises: Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>;
  locale?: string;
  initialLogs?: ExerciseSetLogRow[];
  guidance?: string | null;
  cardio?: CardioData;
}

type SetState = {
  failure_at_end?: boolean;
  drop_steps?: { reps_done: string; weight_kg: string }[];
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
  initialLogs = [],
  guidance,
  cardio,
}: StudentWorkoutExecutionClientProps) {
  const tWorkout = useTranslations("workout");
  const tMuscle = useTranslations("muscleGroups");
  const tEquip = useTranslations("equipments");
  const tDiff = useTranslations("difficultyLevels");
  const workoutLabels = getWorkoutLabels(locale);
  const labelAliases: Record<string, string> = {
    quadriceps: "quads",
    bodyweight: "body_weight",
  };

  const [isPending, setPending] = useState(false);
  const saving = useRef(false);
  async function startTransition(action: () => Promise<void>) {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    try {
      await action();
    } catch {
      setToast({
        type: "err",
        msg: "Não foi possível salvar. Tente novamente.",
      });
      setCompleting(false);
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const [activeTimer, setActiveTimer] = useState<{
    key: string;
    seconds: number;
  } | null>(null);
  const [feeling, setFeeling] = useState<number>(0);
  const [rpe, setRpe] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const todayCardio = cardio?.logs.find((l) => l.performed_on === cardio.today);
  const plannedCardio = cardio?.plans.find((p) => p.weekday === cardio.weekday);
  const [cardioStatus, setCardioStatus] = useState<"" | "done" | "skipped">(
    todayCardio?.status || "",
  );
  const [cardioActivity, setCardioActivity] = useState(
    todayCardio?.activity_id ||
      plannedCardio?.activity_id ||
      cardio?.activities.find((a) => a.is_active)?.id ||
      "",
  );
  const [cardioMinutes, setCardioMinutes] = useState(
    String(todayCardio?.duration_min || plannedCardio?.target_minutes || 20),
  );
  const [duration, setDuration] = useState("");

  const initialSets = useMemo(() => {
    const map: Record<string, SetState[]> = {};
    for (const wex of exercises) {
      const list: SetState[] = [];
      for (let i = 1; i <= Math.max(1, wex.sets || 0); i++) {
        const saved = initialLogs.find(
          (l) => l.workout_exercise_id === wex.id && l.set_number === i,
        );
        list.push({
          failure_at_end: saved?.failure_at_end || false,
          drop_steps: (saved?.drop_steps || []).map((d) => ({
            reps_done: String(d.reps_done),
            weight_kg: String(d.weight_kg),
          })),
          reps_done:
            initialLogs
              .find(
                (l) => l.workout_exercise_id === wex.id && l.set_number === i,
              )
              ?.reps_done.toString() || "",
          weight_kg: String(
            initialLogs.find(
              (l) => l.workout_exercise_id === wex.id && l.set_number === i,
            )?.weight_kg ?? "",
          ),
          logged: initialLogs.some(
            (l) =>
              l.workout_exercise_id === wex.id &&
              l.set_number === i &&
              l.completed,
          ),
          logKey: `${wex.id}:${i}`,
        });
      }
      map[wex.id] = list;
    }
    return map;
  }, [exercises, initialLogs]);

  const [setsByExercise, setSetsByExercise] =
    useState<Record<string, SetState[]>>(initialSets);
  const previousSets = useRef(initialSets);
  useEffect(() => {
    const baseline = previousSets.current;
    previousSets.current = initialSets;
    setSetsByExercise((previous) =>
      mergeWorkoutSets(previous, baseline, initialSets),
    );
  }, [initialSets]);

  const updateSet = (wexId: string, idx: number, patch: Partial<SetState>) => {
    setSetsByExercise((prev) => {
      const arr = (prev[wexId] || []).slice();
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, [wexId]: arr };
    });
  };

  const logSet = async (
    wex: WorkoutExerciseRow & { exercise?: ExerciseRow | null },
    idx: number,
  ) => {
    const s = (setsByExercise[wex.id] || [])[idx];
    if (!s || s.logged) return;

    if (!/^\d+$/.test(s.reps_done.trim()) || Number(s.reps_done) > 10000) {
      setToast({
        type: "err",
        msg:
          locale === "en-US"
            ? "Enter the repetitions you performed as a whole number."
            : "Informe quantas repetições você realizou, usando um número inteiro.",
      });
      return;
    }
    const repsNum = Number(s.reps_done);
    const weightNum = s.weight_kg
      ? Number(s.weight_kg.replace(",", "."))
      : null;
    if (weightNum !== null && (!Number.isFinite(weightNum) || weightNum < 0)) {
      setToast({
        type: "err",
        msg:
          locale === "en-US"
            ? "Enter a valid non-negative weight."
            : "Informe uma carga válida, igual ou maior que zero.",
      });
      return;
    }
    const drops = (s.drop_steps || []).map((d) => ({
      reps_done: Number(d.reps_done),
      weight_kg: Number(d.weight_kg.replace(",", ".")),
    }));
    if (
      (s.drop_steps || []).some(
        (d, i) =>
          !/^\d+$/.test(d.reps_done.trim()) ||
          !d.weight_kg.trim() ||
          !Number.isFinite(drops[i].weight_kg) ||
          drops[i].weight_kg < 0 ||
          drops[i].weight_kg > 100000 ||
          drops[i].reps_done > 10000,
      )
    ) {
      setToast({
        type: "err",
        msg:
          locale === "en-US"
            ? "Enter valid reps and weight for each drop."
            : "Informe repetições e carga válidas em cada etapa do drop set.",
      });
      return;
    }
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
        failure_at_end: !!s.failure_at_end,
        drop_steps: drops,
      });

      if (res.success) {
        updateSet(wex.id, idx, { logged: true });
        notifyDataChanged();
        setToast({ type: "ok", msg: `Serie ${set_number} registrada.` });
        setTimeout(() => setToast(null), 2000);
        const restSec = wex.rest_seconds ?? 60;
        if (restSec > 0) {
          setActiveTimer({ key: `${wex.id}:${idx}`, seconds: restSec });
        }
      } else {
        setToast({
          type: "err",
          msg: res.message || "Falha ao registrar serie.",
        });
        setTimeout(() => setToast(null), 3500);
      }
    });
  };

  const completeSession = async () => {
    if (completing || saving.current) return;
    if (
      cardio &&
      !cardio.unavailable &&
      (!cardioStatus ||
        (cardioStatus === "done" &&
          (!cardioActivity ||
            !/^\d+$/.test(cardioMinutes) ||
            Number(cardioMinutes) < 1 ||
            Number(cardioMinutes) > 1440)))
    ) {
      setToast({
        type: "err",
        msg:
          locale === "en-US"
            ? "Record whether you did cardio and enter valid minutes."
            : "Informe se fez ou pulou o cardio e preencha os minutos realizados.",
      });
      return;
    }
    setCompleting(true);
    startTransition(async () => {
      const res = await completeWorkoutSessionAction({
        sessionId,
        duration_min: duration ? Number(duration) : undefined,
        cardio:
          cardio && !cardio.unavailable && cardioStatus
            ? {
                status: cardioStatus,
                activity_id: cardioStatus === "done" ? cardioActivity : null,
                duration_min:
                  cardioStatus === "done" ? Number(cardioMinutes) : null,
              }
            : undefined,
        feeling: feeling > 0 ? feeling : undefined,
        rpe: rpe ? Math.min(10, Math.max(1, Number(rpe) || 0)) : undefined,
        notes: notes || undefined,
      });
      setCompleting(false);
      if (res.success) {
        setCompleted(true);
        notifyDataChanged();
        setToast({
          type: "ok",
          msg: "Sessao de treino finalizada com sucesso!",
        });
      } else {
        setToast({
          type: "err",
          msg: res.message || "Falha ao finalizar sessao.",
        });
        setTimeout(() => setToast(null), 3500);
      }
    });
  };

  const totalSets = Object.values(setsByExercise).reduce(
    (acc, arr) => acc + arr.length,
    0,
  );
  const doneSets = Object.values(setsByExercise).reduce(
    (acc, arr) => acc + arr.filter((s) => s.logged).length,
    0,
  );
  const progressPct =
    totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

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
              <Check size={14} /> Séries
            </div>
            <div className="text-xl font-bold text-text">
              {doneSets} / {totalSets}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface/70 p-4">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Dumbbell size={14} /> Exercícios
            </div>
            <div className="text-xl font-bold text-text">
              {exercises.length}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface/70 p-4">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Clock3 size={14} /> Concluído
            </div>
            <div className="text-xl font-bold text-text">{progressPct}%</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {guidance && (
        <p className="whitespace-pre-wrap rounded-xl border border-border p-4 text-sm text-text-secondary">
          {guidance}
        </p>
      )}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg animate-fade-in",
            toast.type === "ok"
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-text/25 bg-text/[0.08] text-text",
          )}
        >
          {toast.msg}
        </div>
      )}

      <div className="student-workout-progress sticky top-[72px] z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-background/85 backdrop-blur border-b border-border/60">
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
            {doneSets}/{totalSets} séries ({progressPct}%)
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
              <div className="font-semibold text-text">
                Nenhum exercício configurado para hoje.
              </div>
              <p className="text-sm max-w-md">
                Entre em contato com sua personal caso julgue necessário.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        exercises.map((wex, exerciseIndex) => {
          const ex = wex.exercise;
          const exName = ex
            ? locale === "pt-BR"
              ? ex.name_pt
              : ex.name_en
            : "Exercício";
          const sets = setsByExercise[wex.id] || [];
          const primary = ex?.primary_muscle ?? "";
          const equipment = ex?.equipment ?? "";
          const difficulty = ex?.difficulty ?? "";
          const imgUrl = exerciseMediaSource(ex);
          const video =
            imgUrl && ["youtube", "video"].includes(exerciseMediaKind(imgUrl));

          return (
            <Card
              key={wex.id}
              className="student-exercise-card overflow-hidden p-0"
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-start border-b border-border">
                <div
                  className={`w-full ${video ? "sm:w-80" : "sm:w-56"} shrink-0`}
                >
                  <div
                    className={`${video ? "min-h-[232px]" : "aspect-video sm:h-40"} w-full rounded-xl bg-gradient-to-br from-primary/15 to-surface-secondary flex items-center justify-center overflow-hidden`}
                  >
                    {imgUrl ? (
                      <ExerciseMedia
                        autoPlay
                        src={imgUrl}
                        locale={locale}
                        alt={exName}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <Dumbbell size={28} className="text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="student-exercise-number">
                    {locale === "en-US" ? "EXERCISE" : "EXERCÍCIO"}{" "}
                    {String(exerciseIndex + 1).padStart(2, "0")} /{" "}
                    {String(exercises.length).padStart(2, "0")}
                  </p>
                  <h3 className="text-base sm:text-lg font-bold text-text mb-2">
                    {exName}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {primary && (
                      <Badge variant="outline">
                        {workoutLabels.muscle[
                          labelAliases[primary] || primary
                        ] || tryTranslate(tMuscle, primary)}
                      </Badge>
                    )}
                    {equipment && (
                      <Badge variant="outline">
                        {workoutLabels.equipment[
                          labelAliases[equipment] || equipment
                        ] || tryTranslate(tEquip, equipment)}
                      </Badge>
                    )}
                    {difficulty && (
                      <Badge variant="default">
                        {workoutLabels.difficulty[difficulty] ||
                          tryTranslate(tDiff, difficulty)}
                      </Badge>
                    )}
                  </div>
                  <dl className="student-exercise-facts">
                    <div>
                      <dt>{locale === "en-US" ? "Sets" : "Séries"}</dt>
                      <dd>{sets.length}</dd>
                    </div>
                    <div>
                      <dt>
                        {locale === "en-US"
                          ? "Reps per set"
                          : "Repetições por série"}
                      </dt>
                      <dd>{wex.reps || "—"}</dd>
                    </div>
                    <div>
                      <dt>{locale === "en-US" ? "Rest" : "Descanso"}</dt>
                      <dd>
                        {wex.rest_seconds ?? 60}
                        <small>s</small>
                      </dd>
                    </div>
                  </dl>
                  {(wex.notes_pt || wex.notes_en) && (
                    <div className="mt-3 rounded-xl border border-border bg-surface-secondary/40 p-3">
                      <div className="flex items-start gap-2">
                        <FileText
                          size={14}
                          className="mt-0.5 text-text-secondary shrink-0"
                        />
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

              <ExerciseSetTracker
                sets={sets}
                targetReps={wex.reps ?? null}
                referenceWeight={wex.weight_kg ?? null}
                name={exName}
                locale={locale}
                busy={isPending}
                labels={{
                  actualReps: tWorkout("doneReps"),
                  weight: tWorkout("weight"),
                  complete: tWorkout("completeSet"),
                  completed: tWorkout("completed"),
                }}
                onChange={(index, patch) => updateSet(wex.id, index, patch)}
                onLog={(index) => logSet(wex, index)}
              />
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
                    aria-pressed={feeling === n}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 h-16 sm:h-20 rounded-xl border transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-text-secondary hover:border-primary/50 hover:text-text",
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
                <Gauge size={14} className="text-text-secondary" /> RPE médio
                (1-10)
                <span className="text-xs font-normal text-text-secondary">
                  (opcional)
                </span>
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
                <Clock3 size={14} className="text-text-secondary" />{" "}
                {tWorkout("duration")}
                <span className="text-xs font-normal text-text-secondary">
                  (minutos, opcional)
                </span>
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="Ex.: 45"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-text">
              {tWorkout("notes")}
            </label>
            <Textarea
              rows={3}
              placeholder={tWorkout("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {cardio && !cardio.unavailable && (
            <fieldset className="rounded-xl border border-border p-4 space-y-3">
              <legend className="px-2 font-semibold">
                {locale === "en-US" ? "Did you do cardio?" : "Fez cardio hoje?"}
              </legend>
              <div className="flex flex-wrap gap-4">
                {(["done", "skipped"] as const).map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`cardio-${sessionId}`}
                      value={status}
                      checked={cardioStatus === status}
                      onChange={() => setCardioStatus(status)}
                    />
                    {status === "done"
                      ? locale === "en-US"
                        ? "Yes, I did"
                        : "Sim, fiz"
                      : locale === "en-US"
                        ? "No, I skipped"
                        : "Não, pulei"}
                  </label>
                ))}
              </div>
              {cardioStatus === "done" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    {locale === "en-US" ? "Activity" : "Modalidade"}
                    <select
                      className="w-full rounded-xl bg-surface-secondary p-3"
                      value={cardioActivity}
                      onChange={(e) => setCardioActivity(e.target.value)}
                    >
                      <option value="">
                        {locale === "en-US" ? "Select" : "Selecione"}
                      </option>
                      {cardio.activities
                        .filter((a) => a.is_active)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {locale === "en-US" ? a.name_en : a.name_pt}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    {locale === "en-US"
                      ? "Actual minutes"
                      : "Minutos realizados"}
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      value={cardioMinutes}
                      onChange={(e) => setCardioMinutes(e.target.value)}
                    />
                  </label>
                </div>
              )}
              <p className="text-xs text-text-secondary">
                {locale === "en-US"
                  ? "This updates today’s cardio record. You can also plan your week below."
                  : "Este registro atualiza o cardio de hoje. Você também pode planejar sua semana abaixo."}
              </p>
            </fieldset>
          )}
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

function tryTranslate(
  t: ((k: any) => string) & { has?: (key: string) => boolean },
  key: string,
): string {
  try {
    if (!key) return key;
    if (t.has && !t.has(key)) return key.replace(/[_-]/g, " ");
    const label = t(key as any);
    return label.endsWith(`.${key}`) ? key.replace(/[_-]/g, " ") : label;
  } catch {
    return key;
  }
}
