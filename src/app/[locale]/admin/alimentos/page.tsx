import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { DietService } from "@/services/DietService";
import type { DietFoodRow } from "@/types";
import { AdminAlimentosClient } from "./AdminAlimentosClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Alimentos",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

export default async function AdminAlimentosPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams?: {
    q?: string;
    active?: string;
    category?: string;
    new?: string;
  };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdminNav, "foods", "Alimentos");
  const subtitle = await safe(
    tAdmin,
    "foods.subtitle",
    "Cadastre alimentos com valores nutricionais para montar kits de dieta."
  );

  const q = searchParams?.q ?? "";
  const activeParam = searchParams?.active;
  const categoryParam = searchParams?.category;

  const filters: {
    search?: string;
    is_active?: boolean;
    category?: string;
    limit?: number;
  } = { limit: 50 };

  if (q && q.trim().length > 0) filters.search = q.trim();
  if (activeParam === "1") filters.is_active = true;
  if (activeParam === "0") filters.is_active = false;
  if (categoryParam && categoryParam.trim().length > 0) filters.category = categoryParam.trim();

  const foods: DietFoodRow[] = await DietService.listFoods(filters);

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminAlimentosClient
        locale={locale}
        userId={userId}
        title={title}
        foods={foods}
        searchValue={q}
        initialCreateOpen={searchParams?.new === "1"}
      />
    </div>
  );
}
