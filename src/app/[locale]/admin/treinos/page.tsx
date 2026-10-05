import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { WorkoutService } from "@/services/WorkoutService";
import type {
  WorkoutProgramRow,
  WorkoutCategoryRow,
  WorkoutDayRow,
  WorkoutExerciseRow,
  ExerciseRow,
} from "@/types";
import { AdminTreinosClient } from "./AdminTreinosClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Programas de Treino",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

interface DayWithExercises extends WorkoutDayRow {
  exercises: Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>;
}

interface ProgramWithDays extends WorkoutProgramRow {
  category_name_pt?: string;
  category_name_en?: string;
  days: DayWithExercises[];
}

export default async function AdminTreinosPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const tDiff = await getTranslations("difficultyLevels");
  const tCommon = await getTranslations("common");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdminNav, "workouts", "Programas de Treino");
  const subtitle = await safe(
    tAdmin,
    "workouts.subtitle",
    "Monte programas com dias, ordem, series e repeticoes."
  );

  const categories: WorkoutCategoryRow[] = await WorkoutService.listCategories(true);
  const programs: WorkoutProgramRow[] = await WorkoutService.listPrograms({
    is_template: false,
    limit: 100,
  });

  const categoryMap: Record<string, WorkoutCategoryRow> = {};
  for (const c of categories) categoryMap[c.id] = c;

  const programsWithMeta: ProgramWithDays[] = [];
  for (const p of programs) {
    const cat = p.category_id ? categoryMap[p.category_id] : undefined;
    programsWithMeta.push({
      ...p,
      category_name_pt: cat?.name_pt,
      category_name_en: cat?.name_en,
      days: [],
    });
  }

  if (programsWithMeta.length > 0) {
    const first = programsWithMeta[0];
    const days: WorkoutDayRow[] = await WorkoutService.listProgramDays(first.id);
    const daysWithEx: DayWithExercises[] = [];
    for (const d of days) {
      const exercises = await WorkoutService.listDayExercises(d.id);
      daysWithEx.push({ ...d, exercises });
    }
    programsWithMeta[0] = { ...first, days: daysWithEx };
  }

  function translateDifficulty(key: string): string {
    try {
      return tDiff(key as any);
    } catch {
      return key;
    }
  }

  const categoryOptions = categories.map((c) => ({ id: c.id, name_pt: c.name_pt, name_en: c.name_en }));

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminTreinosClient
        locale={locale}
        userId={userId}
        title={title}
        subtitle={subtitle}
        programs={programsWithMeta}
        categoryOptions={categoryOptions}
        translateDifficulty={translateDifficulty}
      />
    </div>
  );
}
