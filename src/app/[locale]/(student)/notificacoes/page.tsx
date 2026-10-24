import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { requireAuthenticated } from "@/lib/auth/access";
import { NotificationService } from "@/services/NotificationService";
import { NotificationsCenterClient } from "@/components/shared/NotificationsCenterClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notificações",
};

export default async function StudentNotificationsPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("studentNotifications");
  const userId = await requireAuthenticated();
  const items = await NotificationService.listForUser(userId, false, 100);

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{t("title")}</h1>
        <p className="text-sm md:text-base text-text-secondary">{t("subtitle")}</p>
      </header>

      <NotificationsCenterClient locale={locale} userId={userId} initialItems={items} />
    </div>
  );
}
