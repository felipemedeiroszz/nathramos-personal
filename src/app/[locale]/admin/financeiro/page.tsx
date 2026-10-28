import { FinanceChecks } from "@/components/admin/billing/FinanceChecks";
import { getAdminDataPage } from "@/lib/admin/data-page";
import { adminCurrency } from "@/lib/admin/reporting";
import { AdminCurrencySelector } from "@/components/admin/billing/AdminCurrencySelector";
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
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams: { currency?: string; from?: string; to?: string };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminFinance = await getTranslations("adminFinance");
  await requireRole(["admin"], "/dashboard");

  const currency = adminCurrency(searchParams.currency);
  const [
    overview,
    revenueSeries,
    statusCounts,
    providerRevenue,
    topPlans,
    recentPayments,
  ] = await Promise.all([
    BillingAdminService.getFinanceOverview(currency),
    BillingAdminService.getRevenueSeries(12, currency),
    BillingAdminService.getStatusCounts(currency),
    BillingAdminService.getProviderRevenue(currency),
    BillingAdminService.getTopPlans(5, currency),
    getAdminDataPage("payments", { currency }, 5).then((result) => result.rows),
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
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminFinance("subtitle")}
        </p>
      </header>
      <FinanceChecks params={searchParams} locale={locale} />
      <AdminCurrencySelector currency={currency} />
      <p className="text-xs text-text-secondary">
        Receita por gateway e evolução: últimos 12 meses.
      </p>

      <AdminFinanceiroClient
        overview={overview}
        revenueSeries={revenueSeries}
        statusCounts={statusCounts}
        providerRevenue={providerRevenue}
        topPlans={topPlans}
        integration={integration}
        recentPayments={recentPayments
          .filter((p) => p.currency === currency)
          .slice(0, 5)}
      />
    </div>
  );
}
