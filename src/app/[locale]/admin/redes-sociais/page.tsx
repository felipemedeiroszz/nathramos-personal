import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { SocialLinksService } from "@/services/SocialLinksService";
import { AdminSocialLinksClient } from "@/components/admin/social/AdminSocialLinksClient";

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
  const tAdminNav = await getTranslations("adminNav");
  const tAdminSocial = await getTranslations("adminSocial");
  await requireRole(["admin"], "/dashboard");

  const links = await SocialLinksService.list();

  const title = (() => {
    try {
      if (tAdminNav.has("social")) return tAdminNav("social");
    } catch {}
    return "Redes Sociais";
  })();

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminSocial("subtitle")}
        </p>
      </header>

      <AdminSocialLinksClient title={title} links={links} />
    </div>
  );
}
