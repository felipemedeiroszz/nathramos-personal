import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { PlatformSettingsService } from "@/services/PlatformSettingsService";
import { AdminSettingsClient } from "@/components/admin/settings/AdminSettingsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Configurações",
};

export default async function AdminConfiguracoesPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminSettings = await getTranslations("adminSettings");
  await requireRole(["admin"], "/dashboard");

  const settings = await PlatformSettingsService.getForm();

  const title = (() => {
    try {
      if (tAdminNav.has("settings")) return tAdminNav("settings");
    } catch {}
    return "Configurações";
  })();

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="system">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminSettings("subtitle")}
        </p>
      </AdminPageHeader>

      <AdminSettingsClient settings={settings} />
    </div>
  );
}
