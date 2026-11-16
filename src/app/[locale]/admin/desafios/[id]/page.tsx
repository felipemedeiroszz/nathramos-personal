import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/access";
import { readChallenges } from "@/services/ChallengeService";
import { ChallengeDetail } from "@/components/challenges/ChallengeDetail";
export const dynamic = "force-dynamic";
export const metadata = { title: "Gerenciar desafio" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!z.uuid().safeParse(id).success) notFound();
  const { userId } = await requireRole(["admin"], "/dashboard");
  const query = await searchParams;
  return (
    <ChallengeDetail
      initial={await readChallenges(userId, { id })}
      userId={userId}
      locale={locale}
      admin
      edit={query.edit === "1"}
    />
  );
}
