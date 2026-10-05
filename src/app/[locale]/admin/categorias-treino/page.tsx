import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { WorkoutService } from "@/services/WorkoutService";
import type { WorkoutCategoryRow, WorkoutProgramRow } from "@/types";
import { AdminCategoriasClient } from "./AdminCategoriasClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Categorias de Treino",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

export default async function AdminCategoriasTreinoPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const tCommon = await getTranslations("common");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdminNav, "workoutCategories", "Categorias de Treino");
  const subtitle = await safe(
    tAdmin,
    "workoutCategories.subtitle",
    "Organize os programas e kits por categoria."
  );

  const categories: WorkoutCategoryRow[] = await WorkoutService.listCategories(false);
  const allPrograms: WorkoutProgramRow[] = await WorkoutService.listPrograms({ is_template: false });

  const programCountByCategory: Record<string, number> = {};
  for (const p of allPrograms) {
    if (p.category_id) {
      programCountByCategory[p.category_id] = (programCountByCategory[p.category_id] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminCategoriasClient
        locale={locale}
        userId={userId}
        title={title}
        subtitle={subtitle}
        categories={categories}
        programCountByCategory={programCountByCategory}
      />
    </div>
  );
}
