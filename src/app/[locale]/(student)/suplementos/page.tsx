import { setRequestLocale } from "next-intl/server";
import { Pill } from "lucide-react";
import { StudentPageHeader as PageHeader } from "@/components/student/StudentPageHeader";
import { requireStudentPage } from "@/lib/auth/platform";
import { StudentRoutineService } from "@/services/StudentRoutineService";
import { DailyItemsClient } from "@/components/student/RoutineClients";
import { AssignedContentPanel } from "@/components/student/AssignedContentPanel";
import { StudentAssignedContentService } from "@/services/StudentAssignedContentService";
export const dynamic = "force-dynamic";
export const metadata = { title: "Suplementos" };
export default async function Page(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;

  const { locale } = params;

  setRequestLocale(locale);
  const userId = await requireStudentPage();
  const data = await StudentRoutineService.get(userId);
  const assigned = await StudentAssignedContentService.list(
    userId,
    "supplement",
    {
      date: data.date,
      locale,
      availableAssignmentIds: [
        ...new Set(data.supplements.map((item) => item.assignmentId)),
      ],
    },
  );
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
      <AssignedContentPanel
        items={assigned}
        locale={locale}
        kind="supplement"
      />
      <section id="conteudo-hoje">
        {data.supplements.length || !assigned.length ? (
          <DailyItemsClient items={data.supplements} kind="supplement" />
        ) : (
          <p
            role="status"
            className="rounded-xl border border-border p-4 text-sm text-text-secondary"
          >
            {locale === "en-US"
              ? "No supplements are available today. Your assigned kits are shown in the schedule above."
              : "Nenhum suplemento está liberado para hoje. Seus kits vinculados estão na programação acima."}
          </p>
        )}
      </section>
    </div>
  );
}
