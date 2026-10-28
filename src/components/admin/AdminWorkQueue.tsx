import Link from "next/link";
import { requirePlatformUser } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
export async function AdminWorkQueue({ locale }: { locale: string }) {
  const actor = await requirePlatformUser();
  const db = await createServiceClientSSR();
  const { data, error } = await (db.rpc as any)("admin_work_queue", {
    p_actor: actor.userId,
  });
  if (error) throw new Error("Não foi possível carregar as pendências.");
  const en = locale === "en-US";
  const labels: Record<string, string> = en
    ? {
        exam: "Exams awaiting review",
        chat: "Unanswered conversations",
        workout: "Students without workouts",
        diet: "Students without diets",
        meeting: "Meetings in the next 7 days",
      }
    : {
        exam: "Exames aguardando parecer",
        chat: "Conversas sem resposta",
        workout: "Alunos sem treino",
        diet: "Alunos sem dieta",
        meeting: "Reuniões nos próximos 7 dias",
      };
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">
        {en ? "Work queue" : "Fila de trabalho"}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(labels).map(([key, label]) => (
          <Link
            key={key}
            href={`/${locale}/admin/${key === "exam" ? "exames" : key === "chat" ? "mentoria" : key === "meeting" ? "reunioes" : "alunos"}`}
            className="rounded-xl border border-border p-4 hover:border-primary"
          >
            <p className="text-sm text-text-secondary">{label}</p>
            <strong className="text-2xl">{data.counts[key] || 0}</strong>
          </Link>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {data.items.map((item: any) => (
          <li key={item.kind + item.id} className="py-3">
            <Link
              className="hover:underline"
              href={`/${locale}/admin/${item.kind === "chat" ? "mentoria" : item.kind === "meeting" ? "reunioes" : item.kind === "exam" ? "exames" : `alunos/${item.student_id}`}`}
            >
              {labels[item.kind]} · {item.student}
              {item.label && ` · ${item.label}`}
            </Link>
          </li>
        ))}
      </ul>
      {data.items.length === 0 && (
        <p>{en ? "No pending tasks." : "Nenhuma pendência."}</p>
      )}
      <p className="text-xs text-text-secondary">
        {en
          ? "Showing up to 30 oldest tasks. Counts include all matching records."
          : "Até 30 pendências mais antigas. Os contadores incluem todos os registros correspondentes."}
      </p>
    </section>
  );
}
