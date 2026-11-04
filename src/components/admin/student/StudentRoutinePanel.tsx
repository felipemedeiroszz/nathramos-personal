import { DailyPlanningService } from "@/services/DailyPlanningService";
import { DailyPlanningClient } from "./DailyPlanningClient";
import { requireManagedStudent } from "@/lib/auth/platform";
import { HydrationClient } from "@/components/student/RoutineClients";
export async function StudentRoutinePanel({
  studentId,
}: {
  studentId: string;
}) {
  await requireManagedStudent(studentId);
  const planning = await DailyPlanningService.get(studentId);
  return (
    <div className="space-y-6">
      <DailyPlanningClient studentId={studentId} initial={planning} />
      <HydrationClient data={planning.data} targetId={studentId} />
    </div>
  );
}
