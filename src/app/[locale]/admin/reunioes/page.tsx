import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { MentorshipService } from "@/services/MentorshipService";
import { StudentService } from "@/services/StudentService";
import { AdminReunioesClient } from "@/components/admin/mentoring/AdminReunioesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Reuniões",
};

export default async function AdminReunioesPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminMentoring = await getTranslations("adminMentoring");
  await requireRole(["admin", "coach"], "/dashboard");

  const [meetings, studentsResult] = await Promise.all([
    MentorshipService.listMeetings({ limit: 300 }),
    StudentService.listStudents({ limit: 500, offset: 0 }),
  ]);

  const students = (studentsResult.students ?? []).map((s) => ({
    id: s.id,
    name: s.full_name ?? "Aluno",
  }));

  const title = (() => {
    try {
      if (tAdminNav.has("meetings")) return tAdminNav("meetings");
    } catch {}
    return "Reuniões";
  })();

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="relationship">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminMentoring("meetingsSubtitle")}
        </p>
      </AdminPageHeader>

      <AdminReunioesClient meetings={meetings} students={students} />
    </div>
  );
}
