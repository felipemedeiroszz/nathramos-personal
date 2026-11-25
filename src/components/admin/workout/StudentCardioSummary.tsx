import { CardioService } from "@/services/CardioService";
import { requireManagedStudent } from "@/lib/auth/platform";
export async function StudentCardioSummary({
  studentId,
  locale,
}: {
  studentId: string;
  locale: string;
}) {
  await requireManagedStudent(studentId);
  const data = await CardioService.student(studentId),
    activities = await CardioService.activities(true).catch(() => []),
    en = locale === "en-US";
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
    const a = activities.find((a) => a.id === id);
    return a ? (en ? a.name_en : a.name_pt) : "—";
  };
  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-5 space-y-4">
      <h3 className="font-bold">{en ? "Student cardio" : "Cardio do aluno"}</h3>
      {data.unavailable ? (
        <p>
          {en
            ? "Apply migration 000067 to enable cardio."
            : "Aplique a migração 000067 para habilitar o cardio."}
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <h4 className="font-semibold">
              {en ? "Weekly plan" : "Planejamento semanal"}
            </h4>
            {!data.plans.length && (
              <p className="text-sm text-text-secondary">
                {en ? "No planned cardio." : "Nenhum cardio planejado."}
              </p>
            )}
            <ul className="mt-2 space-y-2 text-sm">
              {data.plans.map((p) => (
                <li key={p.weekday}>
                  {days[p.weekday - 1]} · {name(p.activity_id)} ·{" "}
                  {p.target_minutes} min
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">
              {en ? "Recent records" : "Registros recentes"}
            </h4>
            {!data.logs.length && (
              <p className="text-sm text-text-secondary">
                {en ? "No records yet." : "Ainda sem registros."}
              </p>
            )}
            <ul className="mt-2 space-y-2 text-sm">
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
          </div>
        </div>
      )}
    </section>
  );
}
