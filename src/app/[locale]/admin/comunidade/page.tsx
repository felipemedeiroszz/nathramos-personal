import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/access";
import { readCommunity } from "@/services/CommunityService";
import { CommunityFeed } from "@/components/community/CommunityFeed";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gerenciamento da Comunidade" };
export default async function CommunityAdminPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ post?: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const { userId } = await requireRole(["admin"], "/dashboard");
  const { post } = await props.searchParams;
  if (post && !z.guid().safeParse(post).success) notFound();
  const initial = await readCommunity(userId, { post, admin: "true" });
  return (
    <CommunityFeed
      locale={locale}
      userId={userId}
      initial={initial}
      postId={post}
      admin
    />
  );
}
