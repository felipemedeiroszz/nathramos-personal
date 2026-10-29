import { DatabaseOperationError } from "@/lib/supabase/errors";
import Link from "next/link";
import { requirePlatformUser } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
export async function AdminWorkQueue({ locale }: { locale: string }) {
  const actor = await requirePlatformUser();
  const db = await createServiceClientSSR();
  const { data, error } = await (db.rpc as any)("admin_work_queue", {
    p_actor: actor.userId,
  });
  if (error) throw new DatabaseOperationError("admin.work_queue", error);
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
      <h2 className="text-sm font-semibold">
        {en ? "Work queue" : "Fila de trabalho"}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
        {Object.entries(labels).map(([key, label]) => (
          <Link
            key={key}
            href={`/${locale}/admin/${key === "exam" ? "exames" : key === "chat" ? "mentoria" : key === "meeting" ? "reunioes" : "alunos"}`}
            className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition hover:border-primary/40 hover:bg-primary/5"
          >
            <p className="text-[11px] leading-relaxed text-zinc-400">{label}</p>
            <strong className="mt-2 block text-2xl font-semibold">
              {data.counts[key] || 0}
            </strong>
          </Link>
        ))}
      </div>
      <ul className="max-h-80 overflow-y-auto divide-y divide-white/[0.06]">
        {data.items.map((item: any) => (
          <li
            key={item.kind + item.id}
            className="py-3 text-xs leading-relaxed text-zinc-400"
          >
            <Link
              className="block rounded-sm hover:text-primary focus-visible:outline-primary"
              href={`/${locale}/admin/${item.kind === "chat" ? "mentoria" : item.kind === "meeting" ? "reunioes" : item.kind === "exam" ? "exames" : `alunos/${item.student_id}`}`}
            >
              {labels[item.kind]} · {item.student}
              {item.label && ` · ${item.label}`}
            </Link>
          </li>
        ))}
      </ul>
      {data.items.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-500">
          {en
            ? "No pending tasks. Everything is up to date."
            : "Nenhuma pendência. Tudo em dia por aqui."}
        </p>
      )}
      <p className="text-[10px] leading-relaxed text-zinc-500">
        {en
          ? "Showing up to 30 oldest tasks. Counts include all matching records."
          : "Até 30 pendências mais antigas. Os contadores incluem todos os registros correspondentes."}
      </p>
    </section>
  );
}
