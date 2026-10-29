import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { staffStudentIds } from "@/lib/auth/platform";
import { getAdminDataPage } from "@/lib/admin/data-page";
import { AdminDataControls } from "@/components/admin/AdminDataControls";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { WorkoutKitService } from "@/services/WorkoutKitService";
import { WorkoutService } from "@/services/WorkoutService";
import { ExerciseDBService } from "@/services/ExerciseDBService";
import type {
  WorkoutKitRow,
  WorkoutKitItemWithSource,
  WorkoutProgramRow,
} from "@/types";
import { AdminKitsClient } from "./AdminKitsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Kits de Treino",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

interface KitWithItems extends WorkoutKitRow {
  items: WorkoutKitItemWithSource[];
}

export default async function AdminKitsTreinosPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams?: Record<string, string | undefined>;
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const tDiff = await getTranslations("difficultyLevels");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdminNav, "workoutKits", "Kits de Treino");
  const subtitle = await safe(
    tAdmin,
    "workoutKits.subtitle",
    "Coleções reutilizáveis de treinos (programas e exercícios) para atribuir rapidamente aos alunos.",
  );

  const pageParams = searchParams || {};
  const dataPage = await getAdminDataPage("workout_kits", pageParams);
  const kits = dataPage.rows;
  const allPrograms: WorkoutProgramRow[] = await WorkoutService.listPrograms({
    is_template: false,
    limit: 200,
  });
  const customExercises = await ExerciseDBService.listExercises({
    source: "custom",
    limit: 200,
  });

  // Carrega todos os itens de todos os kits em uma única consulta e agrupa por kit.
  const allItems = await WorkoutKitService.listKitItemsForKits(
    kits.map((k) => k.id),
  );
  const itemsByKit = new Map<string, WorkoutKitItemWithSource[]>();
  for (const item of allItems) {
    const list = itemsByKit.get(item.kit_id) ?? [];
    list.push(item);
    itemsByKit.set(item.kit_id, list);
  }

  const kitsWithItems: KitWithItems[] = kits.map((kit) => ({
    ...kit,
    items: itemsByKit.get(kit.id) ?? [],
  }));

  const programOptions = allPrograms.map((p) => ({
    id: p.id,
    title_pt: p.title_pt,
    title_en: p.title_en,
  }));

  const exerciseOptions = customExercises.map((e) => ({
    id: e.id,
    name_pt: e.name_pt,
    name_en: e.name_en,
    primary_muscle: e.primary_muscle,
    source: e.source,
  }));

  // Pré-calcula os rótulos de dificuldade (props de Client Components devem ser serializáveis).
  const difficultyLabels: Record<string, string> = {};
  for (const kit of kitsWithItems) {
    const key = kit.difficulty;
    if (key && !(key in difficultyLabels)) {
      try {
        difficultyLabels[key] = tDiff(key as any);
      } catch {
        difficultyLabels[key] = key;
      }
    }
  }

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="kits">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </AdminPageHeader>

      <AdminDataControls
        params={pageParams}
        total={dataPage.total}
        page={dataPage.page}
        size={dataPage.size}
        locale={locale}
      />
      <AdminKitsClient
        locale={locale}
        userId={userId}
        title={title}
        subtitle={subtitle}
        kits={kitsWithItems}
        programOptions={programOptions}
        exerciseOptions={exerciseOptions}
        difficultyLabels={difficultyLabels}
      />
    </div>
  );
}
