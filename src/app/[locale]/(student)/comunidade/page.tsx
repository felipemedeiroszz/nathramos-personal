import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStudentPage } from "@/lib/auth/platform";
import { communityActor, readCommunity } from "@/services/CommunityService";
import { CommunityFeed } from "@/components/community/CommunityFeed";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comunidade" };
export default async function CommunityPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ post?: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  await requireStudentPage();
  const { userId } = await communityActor();
  const { post } = await props.searchParams;
  if (post && !z.guid().safeParse(post).success) notFound();
  const initial = await readCommunity(userId, { post });
  return (
    <CommunityFeed
      locale={locale}
      userId={userId}
      initial={initial}
      postId={post}
    />
  );
}
