import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { staffStudentIds } from "@/lib/auth/platform";
import { getAdminDataPage } from "@/lib/admin/data-page";
import { AdminDataControls } from "@/components/admin/AdminDataControls";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { ExamService } from "@/services/ExamService";
import { createServiceClientSSR } from "@/lib/supabase/server";
import type { ExamRow } from "@/types";
import { AdminExamesClient } from "./AdminExamesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Exames",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

export default async function AdminExamesPage({
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
  const tCommon = await getTranslations("common");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdminNav, "exams", "Exames");
  const subtitle = await safe(
    tAdmin,
    "exams.subtitle",
    "Gerencie os exames dos alunos",
  );

  const q = searchParams?.q ?? "";
  const categoryParam = searchParams?.category;

  const filters: {
    search?: string;
    category?: string;
    limit?: number;
  } = { limit: 50 };

  if (q && q.trim().length > 0) filters.search = q.trim();
  if (categoryParam && categoryParam.trim().length > 0) {
    filters.category = categoryParam.trim();
  }

  const pageParams = searchParams || {};
  const dataPage = await getAdminDataPage("exams", pageParams);
  const exams = dataPage.rows;
  const categories = await ExamService.listCategories();

  // createServiceClientSSR é assíncrono e precisa ser aguardado antes de usar .from().
  const supabase = await createServiceClientSSR();
  let profileQuery: any = supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true })
    .limit(200);
  const scope = await staffStudentIds();
  if (scope !== null) profileQuery = profileQuery.in("id", scope);
  const { data: profiles } = await profileQuery;

  const studentOptions = (profiles ?? []).map((p: any) => ({
    id: p.id,
    name: p.full_name || p.email,
    email: p.email,
  }));

  const studentNames: Record<string, string> = {};
  for (const p of profiles ?? []) {
    const row = p as any;
    studentNames[row.id] = row.full_name || row.email;
  }

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="content">
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
      <AdminExamesClient
        locale={locale}
        userId={userId}
        title={title}
        exams={exams}
        searchValue={q}
        categories={categories}
        studentOptions={studentOptions}
        studentNames={studentNames}
      />
    </div>
  );
}
