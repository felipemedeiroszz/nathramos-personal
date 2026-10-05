"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
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
import type { WorkoutKitRow, WorkoutCategoryRow } from "@/types";
import { DIFFICULTY_LEVELS } from "@/types";

interface KitUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit?: WorkoutKitRow;
  categories?: WorkoutCategoryRow[];
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onSaved?: () => void;
  userId?: string;
}

function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DIFFICULTY_LABELS_PT: Record<string, string> = {
  beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado",
};
const DIFFICULTY_LABELS_EN: Record<string, string> = {
  beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
};

export function KitUpsertModal({
  isOpen,
  onClose,
  kit,
  categories = [],
  onSubmit,
  onSaved,
  userId,
}: KitUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);
  const difficultyLabels = locale === "pt-BR" ? DIFFICULTY_LABELS_PT : DIFFICULTY_LABELS_EN;

  const [form, setForm] = useState({
    id: kit?.id,
    category_id: kit?.category_id ?? ("" as string),
    name_pt: kit?.name_pt ?? "",
    name_en: kit?.name_en ?? "",
    slug: kit?.slug ?? "",
    description_pt: kit?.description_pt ?? "",
    description_en: kit?.description_en ?? "",
    short_desc_pt: kit?.short_desc_pt ?? "",
    short_desc_en: kit?.short_desc_en ?? "",
    difficulty: kit?.difficulty ?? DIFFICULTY_LEVELS[0],
    total_weeks: kit?.total_weeks ?? 4,
    days_per_week: kit?.days_per_week ?? 3,
    est_minutes_per_session: kit?.est_minutes_per_session ?? 45,
    cover_image_url: kit?.cover_image_url ?? "",
    tags: Array.isArray(kit?.tags) ? kit!.tags!.join(", ") : "",
    is_published: kit?.is_published ?? true,
    is_featured: kit?.is_featured ?? false,
  });

  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (kit) {
      setForm({
        id: kit.id,
        category_id: kit.category_id ?? "",
        name_pt: kit.name_pt ?? "",
        name_en: kit.name_en ?? "",
        slug: kit.slug ?? "",
        description_pt: kit.description_pt ?? "",
        description_en: kit.description_en ?? "",
        short_desc_pt: kit.short_desc_pt ?? "",
        short_desc_en: kit.short_desc_en ?? "",
        difficulty: kit.difficulty ?? DIFFICULTY_LEVELS[0],
        total_weeks: kit.total_weeks ?? 4,
        days_per_week: kit.days_per_week ?? 3,
        est_minutes_per_session: kit.est_minutes_per_session ?? 45,
        cover_image_url: kit.cover_image_url ?? "",
        tags: Array.isArray(kit.tags) ? kit.tags.join(", ") : "",
        is_published: kit.is_published ?? true,
        is_featured: kit.is_featured ?? false,
      });
      setSlugEdited(!!kit.slug);
    } else {
      setForm({
        id: undefined,
        category_id: "",
        name_pt: "",
        name_en: "",
        slug: "",
        description_pt: "",
        description_en: "",
        short_desc_pt: "",
        short_desc_en: "",
        difficulty: DIFFICULTY_LEVELS[0],
        total_weeks: 4,
        days_per_week: 3,
        est_minutes_per_session: 45,
        cover_image_url: "",
        tags: "",
        is_published: true,
        is_featured: false,
      });
      setSlugEdited(false);
    }
  }, [isOpen, kit]);

  useEffect(() => {
    if (slugEdited) return;
    const suggested = slugify(form.name_pt);
    if (form.slug !== suggested) {
      setForm((prev) => ({ ...prev, slug: suggested }));
    }
  }, [form.name_pt, slugEdited, form.slug]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const suggestSlug = () => {
    const suggested = slugify(form.name_pt || form.name_en);
    setForm((prev) => ({ ...prev, slug: suggested }));
    setSlugEdited(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload: Record<string, any> = {
        ...form,
        category_id: form.category_id || null,
        tags: form.tags
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        cover_image_url: form.cover_image_url || null,
      };
      if (!payload.id) delete payload.id;
      if (onSubmit) await onSubmit(payload);
      onSaved?.();
    });
  };

  const titleCreate = label("Criar Kit de Treinos", "Create Workout Kit");
  const titleEdit = label("Editar Kit de Treinos", "Edit Workout Kit");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{kit ? titleEdit : titleCreate}</ModalTitle>
        <ModalClose onClick={onClose} />
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Nome (PT)", "Name (PT)")}
              </label>
              <Input
                value={form.name_pt}
                onChange={(e) => update("name_pt", e.target.value)}
                placeholder={label(
                  "Kit Transformacao 12 semanas",
                  "Transformation Kit 12 weeks"
                )}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Nome (EN)", "Name (EN)")}
              </label>
              <Input
                value={form.name_en}
                onChange={(e) => update("name_en", e.target.value)}
                placeholder={label(
                  "Kit Transformacao 12 semanas",
                  "Transformation Kit 12 weeks"
                )}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text">
                {label("Slug", "Slug")}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={suggestSlug}
                className="h-8 text-xs"
              >
                <Sparkles size={14} className="mr-1.5" />
                {label("Sugerir", "Suggest")}
              </Button>
            </div>
            <Input
              value={form.slug}
              onChange={(e) => {
                update("slug", e.target.value);
                setSlugEdited(true);
              }}
              placeholder="transformacao-12-semanas"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Categoria", "Category")}
              </label>
              <Select
                value={form.category_id}
                onChange={(e) => update("category_id", e.target.value)}
              >
                <option value="">-- {label("Selecione", "Select")} --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "pt-BR" ? c.name_pt : c.name_en}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Dificuldade", "Difficulty")}
              </label>
              <Select
                value={form.difficulty}
                onChange={(e) => update("difficulty", e.target.value)}
                required
              >
                {DIFFICULTY_LEVELS.map((d) => (
                  <option key={d} value={d}>
                    {difficultyLabels[d] ?? d}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Descricao Curta (PT)", "Short Description (PT)")}
              </label>
              <Textarea
                value={form.short_desc_pt}
                onChange={(e) => update("short_desc_pt", e.target.value)}
                rows={2}
                placeholder={label(
                  "Pacote completo com 3 programas...",
                  "Complete package with 3 programs..."
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Descricao Curta (EN)", "Short Description (EN)")}
              </label>
              <Textarea
                value={form.short_desc_en}
                onChange={(e) => update("short_desc_en", e.target.value)}
                rows={2}
                placeholder={label(
                  "Pacote completo com 3 programas...",
                  "Complete package with 3 programs..."
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Descricao (PT)", "Description (PT)")}
              </label>
              <Textarea
                value={form.description_pt}
                onChange={(e) => update("description_pt", e.target.value)}
                rows={3}
                placeholder={label(
                  "Kit completo para transformacao corporal...",
                  "Complete kit for body transformation..."
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Descricao (EN)", "Description (EN)")}
              </label>
              <Textarea
                value={form.description_en}
                onChange={(e) => update("description_en", e.target.value)}
                rows={3}
                placeholder={label(
                  "Kit completo para transformacao corporal...",
                  "Complete kit for body transformation..."
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Semanas", "Weeks")}
              </label>
              <Input
                type="number"
                min={1}
                max={52}
                value={form.total_weeks}
                onChange={(e) =>
                  update("total_weeks", parseInt(e.target.value || "1", 10))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Dias/Semana", "Days/Week")}
              </label>
              <Input
                type="number"
                min={1}
                max={7}
                value={form.days_per_week}
                onChange={(e) =>
                  update("days_per_week", parseInt(e.target.value || "1", 10))
                }
                required
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-text">
                {label("Min/Sessao (estimado)", "Min/Session (est.)")}
              </label>
              <Input
                type="number"
                min={1}
                value={form.est_minutes_per_session}
                onChange={(e) =>
                  update(
                    "est_minutes_per_session",
                    parseInt(e.target.value || "1", 10)
                  )
                }
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Capa URL", "Cover URL")}
            </label>
            <Input
              type="url"
              value={form.cover_image_url}
              onChange={(e) => update("cover_image_url", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Tags (virgula)", "Tags (comma)")}
            </label>
            <Input
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder={label(
                "transformacao, emagrecimento, 12semanas",
                "transformation, fat-loss, 12weeks"
              )}
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
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
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => update("is_featured", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-text">
                {label("Em destaque", "Featured")}
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

export default KitUpsertModal;
