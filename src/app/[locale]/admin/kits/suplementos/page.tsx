import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package } from "lucide-react";
import { requireRole } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Kits de Suplemento",
};

export default async function AdminKitsSuplementosPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const tCommon = await getTranslations("common");
  await requireRole(["admin", "coach"], "/dashboard");

  const title = (() => {
    try {
      if (tAdminNav.has("supplementKits")) return tAdminNav("supplementKits");
    } catch {}
    return "Kits de Suplemento";
  })();

  const subtitle = (() => {
    try {
      if (tCommon.has("comingSoon")) return tCommon("comingSoon");
    } catch {}
    return "Em breve";
  })();

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{subtitle}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Package size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            className="py-16"
            icon={<Package size={40} className="text-text-secondary" />}
            title={title}
            description={subtitle}
          />
        </CardContent>
      </Card>
    </div>
  );
}
