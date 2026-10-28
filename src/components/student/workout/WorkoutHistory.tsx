"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Calendar, Clock, Dumbbell, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { WorkoutSessionRow } from "@/types";

interface WorkoutHistoryProps {
  locale: string;
  userId: string;
}

export function WorkoutHistory({ locale, userId }: WorkoutHistoryProps) {
  const t = useTranslations("workout");
  const tCommon = useTranslations("common");
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<WorkoutSessionRow[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/workout/history?userId=${userId}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error("Failed to fetch workout history:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [locale, userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("workoutHistory")}</CardTitle>
          <CardDescription>{tCommon("last30Days")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("workoutHistory")}</CardTitle>
          <CardDescription>{tCommon("last30Days")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Calendar size={32} className="text-text-secondary" />}
            title={tCommon("error")}
            description={tCommon("tryAgain")}
          />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("workoutHistory")}</CardTitle>
          <CardDescription>{tCommon("last30Days")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Dumbbell size={32} className="text-text-secondary" />}
            title={t("noWorkoutToday")}
            description={t("emptyDesc")}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workoutHistory")}</CardTitle>
        <CardDescription>{tCommon("last30Days")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((session) => {
          const date = new Date(session.scheduled_date);
          const formattedDate = date.toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          
          const duration = session.duration_min
            ? `${session.duration_min} min`
            : session.completed_at && session.started_at
            ? `${Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min`
            : "-";

          return (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="font-semibold text-text">{formattedDate}</div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Clock size={14} />
                    {duration}
                  </div>
                </div>
              </div>
              <Badge variant={session.completed_at ? "success" : "default"}>
                {session.completed_at ? t("completed") : t("inProgress")}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
