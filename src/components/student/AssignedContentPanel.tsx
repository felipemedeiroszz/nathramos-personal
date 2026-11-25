import { Lock, CalendarDays, Check, ArrowUpRight } from "lucide-react";
import type {
  AssignedContent,
  AssignedKind,
} from "@/lib/student/assigned-content";
const weekdayNames = {
  "pt-BR": [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
    "Domingo",
  ],
  "en-US": [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ],
};
export function AssignedContentLinks({
  counts,
  locale,
}: {
  counts: Record<AssignedKind, number>;
  locale: string;
}) {
  if (!Object.values(counts).some(Boolean)) return null;
  const en = locale === "en-US";
  return (
    <section
      className="student-plan-links space-y-3"
      aria-label={en ? "My assigned plans" : "Minha programação vinculada"}
    >
      <h2 className="text-lg font-semibold">
        {en ? "My assigned plans" : "Minha programação vinculada"}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["workout", "diet", "supplement"] as const).map((kind) => (
          <a
            key={kind}
            className="student-plan-link rounded-2xl border border-border bg-surface p-4 text-sm"
            href={`/${locale}/${{ workout: "treino", diet: "dieta", supplement: "suplementos" }[kind]}`}
          >
            <span className="block font-semibold">
              {
                {
                  workout: en ? "Workouts" : "Treinos",
                  diet: en ? "Nutrition" : "Dietas",
                  supplement: en ? "Supplements" : "Suplementos",
                }[kind]
              }
            </span>
            <strong className="student-plan-count">{counts[kind]}</strong>
            <span className="mt-1 block text-text-secondary">
              {en ? "Assigned kits" : "Kits vinculados"}
              <ArrowUpRight size={13} aria-hidden="true" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
export function AssignedContentPanel({
  items,
  locale,
  kind,
}: {
  items: AssignedContent[];
  locale: string;
  kind: AssignedKind;
}) {
  if (!items.length) return null;
  const en = locale === "en-US";
  const names = weekdayNames[en ? "en-US" : "pt-BR"];
  const labels = en
    ? {
        available: "Available today",
        scheduled: "Upcoming",
        ended: "Period ended",
        inactive: "Inactive",
        unavailable: "Unavailable",
        not_today: "Not scheduled for today",
      }
    : {
        available: "Disponível hoje",
        scheduled: "Agendado",
        ended: "Período encerrado",
        inactive: "Inativo",
        unavailable: "Indisponível",
        not_today: "Não programado para hoje",
      };
  const format = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
  return (
    <section
      aria-label={en ? "All assigned kits" : "Todos os kits vinculados"}
      className="student-assigned-section space-y-3"
    >
      <div>
        <h2 className="text-lg font-semibold">
          {en ? "All assigned kits" : "Todos os kits vinculados"}{" "}
          <span className="text-sm text-text-secondary">({items.length})</span>
        </h2>
        <p className="text-sm text-text-secondary">
          {en
            ? kind === "workout"
              ? "Choose any workout in your current cycle. Today’s workout comes first."
              : "Your full schedule. Only content scheduled for today can be opened."
            : kind === "workout"
              ? "Escolha qualquer treino do ciclo atual. O de hoje aparece primeiro; os dias são uma orientação."
              : "Sua programação completa. Apenas o conteúdo liberado para hoje pode ser aberto."}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="student-assigned-card rounded-2xl border border-border bg-surface p-4 space-y-3"
            data-availability={item.availability}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{item.name}</h3>
              <span
                className={`student-assigned-status inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs ${item.availability === "available" ? "bg-primary/15 text-primary" : "bg-surface-secondary text-text-secondary"}`}
              >
                {item.availability === "available" ? (
                  <Check size={13} />
                ) : (
                  <Lock size={13} />
                )}{" "}
                {labels[item.availability]}
              </span>
            </div>
            <p className="flex items-center gap-2 text-xs text-text-secondary">
              <CalendarDays size={14} />
              {format(item.startDate)} ·{" "}
              {item.endDate
                ? format(item.endDate)
                : en
                  ? "No end date"
                  : "Sem data final"}
            </p>
            {item.days?.length ? (
              <ul className="student-assigned-days space-y-2">
                {item.days.map((day) => (
                  <li key={day.id}>
                    {day.available ? (
                      <a
                        className="block rounded-xl border border-primary/40 p-3 text-sm text-primary"
                        href={`?day=${day.id}#treino-dia-${day.id}`}
                      >
                        {day.name} · {names[day.weekday - 1]} ·{" "}
                        {en ? "Week" : "Semana"} {day.week} —{" "}
                        {en ? "Open" : "Abrir"}
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex w-full cursor-not-allowed items-center justify-between gap-2 rounded-xl border border-border p-3 text-left text-sm text-text-secondary opacity-70"
                      >
                        <span>
                          {day.name} · {names[day.weekday - 1]} ·{" "}
                          {en ? "Week" : "Semana"} {day.week}
                        </span>
                        <Lock
                          size={14}
                          aria-label={en ? "Unavailable" : "Indisponível"}
                        />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : item.availability === "available" ? (
              <a
                className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-black"
                href="#conteudo-hoje"
              >
                {kind === "workout"
                  ? en
                    ? "View today's workout"
                    : "Ver treino de hoje"
                  : kind === "diet"
                    ? en
                      ? "View today's diet"
                      : "Ver dieta de hoje"
                    : en
                      ? "View today's supplements"
                      : "Ver suplementos de hoje"}
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl border border-border px-4 py-2 text-sm text-text-secondary"
              >
                {labels[item.availability]}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
