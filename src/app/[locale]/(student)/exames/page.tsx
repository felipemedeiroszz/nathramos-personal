import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
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
        title="Exames Médicos"
        description="Envie seus exames e receba o parecer do seu treinador"
        icon={<FlaskConical size={22} />}
      />

      <StudentExamsClient locale={locale} exams={exams} categories={categories} />
    </div>
  );
}
