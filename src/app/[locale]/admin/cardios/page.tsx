import { requirePlatformUser } from "@/lib/auth/platform";
import { CardioService } from "@/services/CardioService";
import { CardioCatalog } from "@/components/admin/workout/CardioCatalog";
import { setRequestLocale } from "next-intl/server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const actor = await requirePlatformUser();
  if (!actor.staff) throw new Error("Acesso negado.");
  const activities = await CardioService.activities(true);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          {locale === "en-US" ? "Cardio activities" : "Modalidades de cardio"}
        </h1>
        <p className="text-text-secondary">
          {locale === "en-US"
            ? "Create the activities students can plan and record."
            : "Cadastre as modalidades que os alunos poderão planejar e registrar."}
        </p>
      </header>
      <CardioCatalog activities={activities} locale={locale} />
    </div>
  );
}
