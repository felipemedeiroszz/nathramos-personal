import { setRequestLocale } from "next-intl/server";
import { Pill } from "lucide-react";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import { requireStudentPage } from "@/lib/auth/platform";
import { StudentRoutineService } from "@/services/StudentRoutineService";
import { DailyItemsClient } from "@/components/student/RoutineClients";
export const dynamic = "force-dynamic";
export const metadata = { title: "Suplementos" };
export default async function Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const userId = await requireStudentPage();
  const data = await StudentRoutineService.get(userId);
  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        title={locale === "en-US" ? "Supplements" : "Suplementos"}
        description={
          locale === "en-US"
            ? "Your doses and guidance in one place."
            : "Suas doses e orientações, em um só lugar."
        }
        icon={<Pill size={22} />}
      />
      <DailyItemsClient items={data.supplements} kind="supplement" />
    </div>
  );
}
