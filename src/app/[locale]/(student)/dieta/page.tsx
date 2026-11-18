import { DietWrittenPlan } from "@/components/shared/DietWrittenPlan";
import { setRequestLocale } from "next-intl/server";
import { Utensils } from "lucide-react";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import { requireStudentPage } from "@/lib/auth/platform";
import { StudentRoutineService } from "@/services/StudentRoutineService";
import { DailyItemsClient } from "@/components/student/RoutineClients";
export const dynamic = "force-dynamic";
export const metadata = { title: "Dieta" };
export default async function Page(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;

  const { locale } = params;

  setRequestLocale(locale);
  const userId = await requireStudentPage();
  const data = await StudentRoutineService.get(userId);
  return (
    <div className="space-y-6">
      <PageHeader
        locale={locale}
        title={locale === "en-US" ? "Nutrition" : "Dieta"}
        description={
          locale === "en-US"
            ? "Your meals and guidance for today."
            : "Suas refeições e orientações para hoje."
        }
        icon={<Utensils size={22} />}
      />
      {data.dietGuidance?.map((plan) => (
        <section
          key={plan.assignmentId}
          className="space-y-3"
          aria-label={plan.kit}
        >
          <h2 className="text-lg font-semibold">{plan.kit}</h2>
          <DietWrittenPlan text={plan.text} locale={locale} />
        </section>
      ))}
      {(data.diet.length > 0 || !data.dietGuidance?.length) && (
        <DailyItemsClient
          items={data.diet}
          kind="diet"
          consumed={data.consumedNutrition}
          planned={data.plannedNutrition}
        />
      )}
    </div>
  );
}
