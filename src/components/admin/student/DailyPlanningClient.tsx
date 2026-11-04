"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import type {
  DailyPlanningService,
  PlanningAssignment,
} from "@/services/DailyPlanningService";
import {
  previewDailyPlanningAction,
  saveDailyPlanningAction,
} from "@/app/actions/dailyPlanning";
import { DailyItemsClient } from "@/components/student/RoutineClients";
import { RoutineSummary } from "@/components/student/RoutineSummary";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { DailyRule } from "@/lib/student/schedule";
type Planning = Awaited<ReturnType<typeof DailyPlanningService.get>>;
const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const daysEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function RuleEditor({
  assignment: a,
  date,
  studentId,
  onSaved,
  readOnly,
}: {
  assignment: PlanningAssignment;
  date: string;
  studentId: string;
  onSaved: () => Promise<void>;
  readOnly: boolean;
}) {
  const en = useLocale() === "en-US",
    t = (pt: string, eng: string) => (en ? eng : pt);
  const [rule, setRule] = useState<DailyRule>(a.rule),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [slots, setSlots] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      a.items.map((i) => [i.id, a.rule.items[i.id]?.slots?.join(", ") || ""]),
    ),
  );
  const update = (key: keyof DailyRule, value: unknown) =>
    setRule((r) => ({ ...r, [key]: value }));
  const override = (id: string, key: string, value: unknown) =>
    setRule((r) => ({
      ...r,
      items: { ...r.items, [id]: { ...r.items[id], [key]: value } },
    }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const items = { ...rule.items };
    for (const item of a.items) {
      const value = slots[item.id]?.trim();
      items[item.id] = { ...items[item.id] };
      if (value) items[item.id].slots = value.split(",").map((s) => s.trim());
      else delete items[item.id].slots;
    }
    try {
      const result = await saveDailyPlanningAction({
        studentId,
        kind: a.kind,
        assignmentId: a.id,
        effectiveFrom: date,
        revision: a.revision,
        rule: { ...rule, items },
      });
      if (!result.success) setMessage(result.message);
      else {
        setMessage(t("Programação salva.", "Schedule saved."));
        await onSaved();
      }
    } catch {
      setMessage(
        t("Falha ao salvar. Tente novamente.", "Could not save. Try again."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-xl border border-border p-4">
      <summary className="cursor-pointer font-semibold">
        {a.name} ·{" "}
        {a.kind === "diet"
          ? t("Dieta", "Diet")
          : a.kind === "supplement"
            ? t("Suplementos", "Supplements")
            : t("Treino", "Workout")}
      </summary>
      <p className="my-3 text-xs text-text-secondary">
        {t("Vigência do vínculo", "Assignment period")}: {a.start} →{" "}
        {a.end || t("sem término", "no end date")}
      </p>
      <form onSubmit={save}>
        <fieldset disabled={readOnly || busy} className="space-y-4">
          <p className="text-sm">
            {t("Estas regras valem a partir de", "These rules take effect on")}{" "}
            <strong>{date}</strong>.{" "}
            {t(
              "Datas futuras já programadas continuam com suas próprias regras.",
              "Existing future versions retain their own rules.",
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            {days.map((name, i) => (
              <label key={i} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={rule.weekdays.includes(i + 1)}
                  onChange={(e) =>
                    update(
                      "weekdays",
                      e.target.checked
                        ? [...rule.weekdays, i + 1]
                        : rule.weekdays.filter((d) => d !== i + 1),
                    )
                  }
                />
                {en ? daysEn[i] : name}
              </label>
            ))}
          </div>
          <label className="block text-sm">
            {t(
              "Somente nesta data (opcional; substitui os dias da semana)",
              "Only on this date (optional; overrides weekdays)",
            )}
            <Input
              type="date"
              min={date}
              value={rule.on_date || ""}
              onChange={(e) => update("on_date", e.target.value || null)}
            />
          </label>
          {a.kind !== "workout" ? (
            <>
              <label className="block text-sm">
                {t("Aplicar em", "Apply on")}
                <Select
                  value={rule.condition}
                  onChange={(e) => update("condition", e.target.value)}
                >
                  <option value="all">
                    {t("Todos os dias selecionados", "All selected days")}
                  </option>
                  <option value="training">
                    {t("Somente dias com treino", "Training days only")}
                  </option>
                  <option value="rest">
                    {t(
                      "Somente descanso programado",
                      "Scheduled rest days only",
                    )}
                  </option>
                </Select>
              </label>
              <label className="block text-sm">
                {t(
                  "Como combinar com outros kits",
                  "How to combine with other kits",
                )}
                <Select
                  value={rule.alternative_group ? "alternative" : "additive"}
                  onChange={(e) =>
                    update(
                      "alternative_group",
                      e.target.value === "alternative"
                        ? a.kind === "diet"
                          ? "dieta-principal"
                          : "suplementos-alternativos"
                        : null,
                    )
                  }
                >
                  <option value="additive">
                    {t(
                      "Complementar — cumprir junto com os outros",
                      "Complementary — follow alongside other kits",
                    )}
                  </option>
                  <option value="alternative">
                    {t(
                      "Alternativa — usar apenas um kit do grupo",
                      "Alternative — use one kit from the group",
                    )}
                  </option>
                </Select>
              </label>
              {rule.alternative_group !== null && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    {t("Grupo de alternativas", "Alternative group")}
                    <Input
                      required
                      maxLength={60}
                      value={rule.alternative_group}
                      onChange={(e) =>
                        update("alternative_group", e.target.value)
                      }
                    />
                  </label>
                  <label className="text-sm">
                    {t("Prioridade (maior vence)", "Priority (highest wins)")}
                    <Input
                      type="number"
                      min={0}
                      max={999}
                      value={rule.priority}
                      onChange={(e) =>
                        update("priority", Number(e.target.value))
                      }
                    />
                  </label>
                  <p className="text-xs text-text-secondary md:col-span-2">
                    {t(
                      "No mesmo grupo, só aparece o kit elegível de maior prioridade. Em empate, vale o vínculo mais recente.",
                      "Within a group, only the eligible kit with the highest priority appears. Ties use the newest assignment.",
                    )}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <label className="block text-sm">
                {t(
                  "Horário do treino e lembrete (opcional)",
                  "Workout and reminder time (optional)",
                )}
                <Input
                  type="time"
                  value={rule.workout_time || ""}
                  onChange={(e) =>
                    update("workout_time", e.target.value || null)
                  }
                />
              </label>
              <p className="text-sm">
                {t(
                  "Descanso programado (prevalece sobre o treino deste vínculo)",
                  "Scheduled rest (overrides this assignment's workouts)",
                )}
              </p>
              <div className="flex flex-wrap gap-3">
                {days.map((name, i) => (
                  <label key={i} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={rule.rest_weekdays.includes(i + 1)}
                      onChange={(e) =>
                        update(
                          "rest_weekdays",
                          e.target.checked
                            ? [...rule.rest_weekdays, i + 1]
                            : rule.rest_weekdays.filter((d) => d !== i + 1),
                        )
                      }
                    />
                    {en ? daysEn[i] : name}
                  </label>
                ))}
              </div>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rule.repeat_cycle}
                  onChange={(e) => update("repeat_cycle", e.target.checked)}
                />
                {t(
                  "Repetir ciclo ao terminar as semanas do programa",
                  "Repeat the cycle after the program's last week",
                )}
              </label>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rule.fallback_week_one}
                  onChange={(e) =>
                    update("fallback_week_one", e.target.checked)
                  }
                />
                {t(
                  "Usar a semana 1 quando a semana atual não tiver dias cadastrados",
                  "Use week 1 if the current week has no configured days",
                )}
              </label>
              <p className="text-xs text-text-secondary">
                {t(
                  "As semanas contam períodos de 7 dias desde o início do vínculo. Exercícios avulsos mantêm sua agenda semanal durante a duração do kit.",
                  "Weeks are seven-day periods starting on the assignment start date. Direct exercises retain their weekly schedule throughout the kit duration.",
                )}
              </p>
            </>
          )}
          <label className="block text-sm">
            {t(
              "Orientações individuais (substitui a observação geral do vínculo)",
              "Individual guidance (replaces the assignment's general note)",
            )}
            <Textarea
              value={rule.notes}
              placeholder={a.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </label>
          {a.items.map((item) => (
            <div
              key={item.id}
              className="space-y-2 rounded-xl border border-border p-3"
            >
              <h4 className="text-sm font-semibold">{item.name}</h4>
              <p className="text-xs text-text-secondary">
                {t("Padrão do kit", "Kit default")}: {item.quantity} {item.unit}{" "}
                · {item.slots.join(", ") || t("sem horário", "no set time")}
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs">
                  {t("Quantidade individual", "Individual quantity")}
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder={String(item.quantity)}
                    value={rule.items[item.id]?.quantity ?? ""}
                    onChange={(e) =>
                      override(
                        item.id,
                        "quantity",
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </label>
                <label className="text-xs">
                  {t("Unidade individual", "Individual unit")}
                  <Input
                    placeholder={item.unit}
                    value={rule.items[item.id]?.unit ?? ""}
                    onChange={(e) =>
                      override(item.id, "unit", e.target.value || undefined)
                    }
                  />
                </label>
                <label className="text-xs">
                  {t(
                    "Horários, separados por vírgula",
                    "Times, separated by commas",
                  )}
                  <Input
                    placeholder="08:00, 18:00"
                    value={slots[item.id] || ""}
                    onChange={(e) =>
                      setSlots((v) => ({ ...v, [item.id]: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="block text-xs">
                {t("Orientação do item", "Item guidance")}
                <Textarea
                  value={rule.items[item.id]?.notes ?? ""}
                  onChange={(e) =>
                    override(item.id, "notes", e.target.value || undefined)
                  }
                />
              </label>
            </div>
          ))}
          <p className="text-xs text-text-secondary">
            {t(
              "Campos individuais vazios usam o padrão do kit. Cada horário informado representa uma porção ou dose completa.",
              "Empty individual fields use the kit default. Each specified time represents a full serving or dose.",
            )}
          </p>
          <Button type="submit" disabled={busy || readOnly}>
            {busy
              ? t("Salvando…", "Saving…")
              : t(
                  "Salvar programação deste vínculo",
                  "Save this assignment's schedule",
                )}
          </Button>
        </fieldset>
      </form>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </details>
  );
}
export function DailyPlanningClient({
  studentId,
  initial,
}: {
  studentId: string;
  initial: Planning;
}) {
  const en = useLocale() === "en-US",
    t = (pt: string, eng: string) => (en ? eng : pt);
  const [planning, setPlanning] = useState(initial),
    [date, setDate] = useState(initial.data.date),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function load(selected = date, successMessage = "") {
    setBusy(true);
    setMessage("");
    try {
      const result = await previewDailyPlanningAction(studentId, selected);
      if (result.success) {
        setPlanning(result.planning);
        setMessage(successMessage);
      } else setMessage(result.message);
    } catch {
      setMessage(t("Falha ao carregar.", "Could not load."));
    } finally {
      setBusy(false);
    }
  }
  const data = planning.data,
    past =
      data.prescriptionStatus === "recorded" ||
      data.prescriptionStatus === "unavailable";
  return (
    <section className="space-y-5" aria-busy={busy}>
      <h2 className="text-xl font-bold">
        {t(
          "Programação diária e acompanhamento",
          "Daily planning and follow-up",
        )}
      </h2>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="text-sm">
          {t("Consultar dia", "View day")}
          <Input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <Button disabled={busy} type="submit">
          {t("Ver dia do aluno", "Preview student's day")}
        </Button>
      </form>
      {message && <p role="status">{message}</p>}
      <p className="text-sm text-text-secondary">
        {data.date} ·{" "}
        {data.prescriptionStatus === "preview"
          ? t("Prévia; ainda não é histórico", "Preview; not yet history")
          : data.prescriptionStatus === "recorded"
            ? t("Histórico preservado", "Preserved history")
            : data.prescriptionStatus === "unavailable"
              ? t(
                  "Não há prescrição histórica salva para este dia. Os registros existentes continuam preservados.",
                  "No prescription was saved for this date. Existing logs are preserved.",
                )
              : t("Rotina atual", "Current routine")}
      </p>
      {planning.ruleVersions.length > 0 && (
        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer">
            {t(
              "Datas com programação personalizada",
              "Dates with customized schedules",
            )}
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(new Set(planning.ruleVersions.map((v) => v.date))).map(
              (d) => (
                <button
                  key={d}
                  type="button"
                  disabled={busy}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                  onClick={() => {
                    setDate(d);
                    void load(d);
                  }}
                >
                  {d}
                </button>
              ),
            )}
          </div>
        </details>
      )}
      {!past && (
        <div className="space-y-3">
          <h3 className="font-semibold">
            {t("Configurar vínculos", "Configure assignments")}
          </h3>
          {!planning.assignments.length && (
            <p>
              {t(
                "Vincule um kit ou programa ao aluno nas abas de treino, dieta ou suplementos.",
                "Assign a kit or program in the workout, diet or supplements tabs.",
              )}
            </p>
          )}
          {planning.assignments.map((a) => (
            <RuleEditor
              key={`${a.kind}:${a.id}:${data.date}:${a.revision}`}
              assignment={a}
              date={data.date}
              studentId={studentId}
              onSaved={() =>
                load(
                  data.date,
                  t(
                    "Programação salva. Prévia atualizada.",
                    "Schedule saved. Preview updated.",
                  ),
                )
              }
              readOnly={busy}
            />
          ))}
        </div>
      )}
      <RoutineSummary data={data} />
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold">{t("Treino do dia", "Daily workout")}</h3>
        <p>
          {data.workoutState === "rest"
            ? t(
                "Descanso programado pelo personal",
                "Rest scheduled by the coach",
              )
            : data.workoutState === "unassigned"
              ? t(
                  "Sem treino ou descanso programado",
                  "No workout or rest scheduled",
                )
              : t("Dia de treino", "Training day")}
        </p>
        {data.workoutNotes && (
          <p className="whitespace-pre-wrap text-sm">{data.workoutNotes}</p>
        )}
        {data.workouts.map((w: any) => (
          <div key={w.day.id} className="space-y-2">
            <h4 className="font-medium">
              {en ? w.day.name_en : w.day.name_pt} ·{" "}
              {en ? w.program.title_en : w.program.title_pt}
            </h4>
            <p className="text-sm text-text-secondary">
              {data.workoutSessions?.some(
                (s) => s.day_id === w.day.id && s.completed_at,
              )
                ? t("Concluído", "Completed")
                : data.workoutSessions?.some((s) => s.day_id === w.day.id)
                  ? t("Em andamento", "In progress")
                  : t("Pendente", "Pending")}
            </p>
            {w.slot && (
              <p className="text-sm">
                {t("Horário", "Time")}: {w.slot}
              </p>
            )}
            {w.notes && (
              <p className="whitespace-pre-wrap text-sm">{w.notes}</p>
            )}
            <ul className="space-y-1 text-sm">
              {w.exercises.map((e: any) => (
                <li key={e.id}>
                  {en ? e.exercise?.name_en : e.exercise?.name_pt} · {e.sets}{" "}
                  {t("séries", "sets")} · {e.reps || "—"} · {e.weight_kg ?? "—"}{" "}
                  kg
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {data.workoutSessions?.length > 0 && (
        <p className="text-sm text-text-secondary">
          {t("Sessões registradas no dia", "Sessions logged on this day")}:{" "}
          {data.workoutSessions.length} · {t("concluídas", "completed")}:{" "}
          {data.workoutSessions.filter((s) => s.completed_at).length}
        </p>
      )}
      <DailyItemsClient
        items={data.diet}
        kind="diet"
        consumed={data.consumedNutrition}
        planned={data.plannedNutrition}
        readOnly
      />
      <DailyItemsClient items={data.supplements} kind="supplement" readOnly />
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer">
          {t("Revisões anteriores do dia", "Previous revisions of this day")} (
          {planning.history.length})
        </summary>
        <div className="mt-3 space-y-4">
          {planning.history.map((h: any) => (
            <details key={h.id}>
              <summary className="cursor-pointer text-sm">
                {h.archived_at}
              </summary>
              <DailyItemsClient
                items={(h.payload.diet || []).map((i: any) => ({
                  ...i,
                  done: data.logs.some(
                    (l) =>
                      l.kind === i.kind &&
                      l.logged_date === data.date &&
                      l.assignment_id === i.assignmentId &&
                      l.item_id === i.itemId &&
                      l.slot === i.slot,
                  ),
                }))}
                kind="diet"
                readOnly
              />
              <DailyItemsClient
                items={(h.payload.supplements || []).map((i: any) => ({
                  ...i,
                  done: data.logs.some(
                    (l) =>
                      l.kind === i.kind &&
                      l.logged_date === data.date &&
                      l.assignment_id === i.assignmentId &&
                      l.item_id === i.itemId &&
                      l.slot === i.slot,
                  ),
                }))}
                kind="supplement"
                readOnly
              />
              <ul className="mt-2 text-sm">
                {(h.payload.workouts || []).map((w: any) => (
                  <li key={w.day.id}>
                    {en ? w.day.name_en : w.day.name_pt} · {w.exercises.length}{" "}
                    {t("exercícios", "exercises")}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </details>
    </section>
  );
}
