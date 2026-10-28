import { getAdminDataPage } from "@/lib/admin/data-page";
import { AdminDataControls } from "@/components/admin/AdminDataControls";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { ExerciseDBService } from "@/services/ExerciseDBService";
import {
  listBodyParts,
  listEquipments,
  listExercises,
  listMuscles,
  type ExerciseDbExercise,
} from "@/lib/exercisedb";
import type { ExerciseRow } from "@/types";
import { AdminTreinosTabs } from "./AdminTreinosTabs";
import { ExerciseCatalogClient } from "./ExerciseCatalogClient";
import { OwnExercisesClient } from "./OwnExercisesClient";

export const dynamic = "force-dynamic";

const CATALOG_PAGE_SIZE = 24;
const OWN_CATALOG_LIMIT = 300;

export const metadata: Metadata = {
  title: "Admin | Treinos",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

export default async function AdminTreinosPage({
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
  const tCatalog = await getTranslations("adminExerciseCatalog");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdminNav, "workouts", "Treinos");
  const subtitle = await safe(
    tAdmin,
    "workouts.subtitle",
    "Catálogo próprio de exercícios e catálogo ExerciseDB.",
  );

  const pageParams = { ...searchParams, source: "custom" };
  const [
    ownPage,
    bodyPartsResult,
    musclesResult,
    equipmentsResult,
    exercisesResult,
  ] = await Promise.all([
    getAdminDataPage("exercises", pageParams),
    listBodyParts(),
    listMuscles(),
    listEquipments(),
    listExercises({ limit: CATALOG_PAGE_SIZE }),
  ]);

  const catalogBodyParts = bodyPartsResult.ok
    ? bodyPartsResult.data.map((option) => option.name)
    : [];
  const catalogMuscles = musclesResult.ok
    ? musclesResult.data.map((option) => option.name)
    : [];
  const catalogEquipments = equipmentsResult.ok
    ? equipmentsResult.data.map((option) => option.name)
    : [];

  const catalogItems: ExerciseDbExercise[] = exercisesResult.ok
    ? exercisesResult.data.items
    : [];
  const catalogMeta = {
    total: exercisesResult.ok ? exercisesResult.data.total : 0,
    hasNextPage: exercisesResult.ok ? exercisesResult.data.hasNextPage : false,
    hasPreviousPage: exercisesResult.ok
      ? exercisesResult.data.hasPreviousPage
      : false,
    nextCursor: exercisesResult.ok ? exercisesResult.data.nextCursor : null,
    previousCursor: exercisesResult.ok
      ? exercisesResult.data.previousCursor
      : null,
  };
  const catalogError = exercisesResult.ok ? null : exercisesResult.code;

  const defaultTab = searchParams?.tab === "catalog" ? "catalog" : "own";

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminTreinosTabs
        defaultTab={defaultTab}
        ownCatalogContent={
          <>
            <AdminDataControls
              params={pageParams}
              total={ownPage.total}
              page={ownPage.page}
              size={ownPage.size}
              locale={locale}
            />
            <OwnExercisesClient
              locale={locale}
              userId={userId}
              title={tCatalog("ownTitle")}
              subtitle={tCatalog("ownSubtitle")}
              exercises={ownPage.rows as ExerciseRow[]}
            />
          </>
        }
        catalogContent={
          <div className="space-y-5">
            <header className="space-y-1">
              <h2 className="text-xl md:text-2xl font-bold text-text">
                {tCatalog("title")}
              </h2>
              <p className="text-sm text-text-secondary">
                {tCatalog("subtitle")}
              </p>
            </header>

            <ExerciseCatalogClient
              initialItems={catalogItems}
              initialMeta={catalogMeta}
              initialError={catalogError}
              bodyParts={catalogBodyParts}
              muscles={catalogMuscles}
              equipments={catalogEquipments}
            />
          </div>
        }
      />
    </div>
  );
}
