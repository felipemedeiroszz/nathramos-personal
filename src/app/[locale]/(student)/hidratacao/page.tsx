import { setRequestLocale } from "next-intl/server";
import { Droplets } from "lucide-react";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import { requireStudentPage } from "@/lib/auth/platform";
import { StudentRoutineService } from "@/services/StudentRoutineService";
import { HydrationClient } from "@/components/student/RoutineClients";
export const dynamic = "force-dynamic";
export const metadata = { title: "Hidratação" };
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
        title={locale === "en-US" ? "Hydration" : "Hidratação"}
        description={
          locale === "en-US"
            ? "Track your water throughout the day."
            : "Acompanhe sua água ao longo do dia."
        }
        icon={<Droplets size={22} />}
      />
      <HydrationClient data={data} />
    </div>
  );
}
