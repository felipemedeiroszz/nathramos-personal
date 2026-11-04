"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Eye,
  FileText,
  Globe2,
  HelpCircle,
  ImagePlus,
  Layers,
  Link2,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ProductImageField } from "@/components/admin/content/ProductImageField";
import { ContentPageView } from "@/components/shared/ContentPageView";
import { upsertContentPageAction } from "@/app/actions/content";
import {
  CONTENT_PAGE_SLUGS,
  upsertContentPageSchema,
  type ContentPageSlugT,
} from "@/schemas/contentPages";
import {
  DEFAULT_CONTENT_PAGES,
  resolveContentPage,
} from "@/lib/content/contentPages";
import { contentHref } from "@/lib/content/links";
import { useAsyncTransition } from "@/hooks/useAsyncTransition";
import type { ContentPageRow } from "@/types";
import "./content-editor.css";

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
const EMPTY_BLOCK = {
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
const newId = () => crypto.randomUUID();
const snapshot = (page: ContentPageEditorData) =>
  JSON.stringify([
    page.slug,
    page.title_pt,
    page.title_en,
    page.subtitle_pt,
    page.subtitle_en,
    page.image_url,
    page.cta_label_pt,
    page.cta_label_en,
    page.cta_url,
    page.is_active,
    page.blocks.map((block) => [
      block.id,
      block.title_pt,
      block.title_en,
      block.subtitle_pt,
      block.subtitle_en,
      block.text_pt,
      block.text_en,
      block.image_url,
      block.button_label_pt,
      block.button_label_en,
      block.button_url,
    ]),
  ]);

function Field({
  label,
  value,
  onChange,
  multiline,
  hint,
  maxLength = 300,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  const id = useId();
  const Control = multiline ? Textarea : Input;
  return (
    <div className="pages-field">
      <div className="pages-field-label">
        <label htmlFor={id}>{label}</label>
        {multiline && (
          <span>
            {value.length.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        )}
      </div>
      <Control
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={multiline ? "min-h-[190px]" : undefined}
      />
      {hint && <p id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}

export function AdminContentPagesClient({
  pages,
}: {
  pages: ContentPageEditorData[];
}) {
  const locale = useLocale(),
    en = locale === "en-US";
  const l = (pt: string, english: string) => (en ? english : pt);
  const router = useRouter();
  const [pending, run] = useAsyncTransition();
  const [activeSlug, setActiveSlug] = useState<ContentPageSlugT>(
    pages[0]?.slug ?? "termos",
  );
  const [drafts, setDrafts] = useState<Record<string, ContentPageEditorData>>(
    () => Object.fromEntries(pages.map((page) => [page.slug, page])),
  );
  const [baselines, setBaselines] = useState<Record<string, string>>(() =>
    Object.fromEntries(pages.map((page) => [page.slug, snapshot(page)])),
  );
  const baselineRef = useRef(baselines);
  baselineRef.current = baselines;
  const [language, setLanguage] = useState<"pt" | "en">(en ? "en" : "pt");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const focusNewBlock = useRef<string | null>(null);
  useEffect(() => {
    if (!openBlock || focusNewBlock.current !== openBlock) return;
    focusNewBlock.current = null;
    document
      .getElementById(`block-${openBlock}`)
      ?.querySelector("input")
      ?.focus();
  }, [openBlock]);
  const [feedback, setFeedback] = useState<{
    slug: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [removed, setRemoved] = useState<{
    slug: string;
    block: ContentBlockEditorData;
    index: number;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const latestServer = useRef(pages);
  latestServer.current = pages;

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const page of pages)
        if (
          !current[page.slug] ||
          snapshot(current[page.slug]) === baselineRef.current[page.slug]
        )
          next[page.slug] = page;
      return next;
    });
    setBaselines((current) =>
      Object.fromEntries(
        pages.map((page) => [
          page.slug,
          current[page.slug] === undefined
            ? snapshot(page)
            : current[page.slug],
        ]),
      ),
    );
  }, [pages]);
  // Adopt incoming snapshots only after the local form has accepted them.
  useEffect(() => {
    setBaselines((current) => {
      let changed = false;
      const next = { ...current };
      for (const page of pages)
        if (
          drafts[page.slug] &&
          snapshot(drafts[page.slug]) === snapshot(page) &&
          next[page.slug] !== snapshot(page)
        ) {
          next[page.slug] = snapshot(page);
          changed = true;
        }
      return changed ? next : current;
    });
  }, [drafts, pages]);

  const anyDirty = Object.values(drafts).some(
    (page) => snapshot(page) !== baselines[page.slug],
  );
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);

  const draft = drafts[activeSlug];
  if (!draft) return null;
  const dirty = snapshot(draft) !== baselines[activeSlug];
  const labels = {
    termos: l("Termos de uso", "Terms of service"),
    privacidade: l("Privacidade", "Privacy"),
    faq: l("Perguntas frequentes", "Frequently asked questions"),
  };
  const descriptions = {
    termos: l("Regras e condições de uso", "Rules and terms of use"),
    privacidade: l("Dados e transparência", "Data and transparency"),
    faq: l("Respostas para o seu público", "Answers for your audience"),
  };
  const icons = { termos: FileText, privacidade: ShieldCheck, faq: HelpCircle };
  const ActiveIcon = icons[activeSlug];
  const patch = (values: Partial<ContentPageEditorData>) => {
    setDrafts((current) => ({
      ...current,
      [activeSlug]: { ...current[activeSlug], ...values },
    }));
    setFeedback(null);
    setConfirmReset(false);
  };
  const patchBlock = (id: string, values: Partial<ContentBlockEditorData>) =>
    patch({
      blocks: draft.blocks.map((block) =>
        block.id === id ? { ...block, ...values } : block,
      ),
    });
  const addBlock = () => {
    const block = { id: newId(), ...EMPTY_BLOCK };
    focusNewBlock.current = block.id;
    patch({ blocks: [...draft.blocks, block] });
    setOpenBlock(block.id);
  };
  const moveBlock = (index: number, direction: number) => {
    const blocks = [...draft.blocks];
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    patch({ blocks });
  };
  const duplicateBlock = (index: number) => {
    const block = { ...draft.blocks[index], id: newId() };
    const blocks = [...draft.blocks];
    blocks.splice(index + 1, 0, block);
    patch({ blocks });
    setOpenBlock(block.id);
  };
  const restoreRemoved = () => {
    if (!removed || removed.slug !== activeSlug) return;
    const blocks = [...draft.blocks];
    blocks.splice(Math.min(removed.index, blocks.length), 0, removed.block);
    patch({ blocks });
    setOpenBlock(removed.block.id);
    setRemoved(null);
  };
  const reset = () => {
    const server = latestServer.current.find(
      (page) => page.slug === activeSlug,
    );
    if (server) {
      setDrafts((current) => ({ ...current, [activeSlug]: server }));
      setBaselines((current) => ({
        ...current,
        [activeSlug]: snapshot(server),
      }));
    }
    setConfirmReset(false);
    setRemoved(null);
    setFeedback(null);
  };
  const handleSave = () => {
    void run(async () => {
      setFeedback(null);
      const parsed = upsertContentPageSchema.safeParse(draft);
      if (!parsed.success) {
        setFeedback({
          slug: activeSlug,
          success: false,
          message: parsed.error.issues[0].message,
        });
        return;
      }
      if (
        (draft.cta_url && !contentHref(draft.cta_url, locale)) ||
        draft.blocks.some(
          (block) => block.button_url && !contentHref(block.button_url, locale),
        )
      ) {
        setFeedback({
          slug: activeSlug,
          success: false,
          message: l(
            "Revise os links. Use https://, mailto:, tel: ou um caminho do site, como /planos.",
            "Review the links. Use https://, mailto:, tel: or a site path such as /planos.",
          ),
        });
        return;
      }
      try {
        const result = await upsertContentPageAction(parsed.data);
        if (!result.success) {
          setFeedback({
            slug: activeSlug,
            success: false,
            message:
              result.message ||
              l(
                "Não foi possível salvar. Seu rascunho foi preservado.",
                "Could not save. Your draft has been preserved.",
              ),
          });
          return;
        }
        const row = result.data;
        const saved: ContentPageEditorData = {
          ...draft,
          title_pt: row.title_pt ?? "",
          title_en: row.title_en ?? "",
          subtitle_pt: row.subtitle_pt ?? "",
          subtitle_en: row.subtitle_en ?? "",
          image_url: row.image_url ?? "",
          cta_label_pt: row.cta_label_pt ?? "",
          cta_label_en: row.cta_label_en ?? "",
          cta_url: row.cta_url ?? "",
          is_active: row.is_active,
          blocks: row.blocks.map(
            (block) =>
              ({
                ...EMPTY_BLOCK,
                ...Object.fromEntries(
                  Object.entries(block).filter(([, value]) => value !== null),
                ),
              }) as ContentBlockEditorData,
          ),
          isCustomized: true,
          updated_at: row.updated_at,
        };
        setDrafts((current) => ({ ...current, [draft.slug]: saved }));
        setBaselines((current) => ({
          ...current,
          [draft.slug]: snapshot(saved),
        }));
        setFeedback({
          slug: draft.slug,
          success: true,
          message: l(
            "Alterações publicadas com sucesso.",
            "Changes published successfully.",
          ),
        });
        setRemoved(null);
        router.refresh();
      } catch {
        setFeedback({
          slug: activeSlug,
          success: false,
          message: l(
            "Falha de conexão. Seu rascunho está aqui; tente salvar novamente.",
            "Connection failed. Your draft is still here; try saving again.",
          ),
        });
      }
    });
  };

  const previewLocale = language === "pt" ? "pt-BR" : "en-US";
  const preview = resolveContentPage(
    draft as unknown as ContentPageRow,
    DEFAULT_CONTENT_PAGES[activeSlug],
    previewLocale,
  );
  const translated = draft.blocks.filter((block) =>
    language === "pt"
      ? block.title_pt.trim() && block.text_pt.trim()
      : block.title_en.trim() && block.text_en.trim(),
  ).length;
  const titleKey = `title_${language}` as const,
    subtitleKey = `subtitle_${language}` as const;

  return (
    <div
      className="pages-studio"
      data-panel-editing={anyDirty}
      aria-busy={pending}
    >
      <div
        className="pages-library"
        aria-label={l("Páginas do site", "Website pages")}
      >
        {CONTENT_PAGE_SLUGS.map((slug) => {
          const Icon = icons[slug];
          const page = drafts[slug];
          const changed = page && snapshot(page) !== baselines[slug];
          return (
            <button
              key={slug}
              type="button"
              aria-pressed={slug === activeSlug}
              disabled={pending}
              onClick={() => {
                setActiveSlug(slug);
                setOpenBlock(null);
                setConfirmReset(false);
              }}
            >
              <div className="pages-library-top">
                <span className="pages-library-icon">
                  <Icon size={19} />
                </span>
                <span
                  className={`pages-status-dot ${changed ? "is-draft" : ""}`}
                >
                  {changed
                    ? l("Não salvo", "Unsaved")
                    : l("No site", "On site")}
                </span>
              </div>
              <strong>{labels[slug]}</strong>
              <p>{descriptions[slug]}</p>
              <div className="pages-library-route">
                <span>/{slug}</span>
                <span>
                  {page?.blocks.length ?? 0} {l("blocos", "blocks")}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pages-workspace-heading">
        <div className="pages-workspace-title">
          <ActiveIcon size={20} />
          <div>
            <h2>{labels[activeSlug]}</h2>
            <a
              href={`/${previewLocale}/${activeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              /{previewLocale}/{activeSlug}
              <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
        <div
          className="pages-view-switch"
          aria-label={l("Modo de visualização", "View mode")}
        >
          <button
            type="button"
            aria-pressed={mode === "edit"}
            onClick={() => setMode("edit")}
          >
            <Pencil size={14} />
            {l("Editar", "Edit")}
          </button>
          <button
            type="button"
            aria-pressed={mode === "preview"}
            onClick={() => setMode("preview")}
          >
            <Eye size={15} />
            {l("Prévia", "Preview")}
          </button>
        </div>
      </div>

      <div className="pages-workspace">
        <div className="pages-editor-main">
          <div className="pages-language-toolbar">
            <div>
              <Globe2 size={15} />
              <span>{l("Idioma do conteúdo", "Content language")}</span>
            </div>
            <div className="pages-language-switch">
              <button
                type="button"
                aria-pressed={language === "pt"}
                onClick={() => setLanguage("pt")}
              >
                Português <span>BR</span>
              </button>
              <button
                type="button"
                aria-pressed={language === "en"}
                onClick={() => setLanguage("en")}
              >
                English <span>EN</span>
              </button>
            </div>
          </div>
          {mode === "preview" ? (
            <div className="pages-preview-panel">
              <div className="pages-preview-toolbar">
                <span>
                  {l(
                    "Prévia do rascunho • sem publicar",
                    "Draft preview • not published",
                  )}
                </span>
                <div>
                  <button
                    type="button"
                    aria-label="Desktop"
                    aria-pressed={!mobilePreview}
                    onClick={() => setMobilePreview(false)}
                  >
                    <Monitor size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label={l("Celular", "Mobile")}
                    aria-pressed={mobilePreview}
                    onClick={() => setMobilePreview(true)}
                  >
                    <Smartphone size={17} />
                  </button>
                </div>
              </div>
              <div
                className={`pages-preview-canvas ${mobilePreview ? "is-mobile" : ""}`}
              >
                <ContentPageView
                  key={`${activeSlug}-${previewLocale}`}
                  embedded
                  page={preview}
                  variant={activeSlug === "faq" ? "faq" : "blocks"}
                  locale={previewLocale}
                />
              </div>
            </div>
          ) : (
            <fieldset disabled={pending} className="pages-editor-fields">
              <section className="pages-editor-card">
                <header>
                  <span className="pages-section-icon">
                    <FileText size={17} />
                  </span>
                  <div>
                    <h3>{l("Apresentação da página", "Page introduction")}</h3>
                    <p>
                      {l(
                        "O primeiro contato de quem visita o site.",
                        "The first thing your visitors see.",
                      )}
                    </p>
                  </div>
                  <span className="pages-section-step">01</span>
                </header>
                <div className="pages-card-body">
                  <Field
                    label={l("Título da página", "Page title")}
                    value={draft[titleKey]}
                    onChange={(value) => patch({ [titleKey]: value })}
                    placeholder={labels[activeSlug]}
                  />
                  <Field
                    label={l("Descrição de abertura", "Opening description")}
                    value={draft[subtitleKey]}
                    onChange={(value) => patch({ [subtitleKey]: value })}
                    hint={l(
                      "Uma frase curta para apresentar o conteúdo. Opcional.",
                      "A short introduction to the content. Optional.",
                    )}
                  />
                  <details className="pages-advanced">
                    <summary>
                      <ImagePlus size={15} />
                      {l("Imagem de capa e botão", "Cover image and button")}
                      <ChevronDown size={14} />
                    </summary>
                    <div>
                      <ProductImageField
                        value={draft.image_url}
                        onChange={(image_url) => patch({ image_url })}
                      />
                      <div className="pages-two-fields">
                        <Field
                          label={l("Texto do botão", "Button text")}
                          maxLength={120}
                          value={draft[`cta_label_${language}`]}
                          onChange={(value) =>
                            patch({ [`cta_label_${language}`]: value })
                          }
                        />
                        <Field
                          label={l("Destino do botão", "Button destination")}
                          maxLength={800}
                          value={draft.cta_url}
                          onChange={(cta_url) => patch({ cta_url })}
                          placeholder="/planos"
                        />
                      </div>
                      <p className="pages-hint">
                        {l(
                          "O botão só aparece quando texto e destino estão preenchidos.",
                          "The button appears when both text and destination are filled in.",
                        )}
                      </p>
                    </div>
                  </details>
                </div>
              </section>

              <section className="pages-editor-card">
                <header>
                  <span className="pages-section-icon">
                    <Layers size={17} />
                  </span>
                  <div>
                    <h3>
                      {activeSlug === "faq"
                        ? l("Perguntas e respostas", "Questions and answers")
                        : l("Seções do conteúdo", "Content sections")}
                    </h3>
                    <p>
                      {activeSlug === "faq"
                        ? l(
                            "Organize as dúvidas por assunto.",
                            "Organize questions by topic.",
                          )
                        : l(
                            "Edite e organize a ordem de leitura.",
                            "Edit and organize the reading order.",
                          )}
                    </p>
                  </div>
                  <span className="pages-section-step">02</span>
                </header>
                <div className="pages-card-body">
                  <div className="pages-blocks-toolbar">
                    <span>
                      {draft.blocks.length}{" "}
                      {l("blocos de conteúdo", "content blocks")}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={draft.blocks.length >= 80}
                      onClick={addBlock}
                    >
                      <Plus size={14} />
                      {l("Adicionar bloco", "Add block")}
                    </Button>
                  </div>
                  {removed?.slug === activeSlug && (
                    <div className="pages-undo" role="status">
                      <span>
                        {l(
                          "Bloco removido do rascunho.",
                          "Block removed from draft.",
                        )}
                      </span>
                      <button type="button" onClick={restoreRemoved}>
                        <RotateCcw size={13} />
                        {l("Desfazer", "Undo")}
                      </button>
                    </div>
                  )}
                  {draft.blocks.length === 0 ? (
                    <div className="pages-blocks-empty">
                      <Layers size={28} />
                      <h4>
                        {l(
                          "Comece pelo primeiro bloco",
                          "Start with your first block",
                        )}
                      </h4>
                      <p>
                        {l(
                          "Adicione um título e o conteúdo da seção.",
                          "Add a heading and the section content.",
                        )}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={addBlock}
                      >
                        <Plus size={14} />
                        {l("Criar primeiro bloco", "Create first block")}
                      </Button>
                    </div>
                  ) : (
                    <div className="pages-blocks">
                      {draft.blocks.map((block, index) => {
                        const open = openBlock === block.id;
                        const blockTitle =
                          block[titleKey] || block.title_pt || block.title_en;
                        return (
                          <div
                            className="pages-block"
                            key={block.id}
                            data-open={open}
                          >
                            <div className="pages-block-heading">
                              <button
                                type="button"
                                className="pages-block-toggle"
                                onClick={() =>
                                  setOpenBlock(open ? null : block.id)
                                }
                                aria-expanded={open}
                                aria-controls={`block-${block.id}`}
                              >
                                <span className="pages-block-number">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <span>
                                  <strong>
                                    {blockTitle ||
                                      l("Bloco sem título", "Untitled block")}
                                  </strong>
                                  <small>
                                    {block[subtitleKey] ||
                                      (block[`text_${language}`]
                                        ? `${block[`text_${language}`].length.toLocaleString()} ${l("caracteres", "characters")}`
                                        : l(
                                            "Adicione o conteúdo",
                                            "Add content",
                                          ))}
                                  </small>
                                </span>
                                <ChevronDown size={15} />
                              </button>
                              <div className="pages-block-actions">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => moveBlock(index, -1)}
                                  aria-label={l(
                                    `Mover bloco ${index + 1} para cima`,
                                    `Move block ${index + 1} up`,
                                  )}
                                  title={l("Mover para cima", "Move up")}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === draft.blocks.length - 1}
                                  onClick={() => moveBlock(index, 1)}
                                  aria-label={l(
                                    `Mover bloco ${index + 1} para baixo`,
                                    `Move block ${index + 1} down`,
                                  )}
                                  title={l("Mover para baixo", "Move down")}
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  disabled={draft.blocks.length >= 80}
                                  onClick={() => duplicateBlock(index)}
                                  aria-label={l(
                                    `Duplicar bloco ${index + 1}`,
                                    `Duplicate block ${index + 1}`,
                                  )}
                                  title={l("Duplicar", "Duplicate")}
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRemoved({
                                      slug: activeSlug,
                                      block,
                                      index,
                                    });
                                    patch({
                                      blocks: draft.blocks.filter(
                                        (item) => item.id !== block.id,
                                      ),
                                    });
                                  }}
                                  aria-label={l(
                                    `Remover bloco ${index + 1}`,
                                    `Remove block ${index + 1}`,
                                  )}
                                  title={l("Remover", "Remove")}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            {open && (
                              <div
                                id={`block-${block.id}`}
                                className="pages-block-fields"
                              >
                                <Field
                                  label={
                                    activeSlug === "faq"
                                      ? l("Pergunta", "Question")
                                      : l("Título da seção", "Section title")
                                  }
                                  value={block[titleKey]}
                                  onChange={(value) =>
                                    patchBlock(block.id, { [titleKey]: value })
                                  }
                                />
                                <Field
                                  label={
                                    activeSlug === "faq"
                                      ? l(
                                          "Assunto / categoria",
                                          "Topic / category",
                                        )
                                      : l("Subtítulo", "Subtitle")
                                  }
                                  value={block[subtitleKey]}
                                  onChange={(value) =>
                                    patchBlock(block.id, {
                                      [subtitleKey]: value,
                                    })
                                  }
                                  hint={
                                    activeSlug === "faq"
                                      ? l(
                                          "Perguntas com o mesmo assunto aparecem juntas no FAQ.",
                                          "Questions with the same topic are grouped in the FAQ.",
                                        )
                                      : undefined
                                  }
                                />
                                <Field
                                  label={
                                    activeSlug === "faq"
                                      ? l("Resposta", "Answer")
                                      : l("Texto da seção", "Section text")
                                  }
                                  value={block[`text_${language}`]}
                                  multiline
                                  maxLength={20000}
                                  onChange={(value) =>
                                    patchBlock(block.id, {
                                      [`text_${language}`]: value,
                                    })
                                  }
                                  hint={l(
                                    "Separe os parágrafos com uma linha em branco.",
                                    "Separate paragraphs with a blank line.",
                                  )}
                                />
                                <details className="pages-advanced">
                                  <summary>
                                    <Link2 size={14} />
                                    {l(
                                      "Imagem e link opcionais",
                                      "Optional image and link",
                                    )}
                                    <ChevronDown size={14} />
                                  </summary>
                                  <div>
                                    <ProductImageField
                                      value={block.image_url}
                                      onChange={(image_url) =>
                                        patchBlock(block.id, { image_url })
                                      }
                                    />
                                    <div className="pages-two-fields">
                                      <Field
                                        label={l(
                                          "Texto do botão",
                                          "Button text",
                                        )}
                                        value={
                                          block[`button_label_${language}`]
                                        }
                                        maxLength={120}
                                        onChange={(value) =>
                                          patchBlock(block.id, {
                                            [`button_label_${language}`]: value,
                                          })
                                        }
                                      />
                                      <Field
                                        label={l(
                                          "Destino do botão",
                                          "Button destination",
                                        )}
                                        value={block.button_url}
                                        maxLength={800}
                                        onChange={(button_url) =>
                                          patchBlock(block.id, { button_url })
                                        }
                                        placeholder="/planos"
                                      />
                                    </div>
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </fieldset>
          )}
        </div>

        <aside className="pages-publish-sidebar">
          <div className="pages-publish-card">
            <div className="pages-publish-heading">
              <Globe2 size={17} />
              <h3>{l("Publicação", "Publishing")}</h3>
            </div>
            <div
              className={`pages-publication-status ${dirty ? "has-changes" : ""}`}
            >
              <span />
              {dirty
                ? l("Alterações não publicadas", "Unpublished changes")
                : l("Tudo atualizado", "Everything is up to date")}
            </div>
            <p className="pages-publish-description">
              {l(
                "Revise a prévia antes de atualizar o que seus visitantes veem.",
                "Review the preview before updating what your visitors see.",
              )}
            </p>
            <label className="pages-publish-toggle">
              <span>
                <strong>{l("Conteúdo personalizado", "Custom content")}</strong>
                <small>
                  {l(
                    "Desativado: usa o conteúdo padrão.",
                    "Off: uses the default content.",
                  )}
                </small>
              </span>
              <input
                type="checkbox"
                checked={draft.is_active}
                disabled={pending}
                onChange={(event) => patch({ is_active: event.target.checked })}
              />
            </label>
            <div className="pages-publish-meta">
              <span>{l("Última publicação", "Last published")}</span>
              <strong>
                {draft.updated_at
                  ? new Date(draft.updated_at).toLocaleString(locale, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : l("Conteúdo padrão", "Default content")}
              </strong>
            </div>
            <Button
              type="button"
              className="pages-save-button"
              onClick={handleSave}
              disabled={pending || !dirty}
            >
              {pending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {pending
                ? l("Publicando…", "Publishing…")
                : l("Publicar alterações", "Publish changes")}
            </Button>
            <button
              type="button"
              className="pages-open-preview"
              onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
            >
              <Eye size={14} />
              {mode === "edit"
                ? l("Conferir prévia", "Review preview")
                : l("Voltar à edição", "Back to editing")}
            </button>
            {dirty && (
              <div className="pages-reset">
                {confirmReset ? (
                  <>
                    <p>
                      {l(
                        "Descartar as alterações desta página?",
                        "Discard changes to this page?",
                      )}
                    </p>
                    <div>
                      <button type="button" disabled={pending} onClick={reset}>
                        {l("Sim, descartar", "Yes, discard")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                      >
                        {l("Continuar editando", "Keep editing")}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmReset(true)}
                  >
                    <RotateCcw size={12} />
                    {l("Descartar alterações", "Discard changes")}
                  </button>
                )}
              </div>
            )}
            {feedback?.slug === activeSlug && (
              <div
                className={`pages-feedback ${feedback.success ? "is-success" : "is-error"}`}
                role={feedback.success ? "status" : "alert"}
              >
                {feedback.success && <Check size={16} />}
                {feedback.message}
              </div>
            )}
          </div>
          <div className="pages-writing-note">
            <span className="pages-small-label">
              {l("Checklist de conteúdo", "Content checklist")}
            </span>
            <div>
              <Check size={14} />
              <span>
                {l("Idioma selecionado", "Selected language")}:{" "}
                {language === "pt" ? "Português" : "English"}
              </span>
            </div>
            <div>
              <Layers size={14} />
              <span>
                {translated}/{draft.blocks.length}{" "}
                {l("blocos com título e texto", "blocks with heading and text")}
              </span>
            </div>
            <p>
              {l(
                "Título e texto podem usar o outro idioma como alternativa quando a tradução está vazia.",
                "Heading and text can fall back to the other language when a translation is empty.",
              )}
            </p>
          </div>
        </aside>
      </div>
      <div className="pages-mobile-actions">
        <span>
          {dirty
            ? l("Não publicado", "Unpublished")
            : l("Atualizado", "Up to date")}
        </span>
        <button
          type="button"
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
        >
          <Eye size={15} />
          {mode === "edit" ? l("Prévia", "Preview") : l("Editar", "Edit")}
        </button>
        <Button
          type="button"
          size="sm"
          disabled={pending || !dirty}
          onClick={handleSave}
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {l("Publicar", "Publish")}
        </Button>
      </div>
    </div>
  );
}

export default AdminContentPagesClient;
