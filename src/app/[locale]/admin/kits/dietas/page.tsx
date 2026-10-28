import { staffStudentIds } from "@/lib/auth/platform";
import { getAdminDataPage } from "@/lib/admin/data-page";
import { AdminDataControls } from "@/components/admin/AdminDataControls";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { DietService } from "@/services/DietService";
import type { DietKitWithItems, DietFoodRow } from "@/types";
import { AdminDietKitsClient } from "./AdminDietKitsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Kits de Dieta",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

export default async function AdminKitsDietasPage({
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
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdminNav, "dietKits", "Kits de Dieta");
  const subtitle = await safe(
    tAdmin,
    "dietKits.subtitle",
    "Monte kits de dieta reutilizáveis a partir dos alimentos cadastrados.",
  );

  const pageParams = searchParams || {};
  const dataPage = await getAdminDataPage("diet_kits", pageParams);
  const kits = dataPage.rows;
  const foods: DietFoodRow[] = await DietService.listFoods({
    is_active: true,
    limit: 500,
  });

  const items = await DietService.listKitItemsForKits(kits.map((k) => k.id));

  const kitsWithItems: DietKitWithItems[] = kits.map((kit) => ({
    ...kit,
    items: items.filter((item) => item.kit_id === kit.id),
  }));

  // Alunos disponíveis para vincular aos kits
  const supabase = await createServiceClientSSR();
  let profileQuery: any = supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "student")
    .eq("is_deleted", false)
    .order("full_name", { ascending: true })
    .limit(500);
  const scope = await staffStudentIds();
  if (scope !== null) profileQuery = profileQuery.in("id", scope);
  const { data: profiles } = await profileQuery;

  const students = (profiles ?? []).map((p: any) => ({
    id: p.id as string,
    name: (p.full_name || p.email || "") as string,
    email: (p.email || "") as string,
  }));

  // Vínculos ativos agrupados por kit
  const assignments = await DietService.listKitAssignments(
    kits.map((k) => k.id),
  );
  const assignedByKit: Record<string, string[]> = {};
  for (const a of assignments) {
    if (!assignedByKit[a.kit_id]) assignedByKit[a.kit_id] = [];
    assignedByKit[a.kit_id].push(a.student_id);
  }

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
      <AdminDietKitsClient
        locale={locale}
        userId={userId}
        title={title}
        subtitle={subtitle}
        kits={kitsWithItems}
        foods={foods}
        students={students}
        assignedByKit={assignedByKit}
        initialCreateOpen={searchParams?.new === "1"}
      />
    </div>
  );
}
