import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dumbbell, RefreshCw, Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/auth/access";
import { ExerciseDBService } from "@/services/ExerciseDBService";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, DIFFICULTY_LEVELS, EXERCISE_SOURCES } from "@/types";
import type { ExerciseRow, ExerciseSource, MuscleGroup, Equipment, Difficulty } from "@/types";
import { AdminExerciciosClient } from "./AdminExerciciosClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Exercicios",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

export default async function AdminExerciciosPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams?: {
    q?: string;
    source?: string;
    muscle?: string;
    equipment?: string;
    difficulty?: string;
    published?: string;
  };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tExercise = await getTranslations("exercise");
  const tMuscle = await getTranslations("muscleGroups");
  const tEquip = await getTranslations("equipments");
  const tDiff = await getTranslations("difficultyLevels");
  const tCommon = await getTranslations("common");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdmin, "exercicios.title", "Exercicios");
  const subtitle = await safe(
    tAdmin,
    "exercicios.subtitle",
    "Sincronize com ExerciseDB ou crie exercicios personalizados bilingues."
  );

  const q = searchParams?.q ?? "";
  const sourceParam = searchParams?.source as ExerciseSource | undefined;
  const muscleParam = searchParams?.muscle as MuscleGroup | undefined;
  const equipmentParam = searchParams?.equipment as Equipment | undefined;
  const difficultyParam = searchParams?.difficulty as Difficulty | undefined;
  const publishedParam = searchParams?.published;

  const filters: {
    source?: ExerciseSource;
    primary_muscle?: MuscleGroup;
    equipment?: Equipment;
    difficulty?: Difficulty;
    is_published?: boolean;
    search?: string;
    limit?: number;
  } = { limit: 50 };

  if (sourceParam && EXERCISE_SOURCES.includes(sourceParam as any)) filters.source = sourceParam;
  if (muscleParam && MUSCLE_GROUPS.includes(muscleParam as any)) filters.primary_muscle = muscleParam;
  if (equipmentParam && EQUIPMENT_TYPES.includes(equipmentParam as any)) filters.equipment = equipmentParam;
  if (difficultyParam && DIFFICULTY_LEVELS.includes(difficultyParam as any)) filters.difficulty = difficultyParam;
  if (publishedParam === "1") filters.is_published = true;
  if (publishedParam === "0") filters.is_published = false;
  if (q && q.trim().length > 0) filters.search = q.trim();

  const exercises: ExerciseRow[] = await ExerciseDBService.listExercises(filters);

  function translateMuscle(key: string): string {
    try {
      return tMuscle(key as any);
    } catch {
      return key;
    }
  }

  function translateEquipment(key: string): string {
    try {
      return tEquip(key as any);
    } catch {
      return key;
    }
  }

  function translateDifficulty(key: string): string {
    try {
      return tDiff(key as any);
    } catch {
      return key;
    }
  }

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminExerciciosClient
        locale={locale}
        userId={userId}
        title={title}
        exercises={exercises}
        translateMuscle={translateMuscle}
        translateEquipment={translateEquipment}
        translateDifficulty={translateDifficulty}
        searchValue={q}
        sourceValue={sourceParam ?? ""}
        muscleValue={muscleParam ?? ""}
        equipmentValue={equipmentParam ?? ""}
        difficultyValue={difficultyParam ?? ""}
        publishedValue={publishedParam ?? ""}
        muscleGroups={MUSCLE_GROUPS}
        equipmentTypes={EQUIPMENT_TYPES}
        difficultyLevels={DIFFICULTY_LEVELS}
        exerciseSources={EXERCISE_SOURCES}
      />
    </div>
  );
}
