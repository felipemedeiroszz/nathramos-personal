import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Dumbbell } from "lucide-react";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { requireStudentPage } from "@/lib/auth/platform";
import { WorkoutService } from "@/services/WorkoutService";
import { StudentWorkoutExecutionClient } from "@/components/student/workout/StudentWorkoutExecutionClient";
import { StartWorkoutButton } from "@/components/student/workout/StartWorkoutButton";
export const dynamic = "force-dynamic";
export const metadata = { title: "Treino" };
export default async function Page(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const userId = await requireStudentPage();
  const schedule = await WorkoutService.getDaySchedule(userId);
  const plans = schedule.plans;
  const views = await Promise.all(
    plans.map(async (plan) => {
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
          <StudentWorkoutExecutionClient
            key={session.id}
            program={plan.program}
            day={plan.day}
            sessionId={session.id}
            exercises={exercises}
            initialLogs={logs}
            guidance={plan.assignment.notes}
            locale={locale}
          />
        );
      }
      return (
        <Card key={plan.day.id}>
          <CardHeader>
            <CardTitle>
              {locale === "en-US"
                ? plan.program.title_en
                : plan.program.title_pt}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.assignment.workout_time && <p className="text-sm text-text-secondary">{locale === "en-US" ? "Scheduled time" : "Horário programado"}: {plan.assignment.workout_time}</p>}
            {plan.assignment.notes && <p className="whitespace-pre-wrap text-sm text-text-secondary">{plan.assignment.notes}</p>}
            <p>
              {locale === "en-US" ? plan.day.name_en : plan.day.name_pt} ·{" "}
              {exercises.length} exercícios
            </p>
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
      {views}
      {!plans.length && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p>{schedule.state === "rest" ? (locale === "en-US" ? "Rest scheduled by your coach." : "Descanso programado pelo personal.") : (locale === "en-US" ? "No workout scheduled for today." : "Nenhum treino programado para hoje.")}</p>
            {schedule.notes && <p className="whitespace-pre-wrap text-sm">{schedule.notes}</p>}
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
