import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/access";
import { getAnalyticsReport } from "@/services/AnalyticsService";
import { analyticsFilters, type AnalyticsParams } from "@/lib/analytics/model";
import { AnalyticsClient } from "@/components/admin/analytics/AnalyticsClient";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function AnalyticsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: AnalyticsParams;
}) {
  setRequestLocale(locale);
  await requireRole(["admin", "coach"], "/dashboard");
  try {
    analyticsFilters(searchParams);
  } catch {
    return (
      <section className="rounded-xl border border-border p-6 space-y-3">
        <h1 className="text-2xl font-bold">
          {locale === "en-US"
            ? "Invalid report filters"
            : "Filtros de relatório inválidos"}
        </h1>
        <p>
          {locale === "en-US"
            ? "Check the dates and grouping. Daily reports allow up to 93 days; weekly/monthly reports allow up to 731 days."
            : "Confira datas e agrupamento. Relatórios diários aceitam até 93 dias; semanais/mensais, até 731 dias."}
        </p>
        <Link
          className="text-primary underline"
          href={`/${locale}/admin/relatorios`}
        >
          {locale === "en-US" ? "Reset filters" : "Limpar filtros"}
        </Link>
      </section>
    );
  }
  const { report, filters } = await getAnalyticsReport(searchParams);
  return <AnalyticsClient report={report} filters={filters} locale={locale} />;
}
