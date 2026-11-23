import { DietWrittenPlan } from "@/components/shared/DietWrittenPlan";
import { setRequestLocale } from "next-intl/server";
import { Utensils } from "lucide-react";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import { requireStudentPage } from "@/lib/auth/platform";
import { StudentRoutineService } from "@/services/StudentRoutineService";
import { DailyItemsClient } from "@/components/student/RoutineClients";
import { AssignedContentPanel } from "@/components/student/AssignedContentPanel";
import { StudentAssignedContentService } from "@/services/StudentAssignedContentService";
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
  const assigned = await StudentAssignedContentService.list(userId, "diet", {
    date: data.date,
    locale,
    availableAssignmentIds: [
      ...new Set([
        ...data.diet.map((item) => item.assignmentId),
        ...(data.dietGuidance || []).map((item) => item.assignmentId),
      ]),
    ],
  });
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
      <AssignedContentPanel items={assigned} locale={locale} kind="diet" />
      <section id="conteudo-hoje" className="space-y-6">
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
        {(data.diet.length > 0 ||
          (!assigned.length && !data.dietGuidance?.length)) && (
          <DailyItemsClient
            items={data.diet}
            kind="diet"
            consumed={data.consumedNutrition}
            planned={data.plannedNutrition}
          />
        )}
        {assigned.length > 0 &&
          !data.diet.length &&
          !data.dietGuidance?.length && (
            <p
              role="status"
              className="rounded-xl border border-border p-4 text-sm text-text-secondary"
            >
              {locale === "en-US"
                ? "No diet items are available today. Your assigned kits are shown in the schedule above."
                : "Nenhum item da dieta está liberado para hoje. Seus kits vinculados estão na programação acima."}
            </p>
          )}
      </section>
    </div>
  );
}
