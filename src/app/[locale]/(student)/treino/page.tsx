import { CardioPanel } from "@/components/student/workout/CardioPanel";
import { CardioService } from "@/services/CardioService";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Dumbbell } from "lucide-react";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { requireStudentPage } from "@/lib/auth/platform";
import { WorkoutService } from "@/services/WorkoutService";
import { StudentWorkoutExecutionClient } from "@/components/student/workout/StudentWorkoutExecutionClient";
import { StartWorkoutButton } from "@/components/student/workout/StartWorkoutButton";
import { AssignedContentPanel } from "@/components/student/AssignedContentPanel";
import { StudentAssignedContentService } from "@/services/StudentAssignedContentService";
export const dynamic = "force-dynamic";
export const metadata = { title: "Treino" };
export default async function Page(props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ day?: string }>;
}) {
  const params = await props.params;

  const { locale } = params;

  setRequestLocale(locale);
  const userId = await requireStudentPage();
  const cardio = await CardioService.student(userId);
  const date = await StudentAssignedContentService.today(userId);
  const schedule = await WorkoutService.getDaySchedule(userId, date);
  const plans = await WorkoutService.getAvailablePlans(userId, date);
  const selectedDay = (await props.searchParams)?.day;
  const selectedPlan =
    plans.find((plan) => plan.day.id === selectedDay) || plans[0];
  const assigned = await StudentAssignedContentService.list(userId, "workout", {
    date,
    locale,
    availableAssignmentIds: [
      ...new Set(plans.map((plan) => plan.assignment.id)),
    ],
    availableDays: plans.map((plan) => ({
      assignmentId: plan.assignment.id,
      dayId: plan.day.id,
    })),
  });
  const views = await Promise.all(
    (selectedPlan ? [selectedPlan] : []).map(async (plan) => {
      const exercises = await WorkoutService.applyStudentOverrides(
        userId,
        await WorkoutService.listDayExercises(plan.day.id),
      );
      const session = await WorkoutService.getTodaysSession(
        userId,
        plan.day.id,
      );
      if (session && !session.completed_at) {
        const logs = await WorkoutService.sessionLogs(userId, session.id);
        return (
          <section key={session.id} id={`treino-dia-${plan.day.id}`}>
            <StudentWorkoutExecutionClient
              cardio={cardio}
              program={plan.program}
              day={plan.day}
              sessionId={session.id}
              exercises={exercises}
              initialLogs={logs}
              guidance={plan.assignment.notes}
              locale={locale}
            />
          </section>
        );
      }
      return (
        <Card key={plan.day.id} id={`treino-dia-${plan.day.id}`}>
          <CardHeader>
            <CardTitle>
              {locale === "en-US"
                ? plan.program.title_en
                : plan.program.title_pt}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.assignment.workout_time && (
              <p className="text-sm text-text-secondary">
                {locale === "en-US" ? "Scheduled time" : "Horário programado"}:{" "}
                {plan.assignment.workout_time}
              </p>
            )}
            {plan.assignment.notes && (
              <p className="whitespace-pre-wrap text-sm text-text-secondary">
                {plan.assignment.notes}
              </p>
            )}
            <p>
              {locale === "en-US" ? plan.day.name_en : plan.day.name_pt} ·{" "}
              {exercises.length} exercícios
            </p>
            <details className="rounded-xl border border-border p-4">
              <summary className="cursor-pointer font-semibold">
                {locale === "en-US"
                  ? "View exercises"
                  : "Visualizar exercícios"}
              </summary>
              <ul className="mt-3 space-y-3">
                {exercises.map((item) => (
                  <li key={item.id}>
                    {locale === "en-US"
                      ? item.exercise?.name_en
                      : item.exercise?.name_pt}{" "}
                    · {item.sets} × {item.reps || "—"}
                  </li>
                ))}
              </ul>
            </details>
            {session?.completed_at ? (
              <p className="text-primary font-semibold">
                Treino concluído hoje.
              </p>
            ) : exercises.length ? (
              <StartWorkoutButton
                dayId={plan.day.id}
                programId={plan.program.id}
              />
            ) : (
              <p>Nenhum exercício cadastrado neste treino.</p>
            )}
          </CardContent>
        </Card>
      );
    }),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        title={locale === "en-US" ? "My workouts" : "Treino"}
        description={
          locale === "en-US"
            ? "Your program, your sets and your next step."
            : "Seu programa, suas séries e seu próximo passo."
        }
        icon={<Dumbbell size={22} />}
      />
      <AssignedContentPanel items={assigned} locale={locale} kind="workout" />
      <section id="conteudo-hoje" className="space-y-6">
        {views}
      </section>
      <CardioPanel data={cardio} locale={locale} />
      {!plans.length && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p>
              {schedule.state === "rest"
                ? locale === "en-US"
                  ? "Rest scheduled by your coach."
                  : "Descanso programado pelo personal."
                : locale === "en-US"
                  ? "No workout scheduled for today."
                  : "Nenhum treino programado para hoje."}
            </p>
            {schedule.notes && (
              <p className="whitespace-pre-wrap text-sm">{schedule.notes}</p>
            )}
            <Link
              className="text-primary underline"
              href={`/${locale}/conversas`}
            >
              Falar com minha treinadora
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
