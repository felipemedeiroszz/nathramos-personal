"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/Input";
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
import type { WorkoutCategoryRow } from "@/types";

interface CategoryUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: WorkoutCategoryRow;
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

export function CategoryUpsertModal({
  isOpen,
  onClose,
  category,
  onSubmit,
  onSaved,
  userId,
}: CategoryUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [form, setForm] = useState({
    id: category?.id,
    name_pt: category?.name_pt ?? "",
    name_en: category?.name_en ?? "",
    slug: category?.slug ?? "",
    description_pt: category?.description_pt ?? "",
    description_en: category?.description_en ?? "",
    icon_lucide: category?.icon_lucide ?? "",
    color_hex: category?.color_hex ?? "#EAB308",
    order_index: category?.order_index ?? 0,
    is_active: category?.is_active ?? true,
  });

  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (category) {
      setForm({
        id: category.id,
        name_pt: category.name_pt ?? "",
        name_en: category.name_en ?? "",
        slug: category.slug ?? "",
        description_pt: category.description_pt ?? "",
        description_en: category.description_en ?? "",
        icon_lucide: category.icon_lucide ?? "",
        color_hex: category.color_hex ?? "#EAB308",
        order_index: category.order_index ?? 0,
        is_active: category.is_active ?? true,
      });
      setSlugEdited(!!category.slug);
    } else {
      setForm({
        id: undefined,
        name_pt: "",
        name_en: "",
        slug: "",
        description_pt: "",
        description_en: "",
        icon_lucide: "",
        color_hex: "#EAB308",
        order_index: 0,
        is_active: true,
      });
      setSlugEdited(false);
    }
  }, [isOpen, category]);

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
        icon_lucide: form.icon_lucide || null,
        color_hex: form.color_hex || null,
      };
      if (!payload.id) delete payload.id;
      if (onSubmit) await onSubmit(payload);
      onSaved?.();
    });
  };

  const titleCreate = label("Criar Categoria", "Create Category");
  const titleEdit = label("Editar Categoria", "Edit Category");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{category ? titleEdit : titleCreate}</ModalTitle>
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
                placeholder={label("Hipertrofia", "Hypertrophy")}
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
                placeholder={label("Hipertrofia", "Hypertrophy")}
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
              placeholder="hipertrofia-iniciante"
              required
            />
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
                  "Treinos focados no ganho de massa muscular...",
                  "Workouts focused on muscle mass gain..."
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
                  "Treinos focados no ganho de massa muscular...",
                  "Workouts focused on muscle mass gain..."
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Icone Lucide", "Lucide Icon")}
              </label>
              <Input
                value={form.icon_lucide}
                onChange={(e) => update("icon_lucide", e.target.value)}
                placeholder="Dumbbell, Flame, Target..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Cor (hex)", "Color (hex)")}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={form.color_hex}
                  onChange={(e) => update("color_hex", e.target.value)}
                  className="w-14 p-1 shrink-0 cursor-pointer"
                />
                <Input
                  value={form.color_hex}
                  onChange={(e) => update("color_hex", e.target.value)}
                  placeholder="#EAB308"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Ordem", "Order")}
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.order_index}
                onChange={(e) =>
                  update("order_index", parseInt(e.target.value || "0", 10))
                }
              />
            </div>
          </div>

          <div className="flex gap-6 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update("is_active", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-text">
                {label("Ativa", "Active")}
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

export default CategoryUpsertModal;
