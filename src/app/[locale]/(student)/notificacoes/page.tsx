import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireStudentPage } from "@/lib/auth/platform";
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
  const userId = await requireStudentPage();
  const items = await NotificationService.listForUser(userId, false, 100);

  return (
    <div className="space-y-6 w-full">
      <PageHeader title={t("title")} description={t("subtitle")} icon={<Bell size={22} />} />

      <NotificationsCenterClient locale={locale} userId={userId} initialItems={items} />
    </div>
  );
}
