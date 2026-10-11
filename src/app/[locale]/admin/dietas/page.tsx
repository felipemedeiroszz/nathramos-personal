import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { DietService } from "@/services/DietService";
import type { DietProgramRow } from "@/types";
import { AdminDietasClient } from "./AdminDietasClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Dietas",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

export default async function AdminDietasPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams?: {
    q?: string;
    active?: string;
  };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const tCommon = await getTranslations("common");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdminNav, "diets", "Dietas");
  const subtitle = await safe(
    tAdmin,
    "diets.subtitle",
    "Gerencie os programas nutricionais dos alunos"
  );

  const q = searchParams?.q ?? "";
  const activeParam = searchParams?.active;

  const filters: {
    search?: string;
    is_active?: boolean;
    limit?: number;
  } = { limit: 50 };

  if (q && q.trim().length > 0) filters.search = q.trim();
  if (activeParam === "1") filters.is_active = true;
  if (activeParam === "0") filters.is_active = false;

  const programs: DietProgramRow[] = await DietService.listPrograms(filters);

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminDietasClient
        locale={locale}
        userId={userId}
        title={title}
        programs={programs}
        searchValue={q}
      />
    </div>
  );
}
