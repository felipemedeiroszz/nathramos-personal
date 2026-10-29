import { setRequestLocale } from "next-intl/server";
import { ShoppingCart } from "lucide-react";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import { requireStudentPage } from "@/lib/auth/platform";
import { StudentRoutineService } from "@/services/StudentRoutineService";
import { ShoppingClient } from "@/components/student/RoutineClients";
export const dynamic = "force-dynamic";
export const metadata = { title: "Lista de compras" };
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
        title={locale === "en-US" ? "Shopping list" : "Lista de compras"}
        description={
          locale === "en-US"
            ? "Your diet ingredients, organized for you."
            : "Os alimentos da sua dieta, organizados para você."
        }
        icon={<ShoppingCart size={22} />}
      />
      <ShoppingClient data={data} />
    </div>
  );
}
