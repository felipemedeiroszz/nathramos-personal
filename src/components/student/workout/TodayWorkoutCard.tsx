"use client";

import Link from "next/link";
import { Dumbbell, Clock, CheckCircle, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import type { WorkoutProgramRow, WorkoutDayRow } from "@/types";

interface TodayWorkoutCardProps {
  locale: string;
  userId: string;
}

interface TodayWorkoutData {
  program: WorkoutProgramRow | null;
  day: WorkoutDayRow | null;
  exerciseCount: number;
  estimatedMinutes: number;
  available: boolean;
  reason?: string;
  completedToday?: boolean;
}

export function TodayWorkoutCard({ locale, userId }: TodayWorkoutCardProps) {
  const t = useTranslations("dashboard");
  const tWorkout = useTranslations("workout");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TodayWorkoutData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchTodayWorkout() {
      try {
        const response = await fetch(`/${locale}/api/workout/today`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch today's workout:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchTodayWorkout();
  }, [locale, userId]);

  if (loading) {
    return (
      <Card className="md:col-span-2 xl:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("todayTraining")}</CardTitle>
              <CardDescription>{tWorkout("today")}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Dumbbell size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="md:col-span-2 xl:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("todayTraining")}</CardTitle>
              <CardDescription>{tWorkout("today")}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Dumbbell size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Dumbbell size={32} className="text-text-secondary mb-3" />
            <p className="text-text-secondary text-sm">{t("todayTrainingError")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.available || !data.program || !data.day) {
    return (
      <Card className="md:col-span-2 xl:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("todayTraining")}</CardTitle>
              <CardDescription>{tWorkout("today")}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Dumbbell size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {data.completedToday ? (
              <>
                <CheckCircle size={32} className="text-primary mb-3" />
                <p className="text-text font-semibold mb-1">{tWorkout("completed")}</p>
                <p className="text-text-secondary text-sm">
                  {t("restDay")}
                </p>
              </>
            ) : (
              <>
                <CheckCircle size={32} className="text-primary mb-3" />
                <p className="text-text font-semibold mb-1">{t("noWorkoutToday")}</p>
                <p className="text-text-secondary text-sm">
                  {data.reason || t("restDay")}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const programName = locale === "pt-BR" ? data.program.title_pt : data.program.title_en;
  const dayName = locale === "pt-BR" ? data.day.name_pt : data.day.name_en;
  const focus = locale === "pt-BR" ? data.day.focus_pt : data.day.focus_en;

  if (data.completedToday) {
    return (
      <Card className="md:col-span-2 xl:col-span-2 border-primary/30 bg-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("todayTraining")}</CardTitle>
              <CardDescription>{tWorkout("today")}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CheckCircle size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text">{programName}</h3>
              <Badge variant="success">
                {tWorkout("completed")}
              </Badge>
            </div>
            <p className="text-text-secondary text-sm">{dayName}</p>
            {focus && (
              <p className="text-text-secondary text-sm">
                {tWorkout("focus")}: {focus}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-surface/70 p-3">
              <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
                <Dumbbell size={14} />
                {tWorkout("exercises")}
              </div>
              <div className="text-lg font-bold text-text">{data.exerciseCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface/70 p-3">
              <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
                <Clock size={14} />
                {tWorkout("duration")}
              </div>
              <div className="text-lg font-bold text-text">{data.estimatedMinutes} min</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface/70 p-4 text-center">
            <p className="text-text-secondary text-sm">
              {t("restDay")} - {t("viewAll")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="md:col-span-2 xl:col-span-2 border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("todayTraining")}</CardTitle>
            <CardDescription>{tWorkout("today")}</CardDescription>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Dumbbell size={22} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text">{programName}</h3>
            <Badge variant="outline">
              <Clock size={12} className="mr-1" />
              {data.estimatedMinutes} min
            </Badge>
          </div>
          <p className="text-text-secondary text-sm">{dayName}</p>
          {focus && (
            <p className="text-text-secondary text-sm">
              {tWorkout("focus")}: {focus}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-surface/70 p-3">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Dumbbell size={14} />
              {tWorkout("exercises")}
            </div>
            <div className="text-lg font-bold text-text">{data.exerciseCount}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface/70 p-3">
            <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
              <Clock size={14} />
              {tWorkout("duration")}
            </div>
            <div className="text-lg font-bold text-text">{data.estimatedMinutes} min</div>
          </div>
        </div>

        <Link href={`/${locale}/treino`} className="block">
          <Button variant="primary" size="md" className="w-full">
            {tWorkout("startWorkout")}
            <ChevronRight size={18} className="ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
