import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminDataPage } from "@/lib/admin/data-page";
import { AdminDataControls } from "@/components/admin/AdminDataControls";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { BillingAdminService } from "@/services/BillingAdminService";
import { AdminPagamentosClient } from "@/components/admin/billing/AdminPagamentosClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Pagamentos",
};

export default async function AdminPagamentosPage({
  params: { locale },
  searchParams = {},
}: {
  params: { locale: (typeof locales)[number] };
  searchParams?: Record<string, string | undefined>;
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminPayments = await getTranslations("adminPayments");
  await requireRole(["admin"], "/dashboard");

  const pageParams = {
    ...searchParams,
    currency: searchParams.currency || "BRL",
  };
  const dataPage = await getAdminDataPage("payments", pageParams);
  const payments = dataPage.rows;

  const title = (() => {
    try {
      if (tAdminNav.has("payments")) return tAdminNav("payments");
    } catch {}
    return "Pagamentos";
  })();

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="finance">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminPayments("subtitle")}
        </p>
      </AdminPageHeader>

      <AdminDataControls
        params={pageParams}
        total={dataPage.total}
        page={dataPage.page}
        size={dataPage.size}
        locale={locale}
        finance
        exportUrl="/api/admin/payments/export"
      />
      <AdminPagamentosClient title={title} payments={payments} />
    </div>
  );
}
