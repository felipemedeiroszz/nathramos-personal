import { getAdminDataPage } from "@/lib/admin/data-page";
import { AdminDataControls } from "@/components/admin/AdminDataControls";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { SupplementService } from "@/services/SupplementService";
import type { SupplementRow } from "@/types";
import { AdminSuplementosClient } from "./AdminSuplementosClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Suplementos",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

export default async function AdminSuplementosPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams?: {
    page?: string;
    q?: string;
    active?: string;
    category?: string;
  };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const tCommon = await getTranslations("common");
  const { userId } = await requireRole(["admin"], "/dashboard");

  const title = await safe(tAdminNav, "supplements", "Suplementos");
  const subtitle = await safe(
    tAdmin,
    "supplements.subtitle",
    "Gerencie o catálogo de suplementos",
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
  if (categoryParam && categoryParam.trim().length > 0)
    filters.category = categoryParam.trim();

  const pageParams = searchParams || {};
  const dataPage = await getAdminDataPage("supplements", pageParams);
  const supplements = dataPage.rows;

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminDataControls
        params={pageParams}
        total={dataPage.total}
        page={dataPage.page}
        size={dataPage.size}
        locale={locale}
      />
      <AdminSuplementosClient
        locale={locale}
        userId={userId}
        title={title}
        supplements={supplements}
        searchValue={q}
      />
    </div>
  );
}
