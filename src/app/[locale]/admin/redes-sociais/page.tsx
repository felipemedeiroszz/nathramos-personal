import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Share2 } from "lucide-react";
import { requireRole } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Redes Sociais",
};

export default async function AdminRedesSociaisPage({
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
      if (tAdminNav.has("social")) return tAdminNav("social");
    } catch {}
    return "Redes Sociais";
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
              <Share2 size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            className="py-16"
            icon={<Share2 size={40} className="text-text-secondary" />}
            title={title}
            description={subtitle}
          />
        </CardContent>
      </Card>
    </div>
  );
}
