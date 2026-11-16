import { setRequestLocale } from "next-intl/server";
import { requireStudentPage } from "@/lib/auth/platform";
import { challengeActor, readChallenges } from "@/services/ChallengeService";
import { ChallengeList } from "@/components/challenges/ChallengeList";
export const dynamic = "force-dynamic";
export const metadata = { title: "Desafios" };
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStudentPage();
  const { userId } = await challengeActor();
  return (
    <ChallengeList initial={await readChallenges(userId, {})} locale={locale} />
  );
}
