import { StudentRoutineService } from "@/services/StudentRoutineService";
import { RoutineSummary } from "@/components/student/RoutineSummary";
import {
  HydrationClient,
  DailyItemsClient,
} from "@/components/student/RoutineClients";
import { requireRole } from "@/lib/auth/access";
export async function StudentRoutinePanel({
  studentId,
}: {
  studentId: string;
}) {
  await requireRole(["admin", "coach"]);
  try {
    const data = await StudentRoutineService.get(studentId);
    return (
      <section className="space-y-5">
        <h2 className="text-xl font-bold">Rotina e saúde do aluno</h2>
        <RoutineSummary data={data} />
        <DailyItemsClient
          items={data.diet}
          kind="diet"
          consumed={data.consumedNutrition}
          planned={data.plannedNutrition}
          readOnly
        />
        <DailyItemsClient items={data.supplements} kind="supplement" readOnly />
        <HydrationClient data={data} targetId={studentId} />
      </section>
    );
  } catch {
    return (
      <section className="rounded-xl border border-border p-5" role="alert">
        <h2 className="font-semibold">Acompanhamento indisponível</h2>
        <p>
          Não foi possível carregar os registros de rotina. Tente novamente.
        </p>
      </section>
    );
  }
}
