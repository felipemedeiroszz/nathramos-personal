"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ProductImageField } from "@/components/admin/content/ProductImageField";
import { upsertContentPageAction } from "@/app/actions/content";
import { CONTENT_PAGE_SLUGS, type ContentPageSlugT } from "@/schemas/contentPages";
import { cn } from "@/lib/utils";

export type ContentBlockEditorData = {
  id: string;
  title_pt: string;
  title_en: string;
  subtitle_pt: string;
  subtitle_en: string;
  text_pt: string;
  text_en: string;
  image_url: string;
  button_label_pt: string;
  button_label_en: string;
  button_url: string;
};

export type ContentPageEditorData = {
  slug: ContentPageSlugT;
  title_pt: string;
  title_en: string;
  subtitle_pt: string;
  subtitle_en: string;
  image_url: string;
  cta_label_pt: string;
  cta_label_en: string;
  cta_url: string;
  blocks: ContentBlockEditorData[];
  is_active: boolean;
  updated_at: string | null;
  isCustomized: boolean;
};

const EMPTY_BLOCK: Omit<ContentBlockEditorData, "id"> = {
  title_pt: "",
  title_en: "",
  subtitle_pt: "",
  subtitle_en: "",
  text_pt: "",
  text_en: "",
  image_url: "",
  button_label_pt: "",
  button_label_en: "",
  button_url: "",
};

function createBlock(): ContentBlockEditorData {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `blk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, ...EMPTY_BLOCK };
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface BlockEditorProps {
  block: ContentBlockEditorData;
  index: number;
  total: number;
  onChange: (next: ContentBlockEditorData) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

function BlockEditor({
  block,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: BlockEditorProps) {
  const t = useTranslations("adminPages");
  const [open, setOpen] = useState(false);
  const update = (key: keyof ContentBlockEditorData, value: string) =>
    onChange({ ...block, [key]: value });

  const preview = block.title_pt || block.title_en || t("untitledBlock");

  return (
    <div className="rounded-xl border border-border bg-surface-secondary/40 overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
          aria-expanded={open}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-semibold text-text-secondary">
            {index + 1}
          </span>
          <span className="truncate text-sm font-medium text-text">{preview}</span>
          <ChevronDown
            size={16}
            className={cn(
              "ml-auto shrink-0 text-text-secondary transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t("moveUp")}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp size={15} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t("moveDown")}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown size={15} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t("removeBlock")}
            onClick={onRemove}
          >
            <Trash2 size={15} className="text-text" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("titlePt")}</label>
              <Input
                value={block.title_pt}
                onChange={(e) => update("title_pt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("titleEn")}</label>
              <Input
                value={block.title_en}
                onChange={(e) => update("title_en", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("subtitlePt")}
              </label>
              <Input
                value={block.subtitle_pt}
                onChange={(e) => update("subtitle_pt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("subtitleEn")}
              </label>
              <Input
                value={block.subtitle_en}
                onChange={(e) => update("subtitle_en", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("textPt")}</label>
              <Textarea
                value={block.text_pt}
                onChange={(e) => update("text_pt", e.target.value)}
                placeholder={t("textPlaceholder")}
                className="min-h-[160px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("textEn")}</label>
              <Textarea
                value={block.text_en}
                onChange={(e) => update("text_en", e.target.value)}
                placeholder={t("textPlaceholder")}
                className="min-h-[160px]"
              />
            </div>
          </div>

          <ProductImageField
            value={block.image_url}
            onChange={(url) => update("image_url", url)}
          />

          <div className="space-y-4 rounded-xl border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {t("blockButton")}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">
                  {t("buttonTitlePt")}
                </label>
                <Input
                  value={block.button_label_pt}
                  onChange={(e) => update("button_label_pt", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">
                  {t("buttonTitleEn")}
                </label>
                <Input
                  value={block.button_label_en}
                  onChange={(e) => update("button_label_en", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("buttonUrl")}</label>
              <Input
                value={block.button_url}
                onChange={(e) => update("button_url", e.target.value)}
                placeholder="https://... ou /pt-BR/planos"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminContentPagesClient({ pages }: { pages: ContentPageEditorData[] }) {
  const t = useTranslations("adminPages");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeSlug, setActiveSlug] = useState<ContentPageSlugT>(
    pages[0]?.slug ?? "termos"
  );
  const [drafts, setDrafts] = useState<Record<string, ContentPageEditorData>>(() =>
    Object.fromEntries(pages.map((page) => [page.slug, page]))
  );
  const [feedback, setFeedback] = useState<{
    slug: ContentPageSlugT;
    success: boolean;
    message: string;
  } | null>(null);

  const draft = drafts[activeSlug];

  const tabLabel: Record<ContentPageSlugT, string> = useMemo(
    () => ({
      termos: t("tabTermos"),
      privacidade: t("tabPrivacidade"),
      faq: t("tabFaq"),
    }),
    [t]
  );

  const patch = (slug: string, partial: Partial<ContentPageEditorData>) =>
    setDrafts((prev) => ({ ...prev, [slug]: { ...prev[slug], ...partial } }));

  const updateBlock = (
    slug: string,
    index: number,
    next: ContentBlockEditorData
  ) => {
    const current = drafts[slug];
    if (!current) return;
    const blocks = current.blocks.map((block, i) => (i === index ? next : block));
    patch(slug, { blocks });
  };

  const addBlock = (slug: string) => {
    const current = drafts[slug];
    if (!current) return;
    patch(slug, { blocks: [...current.blocks, createBlock()] });
  };

  const removeBlock = (slug: string, index: number) => {
    const current = drafts[slug];
    if (!current) return;
    patch(slug, { blocks: current.blocks.filter((_, i) => i !== index) });
  };

  const moveBlock = (slug: string, index: number, direction: -1 | 1) => {
    const current = drafts[slug];
    if (!current) return;
    const target = index + direction;
    if (target < 0 || target >= current.blocks.length) return;
    const blocks = [...current.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    patch(slug, { blocks });
  };

  const handleSave = () => {
    if (!draft) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertContentPageAction({
        slug: draft.slug,
        title_pt: toNullable(draft.title_pt),
        title_en: toNullable(draft.title_en),
        subtitle_pt: toNullable(draft.subtitle_pt),
        subtitle_en: toNullable(draft.subtitle_en),
        image_url: toNullable(draft.image_url),
        cta_label_pt: toNullable(draft.cta_label_pt),
        cta_label_en: toNullable(draft.cta_label_en),
        cta_url: toNullable(draft.cta_url),
        is_active: draft.is_active,
        blocks: draft.blocks.map((block) => ({
          id: block.id,
          title_pt: toNullable(block.title_pt),
          title_en: toNullable(block.title_en),
          subtitle_pt: toNullable(block.subtitle_pt),
          subtitle_en: toNullable(block.subtitle_en),
          text_pt: toNullable(block.text_pt),
          text_en: toNullable(block.text_en),
          image_url: toNullable(block.image_url),
          button_label_pt: toNullable(block.button_label_pt),
          button_label_en: toNullable(block.button_label_en),
          button_url: toNullable(block.button_url),
        })),
      });

      if (result.success) {
        setFeedback({ slug: draft.slug, success: true, message: t("saved") });
        patch(draft.slug, { isCustomized: true, updated_at: new Date().toISOString() });
        router.refresh();
      } else {
        setFeedback({
          slug: draft.slug,
          success: false,
          message: result.message ?? t("saveError"),
        });
      }
    });
  };

  if (!draft) return null;

  const updatedLabel = draft.updated_at
    ? t("updatedAt", {
        date: new Date(draft.updated_at).toLocaleDateString(locale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {CONTENT_PAGE_SLUGS.map((slug) => {
          const page = drafts[slug];
          const active = slug === activeSlug;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => {
                setActiveSlug(slug);
                setFeedback(null);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-surface text-text-secondary hover:border-primary/30 hover:text-text"
              )}
            >
              <FileText size={16} />
              {tabLabel[slug]}
              {page?.isCustomized && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={draft.isCustomized ? "soft" : "neutral"}>
          {draft.isCustomized ? t("statusCustom") : t("statusDefault")}
        </Badge>
        {updatedLabel && (
          <span className="text-xs text-text-secondary">{updatedLabel}</span>
        )}
      </div>

      {!draft.isCustomized && (
        <Callout variant="info">{t("defaultNotice")}</Callout>
      )}

      <Card className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text">{t("sectionHeader")}</h2>
          <p className="text-sm text-text-secondary">{t("headerHint")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("titlePt")}</label>
            <Input
              value={draft.title_pt}
              onChange={(e) => patch(draft.slug, { title_pt: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("titleEn")}</label>
            <Input
              value={draft.title_en}
              onChange={(e) => patch(draft.slug, { title_en: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("subtitlePt")}</label>
            <Input
              value={draft.subtitle_pt}
              onChange={(e) => patch(draft.slug, { subtitle_pt: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("subtitleEn")}</label>
            <Input
              value={draft.subtitle_en}
              onChange={(e) => patch(draft.slug, { subtitle_en: e.target.value })}
            />
          </div>
        </div>

        <ProductImageField
          value={draft.image_url}
          onChange={(url) => patch(draft.slug, { image_url: url })}
        />

        <div className="space-y-4 rounded-xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {t("pageButton")}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("buttonTitlePt")}
              </label>
              <Input
                value={draft.cta_label_pt}
                onChange={(e) => patch(draft.slug, { cta_label_pt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("buttonTitleEn")}
              </label>
              <Input
                value={draft.cta_label_en}
                onChange={(e) => patch(draft.slug, { cta_label_en: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("buttonUrl")}</label>
            <Input
              value={draft.cta_url}
              onChange={(e) => patch(draft.slug, { cta_url: e.target.value })}
              placeholder="https://... ou /pt-BR/planos"
            />
          </div>
          <p className="text-xs text-text-secondary">{t("ctaHint")}</p>
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => patch(draft.slug, { is_active: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
          />
          <span className="text-sm text-text">{t("active")}</span>
        </label>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
              <Layers size={18} className="text-primary" />
              {t("sectionBlocks")}
            </h2>
            <p className="text-sm text-text-secondary">{t("blocksHint")}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => addBlock(draft.slug)}>
            <Plus size={16} className="mr-2" />
            {t("addBlock")}
          </Button>
        </div>

        {draft.blocks.length === 0 ? (
          <EmptyState
            className="py-12"
            icon={<Layers size={32} className="text-text-secondary" />}
            title={t("emptyBlocks")}
            description={t("emptyBlocksDesc")}
          />
        ) : (
          <div className="space-y-3">
            {draft.blocks.map((block, index) => (
              <BlockEditor
                key={block.id}
                block={block}
                index={index}
                total={draft.blocks.length}
                onChange={(next) => updateBlock(draft.slug, index, next)}
                onMove={(direction) => moveBlock(draft.slug, index, direction)}
                onRemove={() => removeBlock(draft.slug, index)}
              />
            ))}
          </div>
        )}
      </Card>

      <div className="sticky bottom-4 z-10">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[20px]">
            {feedback && feedback.slug === draft.slug && (
              <p
                className={cn(
                  "text-sm font-medium",
                  feedback.success ? "text-primary" : "text-text"
                )}
              >
                {feedback.message}
              </p>
            )}
          </div>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            {isPending ? tCommon("loading") : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdminContentPagesClient;
