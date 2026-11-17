import Link from "next/link";
import {
  User,
  Dumbbell,
  History,
  Utensils,
  Pill,
  CalendarDays,
  CreditCard,
  Settings,
} from "lucide-react";
import {
  availableStudentTabs,
  studentTabHref,
  type StudentDetailTab,
} from "@/lib/admin/student-detail-tabs";
const icons = {
  user: User,
  workout: Dumbbell,
  history: History,
  diet: Utensils,
  supplement: Pill,
  routine: CalendarDays,
  billing: CreditCard,
  settings: Settings,
};
export function StudentDetailNavigation({
  locale,
  studentId,
  active,
  admin,
  params,
}: {
  locale: string;
  studentId: string;
  active: StudentDetailTab;
  admin: boolean;
  params: Record<string, string | undefined>;
}) {
  const tabs = availableStudentTabs(admin);
  const current = tabs.find((tab) => tab.id === active)!;
  const en = locale === "en-US";
  return (
    <div
      id="ficha-aluno"
      className="scroll-mt-6 rounded-2xl border border-white/[0.08] bg-[#101113] px-3 pt-3 sm:px-5 sm:pt-5"
    >
      <nav
        aria-label={en ? "Student sections" : "Seções do aluno"}
        className="grid min-w-0 grid-cols-2 gap-1 border-b border-white/10 pb-3 sm:flex sm:flex-wrap"
      >
        {tabs.map((tab) => {
          const Icon = icons[tab.icon],
            selected = active === tab.id;
          return (
            <Link
              key={tab.id}
              prefetch={false}
              href={studentTabHref(
                `/${locale}/admin/alunos/${encodeURIComponent(studentId)}`,
                tab.id,
                params,
              )}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${selected ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300" : "border-transparent text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200"}`}
            >
              <Icon size={14} />
              {en ? tab.en : tab.pt}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between gap-3 py-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          {en ? current.en : current.pt}
        </h2>
        <span className="text-[10px] text-zinc-600">
          {en ? "Student record" : "Ficha do aluno"}
        </span>
      </div>
    </div>
  );
}
