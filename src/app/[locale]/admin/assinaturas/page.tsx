import { getAdminDataPage } from "@/lib/admin/data-page";
import { AdminDataControls } from "@/components/admin/AdminDataControls";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { BillingAdminService } from "@/services/BillingAdminService";
import { AdminAssinaturasClient } from "@/components/admin/billing/AdminAssinaturasClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Assinaturas",
};

export default async function AdminAssinaturasPage({
  params: { locale },
  searchParams = {},
}: {
  params: { locale: (typeof locales)[number] };
  searchParams?: Record<string, string | undefined>;
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminSubs = await getTranslations("adminAssinaturas");
  await requireRole(["admin"], "/dashboard");

  const pageParams = {
    ...searchParams,
    currency: searchParams.currency || "BRL",
  };
  const dataPage = await getAdminDataPage("subscriptions", pageParams);
  const subscriptions = dataPage.rows;

  const title = (() => {
    try {
      if (tAdminNav.has("subscriptions")) return tAdminNav("subscriptions");
    } catch {}
    return "Assinaturas";
  })();

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminSubs("subtitle")}
        </p>
      </header>

      <AdminDataControls
        params={pageParams}
        total={dataPage.total}
        page={dataPage.page}
        size={dataPage.size}
        locale={locale}
        finance
      />
      <AdminAssinaturasClient title={title} subscriptions={subscriptions} />
    </div>
  );
}
