import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireAuthenticated } from "@/lib/auth/access";
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

  const userId = await requireAuthenticated();

  const exams: ExamRow[] = await ExamService.listExams({
    user_id: userId,
    limit: 100,
    only_active: true,
  });
  const categories: ExamCategoryRow[] = await ExamService.listCategories();

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">Exames Médicos</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Envie seus exames e receba o parecer do seu treinador
        </p>
      </header>

      <StudentExamsClient locale={locale} exams={exams} categories={categories} />
    </div>
  );
}
