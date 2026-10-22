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
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminPayments = await getTranslations("adminPayments");
  await requireRole(["admin", "coach"], "/dashboard");

  const payments = await BillingAdminService.listPayments();

  const title = (() => {
    try {
      if (tAdminNav.has("payments")) return tAdminNav("payments");
    } catch {}
    return "Pagamentos";
  })();

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{tAdminPayments("subtitle")}</p>
      </header>

      <AdminPagamentosClient title={title} payments={payments} />
    </div>
  );
}
