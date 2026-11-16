import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStudentPage } from "@/lib/auth/platform";
import { challengeActor, readChallenges } from "@/services/ChallengeService";
import { ChallengeDetail } from "@/components/challenges/ChallengeDetail";
export const dynamic = "force-dynamic";
export const metadata = { title: "Vencedores do desafio" };
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!z.uuid().safeParse(id).success) notFound();
  await requireStudentPage();
  const { userId } = await challengeActor();
  return (
    <ChallengeDetail
      initial={await readChallenges(userId, { id })}
      userId={userId}
      locale={locale}
      winnersOnly
    />
  );
}
