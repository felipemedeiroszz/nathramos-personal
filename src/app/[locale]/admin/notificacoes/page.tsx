import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { NotificationService } from "@/services/NotificationService";
import { AdminNotificationsClient } from "@/components/admin/notifications/AdminNotificationsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Notificações",
};

export default async function AdminNotificacoesPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminNotifications = await getTranslations("adminNotifications");
  await requireRole(["admin"], "/dashboard");

  const [history, templates, studentCount] = await Promise.all([
    NotificationService.listHistory({ limit: 100 }),
    NotificationService.listTemplates(),
    NotificationService.countStudents(),
  ]);

  const title = (() => {
    try {
      if (tAdminNav.has("notifications")) return tAdminNav("notifications");
    } catch {}
    return "Notificações";
  })();

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="relationship">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminNotifications("subtitle")}
        </p>
      </AdminPageHeader>

      <AdminNotificationsClient
        history={history.rows}
        historyTotal={history.total}
        templates={templates}
        studentCount={studentCount}
      />
    </div>
  );
}
