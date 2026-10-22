import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { BillingAdminService } from "@/services/BillingAdminService";
import { AdminFinanceiroClient } from "@/components/admin/billing/AdminFinanceiroClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Financeiro",
};

export default async function AdminFinanceiroPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminFinance = await getTranslations("adminFinance");
  await requireRole(["admin", "coach"], "/dashboard");

  const [overview, revenueSeries, statusCounts, providerRevenue, topPlans, recentPayments] =
    await Promise.all([
      BillingAdminService.getFinanceOverview(),
      BillingAdminService.getRevenueSeries(12),
      BillingAdminService.getStatusCounts(),
      BillingAdminService.getProviderRevenue(),
      BillingAdminService.getTopPlans(5),
      BillingAdminService.listPayments(),
    ]);

  const integration = BillingAdminService.getIntegrationStatus();

  const title = (() => {
    try {
      if (tAdminNav.has("financeiro")) return tAdminNav("financeiro");
    } catch {}
    return "Financeiro";
  })();

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{tAdminFinance("subtitle")}</p>
      </header>

      <AdminFinanceiroClient
        overview={overview}
        revenueSeries={revenueSeries}
        statusCounts={statusCounts}
        providerRevenue={providerRevenue}
        topPlans={topPlans}
        integration={integration}
        recentPayments={recentPayments.slice(0, 5)}
      />
    </div>
  );
}
