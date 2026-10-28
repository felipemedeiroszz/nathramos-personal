import Link from "next/link";
import { requireRole } from "@/lib/auth/access";
import {
  requireManagedStudent,
  requireOwnedPrescription,
} from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { z } from "zod";
export const dynamic = "force-dynamic";
export default async function HistoryPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: {
    student?: string;
    page?: string;
    kind?: string;
    record?: string;
  };
}) {
  const actor = await requireRole(["admin", "coach"], "/dashboard");
  const student = z.string().uuid().safeParse(searchParams.student);
  const kind = z
    .enum(["diet_kits", "supplement_kits", "workout_kits"])
    .safeParse(searchParams.kind);
  const record = z.string().uuid().safeParse(searchParams.record);
  const specific = kind.success && record.success;
  if (specific) await requireOwnedPrescription(kind.data, record.data);
  if (actor.role === "coach" && !student.success && !specific)
    throw new Error("Selecione um aluno da sua carteira.");
  if (student.success) await requireManagedStudent(student.data);
  const db: any = await createServiceClientSSR();
  let query = db
    .from("prescription_revisions")
    .select("*", { count: "exact" })
    .order("id", { ascending: false });
  if (student.success) query = query.eq("student_id", student.data);
  if (specific)
    query = query.or(
      `record_id.eq.${record.data},before_data->>kit_id.eq.${record.data},after_data->>kit_id.eq.${record.data}`,
    );
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(searchParams.page || "1", 10) || 1),
  );
  const { data, error, count } = await query.range(
    (page - 1) * 20,
    page * 20 - 1,
  );
  if (error) throw new Error("Não foi possível carregar o histórico.");
  const en = locale === "en-US";
  const url = (n: number) =>
    `?page=${n}${student.success ? "&student=" + student.data : ""}${specific ? "&kind=" + kind.data + "&record=" + record.data : ""}`;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">
        {en ? "Prescription history" : "Histórico de prescrições e atribuições"}
      </h1>
      <p className="text-text-secondary">
        {en
          ? "Changes recorded from the installation of this feature."
          : "Alterações registradas a partir da instalação deste recurso."}
      </p>
      {data.map((entry: any) => {
        const before = entry.before_data || {},
          after = entry.after_data || {};
        const keys = Array.from(
          new Set([...Object.keys(before), ...Object.keys(after)]),
        ).filter(
          (key) =>
            !["updated_at", "revision"].includes(key) &&
            JSON.stringify(before[key]) !== JSON.stringify(after[key]),
        );
        return (
          <details
            key={entry.id}
            className="border border-border rounded-xl p-4"
          >
            <summary className="cursor-pointer">
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(entry.created_at))}{" "}
              · {entry.table_name} · {entry.operation}
            </summary>
            <p className="text-xs py-2 break-all">
              ID: {entry.record_id} · {en ? "Actor" : "Autor"}:{" "}
              {entry.actor_id ||
                (en
                  ? "Not recorded for this operation"
                  : "Não registrado nesta operação")}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2">{en ? "Field" : "Campo"}</th>
                    <th>{en ? "Before" : "Antes"}</th>
                    <th>{en ? "After" : "Depois"}</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key} className="border-t border-border">
                      <td className="p-2">{key}</td>
                      <td className="p-2">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(before[key] ?? null, null, 2)}
                        </pre>
                      </td>
                      <td className="p-2">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(after[key] ?? null, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
      {data.length === 0 && (
        <p>{en ? "No recorded changes." : "Nenhuma alteração registrada."}</p>
      )}
      <nav className="flex gap-4" aria-label={en ? "Pagination" : "Paginação"}>
        {page > 1 && (
          <Link href={url(page - 1)}>{en ? "Previous" : "Anterior"}</Link>
        )}
        <span>
          {page} / {Math.max(1, Math.ceil((count || 0) / 20))}
        </span>
        {page * 20 < (count || 0) && (
          <Link href={url(page + 1)}>{en ? "Next" : "Próxima"}</Link>
        )}
      </nav>
    </section>
  );
}
