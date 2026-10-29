import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";
import { requireRole } from "@/lib/auth/access";
import { adminCurrency } from "@/lib/admin/reporting";
import { AdminMetricsService } from "@/services/AdminMetricsService";
import { AdminWorkQueue } from "@/components/admin/AdminWorkQueue";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard | Administração" };

export default async function AdminDashboardPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams: { currency?: string };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const actor = await requireRole(["admin", "coach"], "/dashboard");
  if (actor.role === "coach") return <AdminWorkQueue locale={locale} />;
  const currency = adminCurrency(searchParams.currency);
  const [metrics, revenue, statuses, plans, payments, growth] =
    await Promise.all([
      AdminMetricsService.getDashboardMetrics(currency),
      AdminMetricsService.getRevenueData(12, currency),
      AdminMetricsService.getSubscriptionStatusData(currency),
      AdminMetricsService.getTopPlans(5, currency),
      AdminMetricsService.getRecentPayments(10, currency, locale),
      AdminMetricsService.getGrowthData(currency),
    ]);
  return (
    <AdminDashboard
      locale={locale}
      currency={currency}
      metrics={metrics}
      revenue={revenue}
      statuses={statuses}
      plans={plans}
      payments={payments}
      growth={growth}
      updatedAt={new Date().toISOString()}
      workQueue={<AdminWorkQueue locale={locale} />}
    />
  );
}
