import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { WorkoutKitService } from "@/services/WorkoutKitService";
import { WorkoutService } from "@/services/WorkoutService";
import type {
  WorkoutKitRow,
  WorkoutKitItemRow,
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
  items: Array<WorkoutKitItemRow & { program?: any }>;
}

export default async function AdminKitsTreinosPage({
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

  const title = await safe(tAdminNav, "workoutKits", "Kits de Treino");
  const subtitle = await safe(
    tAdmin,
    "workoutKits.subtitle",
    "Colecoes reutilizaveis de programas para atribuir rapidamente aos alunos."
  );

  const kits: WorkoutKitRow[] = await WorkoutKitService.listKits({ limit: 100 });
  const allPrograms: WorkoutProgramRow[] = await WorkoutService.listPrograms({
    is_template: false,
    limit: 200,
  });

  const kitsWithItems: KitWithItems[] = [];
  for (let i = 0; i < kits.length; i++) {
    const k = kits[i];
    let items: Array<WorkoutKitItemRow & { program?: any }> = [];
    if (i === 0) {
      items = await WorkoutKitService.listKitItems(k.id);
    }
    kitsWithItems.push({ ...k, items });
  }

  function translateDifficulty(key: string): string {
    try {
      return tDiff(key as any);
    } catch {
      return key;
    }
  }

  const programOptions = allPrograms.map((p) => ({
    id: p.id,
    title_pt: p.title_pt,
    title_en: p.title_en,
  }));

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminKitsClient
        locale={locale}
        userId={userId}
        title={title}
        subtitle={subtitle}
        kits={kitsWithItems}
        programOptions={programOptions}
        translateDifficulty={translateDifficulty}
      />
    </div>
  );
}
