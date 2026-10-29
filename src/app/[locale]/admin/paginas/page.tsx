import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { ContentPageService } from "@/services/ContentPageService";
import { DEFAULT_CONTENT_PAGES } from "@/lib/content/contentPages";
import { CONTENT_PAGE_SLUGS } from "@/schemas/contentPages";
import {
  AdminContentPagesClient,
  type ContentBlockEditorData,
  type ContentPageEditorData,
} from "@/components/admin/content/AdminContentPagesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Páginas",
};

function toEditorBlock(block: {
  id: string;
  title_pt?: string | null;
  title_en?: string | null;
  subtitle_pt?: string | null;
  subtitle_en?: string | null;
  text_pt?: string | null;
  text_en?: string | null;
  image_url?: string | null;
  button_label_pt?: string | null;
  button_label_en?: string | null;
  button_url?: string | null;
}): ContentBlockEditorData {
  return {
    id: block.id,
    title_pt: block.title_pt ?? "",
    title_en: block.title_en ?? "",
    subtitle_pt: block.subtitle_pt ?? "",
    subtitle_en: block.subtitle_en ?? "",
    text_pt: block.text_pt ?? "",
    text_en: block.text_en ?? "",
    image_url: block.image_url ?? "",
    button_label_pt: block.button_label_pt ?? "",
    button_label_en: block.button_label_en ?? "",
    button_url: block.button_url ?? "",
  };
}

export default async function AdminPaginasPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminPages = await getTranslations("adminPages");
  await requireRole(["admin"], "/dashboard");

  const rows = await ContentPageService.list();
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  const pages: ContentPageEditorData[] = CONTENT_PAGE_SLUGS.map((slug) => {
    const row = bySlug.get(slug) ?? null;
    const fallback = DEFAULT_CONTENT_PAGES[slug];
    const isCustomized = Boolean(
      row && (row.title_pt || row.title_en || (row.blocks?.length ?? 0) > 0),
    );

    if (isCustomized && row) {
      return {
        slug,
        title_pt: row.title_pt ?? "",
        title_en: row.title_en ?? "",
        subtitle_pt: row.subtitle_pt ?? "",
        subtitle_en: row.subtitle_en ?? "",
        image_url: row.image_url ?? "",
        cta_label_pt: row.cta_label_pt ?? "",
        cta_label_en: row.cta_label_en ?? "",
        cta_url: row.cta_url ?? "",
        blocks: (row.blocks ?? []).map(toEditorBlock),
        is_active: row.is_active,
        updated_at: row.updated_at,
        isCustomized: true,
      };
    }

    return {
      slug,
      title_pt: fallback.titlePt,
      title_en: fallback.titleEn,
      subtitle_pt: fallback.subtitlePt,
      subtitle_en: fallback.subtitleEn,
      image_url: "",
      cta_label_pt: "",
      cta_label_en: "",
      cta_url: "",
      blocks: fallback.blocks.map(toEditorBlock),
      is_active: row?.is_active ?? true,
      updated_at: row?.updated_at ?? null,
      isCustomized: false,
    };
  });

  const title = (() => {
    try {
      if (tAdminNav.has("pages")) return tAdminNav("pages");
    } catch {}
    return "Páginas";
  })();

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="system">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminPages("subtitle")}
        </p>
      </AdminPageHeader>

      <AdminContentPagesClient pages={pages} />
    </div>
  );
}
