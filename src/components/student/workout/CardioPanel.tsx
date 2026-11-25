"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CardioData } from "@/lib/cardio";
import {
  saveCardioLogAction,
  saveCardioPlanAction,
} from "@/app/actions/cardio";
export function CardioPanel({
  data,
  locale,
}: {
  data: CardioData;
  locale: string;
}) {
  const en = locale === "en-US",
    router = useRouter(),
    todayPlan = data.plans.find((p) => p.weekday === data.weekday),
    todayLog = data.logs.find((l) => l.performed_on === data.today);
  const [activity, setActivity] = useState(
      todayLog?.activity_id ||
        todayPlan?.activity_id ||
        data.activities.find((a) => a.is_active)?.id ||
        "",
    ),
    [minutes, setMinutes] = useState(
      String(todayLog?.duration_min || todayPlan?.target_minutes || 20),
    );
  const [weekday, setWeekday] = useState(data.weekday),
    [planActivity, setPlanActivity] = useState(
      todayPlan?.activity_id ||
        data.activities.find((a) => a.is_active)?.id ||
        "",
    ),
    [target, setTarget] = useState(String(todayPlan?.target_minutes || 20));
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const days = en
    ? [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]
    : ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const name = (id: string | null) => {
    const a = data.activities.find((a) => a.id === id);
    return a
      ? en
        ? a.name_en
        : a.name_pt
      : en
        ? "Archived activity"
        : "Modalidade arquivada";
  };
  async function run(
    task: () => Promise<{ success: boolean; message?: string }>,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await task();
      setMessage(
        result.success
          ? en
            ? "Saved."
            : "Salvo com sucesso."
          : result.message || "Falha ao salvar.",
      );
      if (result.success) router.refresh();
    } catch {
      setMessage(
        en
          ? "Could not save. Try again."
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (data.unavailable)
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">Cardio</h2>
        <p>
          {en
            ? "Cardio is temporarily unavailable."
            : "Cardio temporariamente indisponível."}
        </p>
      </section>
    );
  return (
    <section
      id="cardio"
      className="rounded-2xl border border-border bg-surface p-5 space-y-5"
    >
      <header>
        <h2 className="text-xl font-bold">{en ? "My cardio" : "Meu cardio"}</h2>
        <p className="text-sm text-text-secondary">
          {en
            ? "Plan your week and record today, even without a strength workout."
            : "Planeje sua semana e registre hoje, mesmo sem fazer musculação."}
        </p>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              saveCardioPlanAction({
                weekday,
                activity_id: planActivity,
                target_minutes: Number(target),
              }),
            );
          }}
        >
          <h3 className="font-semibold">
            {en ? "Weekly plan" : "Planejamento semanal"}
          </h3>
          <label className="block text-sm">
            {en ? "Day" : "Dia"}
            <select
              className="w-full rounded-xl bg-surface-secondary p-3"
              value={weekday}
              onChange={(e) => {
                const day = Number(e.target.value),
                  p = data.plans.find((p) => p.weekday === day);
                setWeekday(day);
                setPlanActivity(
                  p?.activity_id ||
                    data.activities.find((a) => a.is_active)?.id ||
                    "",
                );
                setTarget(String(p?.target_minutes || 20));
              }}
            >
              {days.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {en ? "Activity" : "Modalidade"}
            <select
              required
              className="w-full rounded-xl bg-surface-secondary p-3"
              value={planActivity}
              onChange={(e) => setPlanActivity(e.target.value)}
            >
              <option value="">{en ? "Select" : "Selecione"}</option>
              {data.activities
                .filter((a) => a.is_active)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {en ? a.name_en : a.name_pt}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm">
            {en ? "Target (minutes)" : "Meta (minutos)"}
            <Input
              type="number"
              required
              min={1}
              max={1440}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <Button disabled={busy || !data.activities.length}>
            {en ? "Save plan" : "Salvar planejamento"}
          </Button>
          <ul className="space-y-2 text-sm">
            {data.plans.map((p) => (
              <li key={p.weekday} className="flex justify-between gap-3">
                <span>
                  {days[p.weekday - 1]} · {name(p.activity_id)} ·{" "}
                  {p.target_minutes} min
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(() => saveCardioPlanAction({ ...p, remove: true }))
                  }
                >
                  {en ? "Remove" : "Remover"}
                </button>
              </li>
            ))}
          </ul>
        </form>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              saveCardioLogAction({
                status: "done",
                activity_id: activity,
                duration_min: Number(minutes),
              }),
            );
          }}
        >
          <h3 className="font-semibold">
            {en ? "Today’s cardio" : "Cardio de hoje"}
          </h3>
          <p className="text-sm">
            {todayLog
              ? todayLog.status === "done"
                ? `${en ? "Done" : "Feito"}: ${name(todayLog.activity_id)} · ${todayLog.duration_min} min`
                : en
                  ? "Skipped today"
                  : "Pulado hoje"
              : en
                ? "Not recorded"
                : "Ainda não registrado"}
          </p>
          {todayPlan && (
            <p className="text-sm text-text-secondary">
              {en ? "Planned" : "Planejado"}: {name(todayPlan.activity_id)} ·{" "}
              {todayPlan.target_minutes} min
            </p>
          )}
          <label className="block text-sm">
            {en ? "Activity performed" : "Cardio realizado"}
            <select
              required
              className="w-full rounded-xl bg-surface-secondary p-3"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            >
              <option value="">{en ? "Select" : "Selecione"}</option>
              {data.activities
                .filter((a) => a.is_active)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {en ? a.name_en : a.name_pt}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm">
            {en ? "Actual minutes" : "Minutos realizados"}
            <Input
              required
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy || !data.activities.length}>
              {en ? "I did cardio" : "Fiz cardio"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(() => saveCardioLogAction({ status: "skipped" }))
              }
            >
              {en ? "I skipped cardio" : "Pulei o cardio"}
            </Button>
          </div>
        </form>
      </div>
      {message && <p role="status">{message}</p>}
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          {en ? "Recent history" : "Histórico recente"}
        </summary>
        <ul className="mt-3 space-y-2 text-sm">
          {data.logs.map((l) => (
            <li key={l.performed_on}>
              {new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(
                new Date(l.performed_on + "T12:00:00Z"),
              )}{" "}
              ·{" "}
              {l.status === "done"
                ? `${name(l.activity_id)} · ${l.duration_min} min`
                : en
                  ? "Skipped"
                  : "Pulado"}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
