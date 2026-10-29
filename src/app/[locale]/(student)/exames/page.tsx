import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import { requireStudentPage } from "@/lib/auth/platform";
import { ExamService } from "@/services/ExamService";
import type { ExamCategoryRow, ExamRow } from "@/types";
import { StudentExamsClient } from "./StudentExamsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exames Médicos",
};

export default async function ExamsPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);

  const userId = await requireStudentPage();

  const exams: ExamRow[] = await ExamService.listExams({
    user_id: userId,
    limit: 100,
    only_active: true,
  });
  const categories: ExamCategoryRow[] = await ExamService.listCategories();

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      <PageHeader
        locale={locale}
        title={locale === "en-US" ? "My exams" : "Exames Médicos"}
        description={
          locale === "en-US"
            ? "Upload your exams and follow your coach’s reviews."
            : "Envie seus exames e acompanhe os pareceres da sua treinadora."
        }
        icon={<FlaskConical size={22} />}
      />

      <StudentExamsClient
        locale={locale}
        exams={exams}
        categories={categories}
      />
    </div>
  );
}
