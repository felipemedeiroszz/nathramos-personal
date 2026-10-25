import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Dumbbell, MessageCircle } from "lucide-react";
import { requireAuthenticated } from "@/lib/auth/access";
import { WorkoutService } from "@/services/WorkoutService";
import { StudentWorkoutExecutionClient } from "@/components/student/workout/StudentWorkoutExecutionClient";
import type { WorkoutProgramRow, WorkoutDayRow, ExerciseRow, WorkoutExerciseRow } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Treino",
};

export default async function TrainingPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tWorkout = await getTranslations("workout");
  const tCommon = await getTranslations("common");
  const userId = await requireAuthenticated();

  const todaysProgram = await WorkoutService.getTodaysProgram(userId);

  if (!todaysProgram || !todaysProgram.program || !todaysProgram.day) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <PageHeader
          title={tWorkout("title")}
          description={tWorkout("desc")}
          icon={<Dumbbell size={22} />}
        />
        <Card>
          <CardContent>
            <EmptyState
              className="py-16"
              icon={<Dumbbell size={40} className="text-text-secondary" />}
              title={tWorkout("emptyTitle")}
              description={tWorkout("emptyDesc")}
              action={
                <Button variant="secondary" size="md">
                  <MessageCircle size={16} className="mr-2" />
                  {tWorkout("ctaContact")}
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const program = todaysProgram.program;
  const day = todaysProgram.day;

  let session = await WorkoutService.getTodaysSession(userId);

  if (!session) {
    session = await WorkoutService.startSession(userId, day.id, program.id);
  }

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <PageHeader
          title={tWorkout("title")}
          description={tWorkout("desc")}
          icon={<Dumbbell size={22} />}
        />
        <Card>
          <CardContent>
            <EmptyState
              className="py-16"
              icon={<Dumbbell size={40} className="text-text-secondary" />}
              title={tWorkout("sessionError")}
              description={tWorkout("sessionErrorDesc")}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const dayExercises = await WorkoutService.listDayExercises(day.id);
  const dayExercisesWithOverrides = await WorkoutService.applyStudentOverrides(userId, dayExercises);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title={tWorkout("title")}
        description={tWorkout("desc")}
        icon={<Dumbbell size={22} />}
      />

      <StudentWorkoutExecutionClient
        program={program}
        day={day}
        sessionId={session.id}
        exercises={dayExercisesWithOverrides as Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>}
        locale={locale}
      />
    </div>
  );
}
