import { PublicShell } from "@/components/public/PublicShell";
import { ContentPageView } from "@/components/shared/ContentPageView";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPageService } from "@/services/ContentPageService";
import {
  DEFAULT_CONTENT_PAGES,
  resolveContentPage,
} from "@/lib/content/contentPages";

export const dynamic = "force-dynamic";

export default async function FAQPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const navT = await getTranslations("nav");

  const row = await ContentPageService.getBySlug("faq");
  const resolved = resolveContentPage(row, DEFAULT_CONTENT_PAGES.faq, locale);
  const page = { ...resolved, title: resolved.title || navT("faq") };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <PublicShell locale={locale}>
        <ContentPageView page={page} variant="faq" locale={locale} />
      </PublicShell>
    </div>
  );
}
