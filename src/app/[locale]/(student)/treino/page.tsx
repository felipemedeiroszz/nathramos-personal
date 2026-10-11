import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
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
      <div className="w-full px-4 sm:px-6 py-8 pb-safe">
        <div className="space-y-6 max-w-4xl mx-auto">
          <header className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-text">{tWorkout("title")}</h1>
            <p className="text-sm md:text-base text-text-secondary">{tWorkout("desc")}</p>
          </header>
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
      <div className="w-full px-4 sm:px-6 py-8 pb-safe">
        <div className="space-y-6 max-w-4xl mx-auto">
          <header className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-text">{tWorkout("title")}</h1>
            <p className="text-sm md:text-base text-text-secondary">{tWorkout("desc")}</p>
          </header>
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
      </div>
    );
  }

  const dayExercises = await WorkoutService.listDayExercises(day.id);
  const dayExercisesWithOverrides = await WorkoutService.applyStudentOverrides(userId, dayExercises);

  return (
    <div className="w-full px-4 sm:px-6 py-8 pb-safe space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-text">{tWorkout("title")}</h1>
          <p className="text-sm md:text-base text-text-secondary">{tWorkout("desc")}</p>
        </header>

        <StudentWorkoutExecutionClient
          program={program}
          day={day}
          sessionId={session.id}
          exercises={dayExercisesWithOverrides as Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>}
          locale={locale}
        />
      </div>
    </div>
  );
}
