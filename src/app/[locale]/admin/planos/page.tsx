import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { PlanService } from "@/services/PlanService";
import { AdminPlanoClient } from "@/components/admin/billing/AdminPlanoClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Planos",
};

export default async function AdminPlanosPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminPlans = await getTranslations("adminPlans");
  await requireRole(["admin"], "/dashboard");

  const plan = await PlanService.getPrimary();

  const title = (() => {
    try {
      if (tAdminNav.has("plans")) return tAdminNav("plans");
    } catch {}
    return "Planos";
  })();

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="finance">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminPlans("subtitle")}
        </p>
      </AdminPageHeader>

      <AdminPlanoClient plan={plan} />
    </div>
  );
}
