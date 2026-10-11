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
  searchParams?: {
    q?: string;
    category?: string;
  };
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
    "Gerencie os exames dos alunos"
  );

  const q = searchParams?.q ?? "";
  const categoryParam = searchParams?.category;

  const filters: {
    search?: string;
    category?: string;
    limit?: number;
  } = { limit: 50 };

  if (q && q.trim().length > 0) filters.search = q.trim();
  if (categoryParam && categoryParam.trim().length > 0) filters.category = categoryParam.trim();

  const exams: ExamRow[] = await ExamService.listExams(filters);
  const categories = await ExamService.listCategories();

  const supabase = createServiceClientSSR();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true })
    .limit(200);

  const studentOptions = (profiles ?? []).map((p: any) => ({
    id: p.id,
    name: p.full_name || p.email,
    email: p.email,
  }));

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminExamesClient
        locale={locale}
        userId={userId}
        title={title}
        exams={exams}
        searchValue={q}
        categories={categories}
        studentOptions={studentOptions}
      />
    </div>
  );
}
