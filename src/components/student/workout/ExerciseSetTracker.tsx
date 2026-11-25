"use client";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
export interface ExerciseSetEntry {
  failure_at_end?: boolean;
  drop_steps?: { reps_done: string; weight_kg: string }[];
  reps_done: string;
  weight_kg: string;
  logged: boolean;
  logKey: string;
}
export function ExerciseSetTracker({
  sets,
  targetReps,
  referenceWeight,
  name,
  locale,
  busy,
  labels,
  onChange,
  onLog,
}: {
  sets: ExerciseSetEntry[];
  targetReps: string | null;
  referenceWeight: number | null;
  name: string;
  locale: string;
  busy: boolean;
  labels: {
    actualReps: string;
    weight: string;
    complete: string;
    completed: string;
  };
  onChange: (index: number, patch: Partial<ExerciseSetEntry>) => void;
  onLog: (index: number) => void;
}) {
  const en = locale === "en-US",
    completed = sets.filter((set) => set.logged).length;
  return (
    <section
      className="student-set-tracker"
      aria-label={`${en ? "Sets" : "Séries"} · ${name}`}
    >
      <div className="student-set-heading">
        <div>
          <h4>{en ? "Your sets" : "Suas séries"}</h4>
          <p>
            {en
              ? "Log what you actually did in each set."
              : "Registre o que você realmente fez em cada série."}
          </p>
        </div>
        <span>
          {completed}/{sets.length} {en ? "saved" : "salvas"}
        </span>
      </div>
      <div className="student-set-list">
        {sets.map((set, index) => (
          <div
            className="student-set-entry"
            data-state={set.logged ? "saved" : "pending"}
            key={set.logKey}
            role="group"
            aria-label={`${en ? "Set" : "Série"} ${index + 1} · ${name}`}
          >
            <div className="student-set-identity">
              <span className="student-set-index">
                {set.logged ? (
                  <Check size={16} />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <strong>
                  {en ? "Set" : "Série"} {index + 1}
                </strong>
                <span>
                  {en ? "Target" : "Meta"}: <b>{targetReps || "—"}</b>{" "}
                  {targetReps ? (en ? "reps" : "repetições") : ""}
                </span>
              </div>
            </div>
            {set.logged ? (
              <>
                <div className="student-set-result">
                  <span>{en ? "Reps done" : "Repetições feitas"}</span>
                  <strong>{set.reps_done || "0"}</strong>
                </div>
                <div className="student-set-result">
                  <span>{en ? "Weight used" : "Carga usada"}</span>
                  <strong>{set.weight_kg ? `${set.weight_kg} kg` : "—"}</strong>
                </div>
                <span className="student-set-saved">
                  <Check size={14} />
                  {labels.completed}
                </span>
              </>
            ) : (
              <>
                <label className="student-set-input">
                  <span>{en ? "Reps done" : "Repetições feitas"}</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={set.reps_done}
                    aria-label={`${labels.actualReps} · ${name} · ${index + 1}`}
                    placeholder={en ? "E.g. 10" : "Ex.: 10"}
                    disabled={busy}
                    onChange={(event) =>
                      onChange(index, { reps_done: event.target.value })
                    }
                  />
                </label>
                <label className="student-set-input">
                  <span>{en ? "Weight used (kg)" : "Carga usada (kg)"}</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={set.weight_kg}
                    aria-label={`${labels.weight} · ${name} · ${index + 1}`}
                    placeholder={
                      referenceWeight != null
                        ? `Ref. ${referenceWeight}`
                        : en
                          ? "Optional"
                          : "Opcional"
                    }
                    disabled={busy}
                    onChange={(event) =>
                      onChange(index, { weight_kg: event.target.value })
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="student-set-confirm"
                  title={labels.complete}
                  disabled={busy}
                  onClick={() => onLog(index)}
                >
                  {busy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>{labels.complete}</span>
                </Button>
              </>
            )}
            <div className="student-drop-section">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!set.failure_at_end}
                  disabled={busy || set.logged}
                  onChange={(e) =>
                    onChange(index, { failure_at_end: e.target.checked })
                  }
                />
                {en ? "To failure" : "Até a falha"}
              </label>
              {(set.drop_steps || []).map((drop, dropIndex) => (
                <div
                  key={dropIndex}
                  className="mt-3 flex flex-wrap items-end gap-3"
                >
                  <strong className="text-sm">Drop {dropIndex + 1}</strong>
                  <label className="min-w-0 flex-1 text-xs">
                    {en ? "Reps done" : "Repetições feitas"}
                    <Input
                      aria-label={`Drop ${dropIndex + 1} · ${en ? "reps" : "repetições"} · ${name} · ${index + 1}`}
                      inputMode="numeric"
                      value={drop.reps_done}
                      disabled={busy || set.logged}
                      onChange={(e) =>
                        onChange(index, {
                          drop_steps: set.drop_steps!.map((d, i) =>
                            i === dropIndex
                              ? { ...d, reps_done: e.target.value }
                              : d,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="min-w-0 flex-1 text-xs">
                    {en ? "Weight (kg)" : "Carga (kg)"}
                    <Input
                      aria-label={`Drop ${dropIndex + 1} · kg · ${name} · ${index + 1}`}
                      inputMode="decimal"
                      value={drop.weight_kg}
                      disabled={busy || set.logged}
                      onChange={(e) =>
                        onChange(index, {
                          drop_steps: set.drop_steps!.map((d, i) =>
                            i === dropIndex
                              ? { ...d, weight_kg: e.target.value }
                              : d,
                          ),
                        })
                      }
                    />
                  </label>
                  {!set.logged && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onChange(index, {
                          drop_steps: set.drop_steps!.filter(
                            (_, i) => i !== dropIndex,
                          ),
                        })
                      }
                    >
                      {en ? "Remove" : "Remover"}
                    </button>
                  )}
                </div>
              ))}
              {!set.logged && (set.drop_steps?.length || 0) < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={busy}
                  onClick={() =>
                    onChange(index, {
                      drop_steps: [
                        ...(set.drop_steps || []),
                        { reps_done: "", weight_kg: "" },
                      ],
                    })
                  }
                >
                  + Drop set
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="student-set-help">
        {en
          ? "The target is your coach's instruction. Your log records the result, even when it differs from the target."
          : "A meta é a orientação da treinadora. O registro guarda seu resultado, mesmo que seja diferente da meta."}
      </p>
    </section>
  );
}
