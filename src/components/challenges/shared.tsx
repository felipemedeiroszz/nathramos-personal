"use client";
import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
} from "react";
import { getZonedParts, zonedTimeToUtc } from "@/lib/notifications/time";
import type { Challenge, ChallengeGoal } from "@/lib/challenges";

export const challengeAssetUrl = (path: string) =>
  "/api/challenges/asset?path=" + encodeURIComponent(path);
export async function challengeRequest(query: string, options?: RequestInit) {
  const response = await fetch("/api/challenges" + query, {
    ...options,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Falha ao carregar o desafio.");
  return data;
}
export const challengeSend = (input: Record<string, unknown>) =>
  challengeRequest("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
export function dateInput(iso: string) {
  const d = getZonedParts(new Date(iso), "America/Sao_Paulo");
  return `${d.dateKey}T${String(d.hour).padStart(2, "0")}:${String(d.minute).padStart(2, "0")}`;
}
export function dateISO(value: string) {
  const [date, time] = value.split("T");
  return zonedTimeToUtc(date, time, "America/Sao_Paulo").toISOString();
}
export const challengeDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
export const categoryNames: Record<string, [string, string]> = {
  weight_loss: ["Emagrecimento", "Weight loss"],
  muscle_gain: ["Ganho de massa", "Muscle gain"],
  hypertrophy: ["Hipertrofia", "Hypertrophy"],
  endurance: ["Resistência física", "Endurance"],
  attendance: ["Frequência na academia", "Gym attendance"],
  nutrition: ["Alimentação saudável", "Healthy eating"],
  hydration: ["Hidratação", "Hydration"],
  cardio: ["Cardio", "Cardio"],
  transformation: ["Transformação corporal", "Body transformation"],
  custom: ["Personalizado", "Custom"],
};
export const goalNames: Record<string, [string, string]> = {
  workout: ["Treino", "Workout"],
  cardio: ["Cardio", "Cardio"],
  water: ["Hidratação", "Hydration"],
  nutrition: ["Alimentação", "Nutrition"],
  steps: ["Passos", "Steps"],
  measurements: ["Medidas corporais", "Measurements"],
  progress: ["Evolução", "Progress"],
  custom: ["Personalizada", "Custom"],
};
export function statusName(
  c: Pick<Challenge, "status" | "start_date" | "end_date">,
  en: boolean,
) {
  if (c.status === "published") {
    if (Date.now() < Date.parse(c.start_date))
      return en ? "Upcoming" : "Em breve";
    if (Date.now() >= Date.parse(c.end_date))
      return en ? "Awaiting results" : "Aguardando apuração";
    return en ? "In progress" : "Em andamento";
  }
  return ({
    draft: ["Rascunho", "Draft"],
    paused: ["Pausado", "Paused"],
    cancelled: ["Cancelado", "Cancelled"],
    review: ["Em apuração", "Under review"],
    completed: ["Concluído", "Completed"],
  }[c.status] || [c.status, c.status])[en ? 1 : 0];
}
export const defaultGoal = (): Omit<ChallengeGoal, "id"> => ({
  title: "",
  description: "",
  goal_type: "workout",
  target_value: 1,
  unit: "treinos",
  frequency: "total",
  points: 10,
  max_points: 100,
  proof_type: "none",
  requires_approval: true,
  is_primary: false,
});
export function Field({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <label className="challenge-field">
      <span>{title}</span>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ "aria-label"?: string }>, {
            "aria-label": title,
          })
        : children}
    </label>
  );
}
export function ChallengeUpload({
  challengeId,
  kind,
  value,
  onChange,
  en,
  pdf = false,
  onBusy,
  disabled = false,
}: {
  challengeId: string;
  kind: "cover" | "prize" | "proof";
  value: string | null;
  onChange: (path: string | null) => void;
  en: boolean;
  pdf?: boolean;
  onBusy?: (active: boolean) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      const form = new FormData();
      form.set("challenge_id", challengeId);
      form.set("kind", kind);
      form.set("file", file);
      const data = await challengeRequest("", { method: "POST", body: form });
      onChange(data.path);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <div className="challenge-upload">
      {value &&
        (value.endsWith(".pdf") ? (
          <a href={challengeAssetUrl(value)} target="_blank" rel="noreferrer">
            {en ? "Open proof" : "Abrir comprovante"}
          </a>
        ) : (
          <img
            src={challengeAssetUrl(value)}
            alt={en ? "Image preview" : "Prévia da imagem"}
            width={1600}
            height={1000}
            loading="eager"
          />
        ))}
      <input
        type="file"
        aria-label={en ? "Choose file" : "Escolher arquivo"}
        accept={
          "image/jpeg,image/png,image/webp" + (pdf ? ",application/pdf" : "")
        }
        disabled={busy || disabled}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <small>
        {busy
          ? en
            ? "Uploading…"
            : "Enviando…"
          : en
            ? "JPG, PNG, WebP" + (pdf ? " or PDF" : "") + " · up to 4 MB"
            : "JPG, PNG, WebP" + (pdf ? " ou PDF" : "") + " · até 4 MB"}
      </small>
      {value && (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => onChange(null)}
        >
          {en ? "Remove file" : "Remover arquivo"}
        </button>
      )}
      {error && (
        <p role="alert" className="challenge-error">
          {error}
        </p>
      )}
    </div>
  );
}
