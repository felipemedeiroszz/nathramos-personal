import { setRequestLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/access";
import { readChallenges } from "@/services/ChallengeService";
import { ChallengeList } from "@/components/challenges/ChallengeList";
export const dynamic = "force-dynamic";
export const metadata = { title: "Gerenciar desafios" };
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { userId } = await requireRole(["admin"], "/dashboard");
  return (
    <ChallengeList
      initial={await readChallenges(userId, {})}
      locale={locale}
      admin
    />
  );
}
