"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import type { EbookRow } from "@/types";

interface EbookUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  ebook?: EbookRow;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onSaved?: () => void;
}

const LANGUAGES = [
  { value: "pt-BR", labelPt: "Português", labelEn: "Portuguese" },
  { value: "en-US", labelPt: "Inglês", labelEn: "English" },
];

export function EbookUpsertModal({
  isOpen,
  onClose,
  ebook,
  onSubmit,
  onSaved,
}: EbookUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [form, setForm] = useState({
    id: ebook?.id,
    title_pt: ebook?.title_pt ?? "",
    title_en: ebook?.title_en ?? "",
    slug: ebook?.slug ?? "",
    summary_pt: ebook?.summary_pt ?? "",
    summary_en: ebook?.summary_en ?? "",
    cover_url: ebook?.cover_url ?? "",
    file_bucket_path: ebook?.file_bucket_path ?? "",
    pages_count: ebook?.pages_count ?? "",
    language: ebook?.language ?? "pt-BR",
    is_free: ebook?.is_free ?? false,
    is_published: ebook?.is_published ?? false,
    author: ebook?.author ?? "",
    categories_pt: Array.isArray(ebook?.categories_pt) ? ebook!.categories_pt!.join(", ") : "",
    categories_en: Array.isArray(ebook?.categories_en) ? ebook!.categories_en!.join(", ") : "",
  });

  useEffect(() => {
    if (!isOpen) return;
    if (ebook) {
      setForm({
        id: ebook.id,
        title_pt: ebook.title_pt ?? "",
        title_en: ebook.title_en ?? "",
        slug: ebook.slug ?? "",
        summary_pt: ebook.summary_pt ?? "",
        summary_en: ebook.summary_en ?? "",
        cover_url: ebook.cover_url ?? "",
        file_bucket_path: ebook.file_bucket_path ?? "",
        pages_count: ebook.pages_count ?? "",
        language: ebook.language ?? "pt-BR",
        is_free: ebook.is_free ?? false,
        is_published: ebook.is_published ?? false,
        author: ebook.author ?? "",
        categories_pt: Array.isArray(ebook.categories_pt) ? ebook.categories_pt.join(", ") : "",
        categories_en: Array.isArray(ebook.categories_en) ? ebook.categories_en.join(", ") : "",
      });
    } else {
      setForm({
        id: undefined,
        title_pt: "",
        title_en: "",
        slug: "",
        summary_pt: "",
        summary_en: "",
        cover_url: "",
        file_bucket_path: "",
        pages_count: "",
        language: "pt-BR",
        is_free: false,
        is_published: false,
        author: "",
        categories_pt: "",
        categories_en: "",
      });
    }
  }, [isOpen, ebook]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const splitArr = (s: string) =>
        s.split(",").map((x: string) => x.trim()).filter(Boolean);
      const payload: Record<string, any> = {
        ...form,
        cover_url: form.cover_url || null,
        file_bucket_path: form.file_bucket_path || null,
        pages_count: form.pages_count ? parseInt(String(form.pages_count), 10) : null,
        author: form.author || null,
        categories_pt: splitArr(form.categories_pt),
        categories_en: splitArr(form.categories_en),
      };
      if (!payload.id) delete payload.id;
      if (onSubmit) await onSubmit(payload);
      onSaved?.();
    });
  };

  const titleCreate = label("Criar E-book", "Create E-book");
  const titleEdit = label("Editar E-book", "Edit E-book");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{ebook ? titleEdit : titleCreate}</ModalTitle>
        <ModalClose onClick={onClose} />
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Título (PT)", "Title (PT)")}
              </label>
              <Input
                value={form.title_pt}
                onChange={(e) => update("title_pt", e.target.value)}
                placeholder={label("Guia de Nutrição", "Nutrition Guide")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Título (EN)", "Title (EN)")}
              </label>
              <Input
                value={form.title_en}
                onChange={(e) => update("title_en", e.target.value)}
                placeholder={label("Guia de Nutrição", "Nutrition Guide")}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Slug", "Slug")}
              </label>
              <Input
                value={form.slug}
                onChange={(e) => update("slug", e.target.value)}
                placeholder="guia-nutricao"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Autor", "Author")}
              </label>
              <Input
                value={form.author}
                onChange={(e) => update("author", e.target.value)}
                placeholder="Nath Ramos"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Resumo (PT)", "Summary (PT)")}
              </label>
              <Textarea
                value={form.summary_pt}
                onChange={(e) => update("summary_pt", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Resumo (EN)", "Summary (EN)")}
              </label>
              <Textarea
                value={form.summary_en}
                onChange={(e) => update("summary_en", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Idioma", "Language")}
              </label>
              <Select
                value={form.language}
                onChange={(e) => update("language", e.target.value)}
                required
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {locale === "pt-BR" ? l.labelPt : l.labelEn}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Páginas", "Pages")}
              </label>
              <Input
                type="number"
                min={0}
                value={form.pages_count}
                onChange={(e) => update("pages_count", e.target.value)}
                placeholder="120"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Arquivo (caminho)", "File (path)")}
              </label>
              <Input
                value={form.file_bucket_path}
                onChange={(e) => update("file_bucket_path", e.target.value)}
                placeholder="ebooks/guia.pdf"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Capa URL", "Cover URL")}
            </label>
            <Input
              type="url"
              value={form.cover_url}
              onChange={(e) => update("cover_url", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Categorias (PT)", "Categories (PT)")}
              </label>
              <Input
                value={form.categories_pt}
                onChange={(e) => update("categories_pt", e.target.value)}
                placeholder={label("nutricao, treino", "nutrition, training")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Categorias (EN)", "Categories (EN)")}
              </label>
              <Input
                value={form.categories_en}
                onChange={(e) => update("categories_en", e.target.value)}
                placeholder={label("nutrition, training", "nutrition, training")}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_free}
                onChange={(e) => update("is_free", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-text">
                {label("E-book gratuito", "Free e-book")}
              </span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => update("is_published", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-text">
                {label("Publicado", "Published")}
              </span>
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("loading") : t("save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default EbookUpsertModal;
