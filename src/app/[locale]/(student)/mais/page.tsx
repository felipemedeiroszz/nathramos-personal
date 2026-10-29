import Link from "next/link";
import { ArrowUpRight, Grid2X2 } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { requireStudentPage } from "@/lib/auth/platform";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { studentNavigation } from "@/components/student/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  await requireStudentPage();
  const en = locale === "en-US";
  return (
    <div className="space-y-7">
      <StudentPageHeader
        locale={locale}
        title={en ? "Your space" : "Seu espaço"}
        description={
          en
            ? "Everything you need to take care of your journey."
            : "Tudo o que você precisa para cuidar da sua jornada."
        }
        icon={<Grid2X2 size={22} />}
      />
      {studentNavigation.map((group) => (
        <section key={group.en}>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {en ? group.en : group.pt}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map((item) => (
              <Link
                key={item.path}
                href={`/${locale}/${item.path}`}
                className="group flex min-w-0 items-center gap-4 rounded-2xl border border-white/[0.07] bg-surface p-5 transition hover:border-yellow-400/25"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] text-yellow-300/80">
                  <item.icon size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {en ? item.en : item.pt}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {en ? item.descriptionEn : item.description}
                  </p>
                </div>
                <ArrowUpRight
                  size={15}
                  className="ml-auto shrink-0 text-zinc-600 group-hover:text-yellow-300"
                />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
