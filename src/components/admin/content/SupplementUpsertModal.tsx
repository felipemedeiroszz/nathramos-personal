"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import type { SupplementRow } from "@/types";
import { ProductImageField } from "@/components/admin/content/ProductImageField";

interface SupplementUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplement?: SupplementRow;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onSaved?: () => void;
}

export function SupplementUpsertModal({
  isOpen,
  onClose,
  supplement,
  onSubmit,
  onSaved,
}: SupplementUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [form, setForm] = useState({
    id: supplement?.id,
    name_pt: supplement?.name_pt ?? "",
    name_en: supplement?.name_en ?? "",
    category_pt: supplement?.category_pt ?? "",
    category_en: supplement?.category_en ?? "",
    description_pt: supplement?.description_pt ?? "",
    description_en: supplement?.description_en ?? "",
    serving_size: supplement?.serving_size ?? 1,
    serving_unit: supplement?.serving_unit ?? "g",
    brand: supplement?.brand ?? "",
    image_url: supplement?.image_url ?? "",
    is_active: supplement?.is_active ?? true,
    suggested_times_pt: Array.isArray(supplement?.suggested_times_pt) ? supplement!.suggested_times_pt!.join(", ") : "",
    suggested_times_en: Array.isArray(supplement?.suggested_times_en) ? supplement!.suggested_times_en!.join(", ") : "",
    contraindications_pt: Array.isArray(supplement?.contraindications_pt) ? supplement!.contraindications_pt!.join(", ") : "",
    contraindications_en: Array.isArray(supplement?.contraindications_en) ? supplement!.contraindications_en!.join(", ") : "",
    benefits_pt: Array.isArray(supplement?.benefits_pt) ? supplement!.benefits_pt!.join(", ") : "",
    benefits_en: Array.isArray(supplement?.benefits_en) ? supplement!.benefits_en!.join(", ") : "",
  });

  useEffect(() => {
    if (!isOpen) return;
    if (supplement) {
      setForm({
        id: supplement.id,
        name_pt: supplement.name_pt ?? "",
        name_en: supplement.name_en ?? "",
        category_pt: supplement.category_pt ?? "",
        category_en: supplement.category_en ?? "",
        description_pt: supplement.description_pt ?? "",
        description_en: supplement.description_en ?? "",
        serving_size: supplement.serving_size ?? 1,
        serving_unit: supplement.serving_unit ?? "g",
        brand: supplement.brand ?? "",
        image_url: supplement.image_url ?? "",
        is_active: supplement.is_active ?? true,
        suggested_times_pt: Array.isArray(supplement.suggested_times_pt) ? supplement.suggested_times_pt.join(", ") : "",
        suggested_times_en: Array.isArray(supplement.suggested_times_en) ? supplement.suggested_times_en.join(", ") : "",
        contraindications_pt: Array.isArray(supplement.contraindications_pt) ? supplement.contraindications_pt.join(", ") : "",
        contraindications_en: Array.isArray(supplement.contraindications_en) ? supplement.contraindications_en.join(", ") : "",
        benefits_pt: Array.isArray(supplement.benefits_pt) ? supplement.benefits_pt.join(", ") : "",
        benefits_en: Array.isArray(supplement.benefits_en) ? supplement.benefits_en.join(", ") : "",
      });
    } else {
      setForm({
        id: undefined,
        name_pt: "",
        name_en: "",
        category_pt: "",
        category_en: "",
        description_pt: "",
        description_en: "",
        serving_size: 1,
        serving_unit: "g",
        brand: "",
        image_url: "",
        is_active: true,
        suggested_times_pt: "",
        suggested_times_en: "",
        contraindications_pt: "",
        contraindications_en: "",
        benefits_pt: "",
        benefits_en: "",
      });
    }
  }, [isOpen, supplement]);

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
        image_url: form.image_url || null,
        brand: form.brand || null,
        suggested_times_pt: splitArr(form.suggested_times_pt),
        suggested_times_en: splitArr(form.suggested_times_en),
        contraindications_pt: splitArr(form.contraindications_pt),
        contraindications_en: splitArr(form.contraindications_en),
        benefits_pt: splitArr(form.benefits_pt),
        benefits_en: splitArr(form.benefits_en),
      };
      if (!payload.id) delete payload.id;
      if (onSubmit) await onSubmit(payload);
      onSaved?.();
    });
  };

  const titleCreate = label("Criar Suplemento", "Create Supplement");
  const titleEdit = label("Editar Suplemento", "Edit Supplement");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{supplement ? titleEdit : titleCreate}</ModalTitle>
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
                placeholder={label("Whey Protein", "Whey Protein")}
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
                placeholder={label("Whey Protein", "Whey Protein")}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Categoria (PT)", "Category (PT)")}
              </label>
              <Input
                value={form.category_pt}
                onChange={(e) => update("category_pt", e.target.value)}
                placeholder={label("Proteínas", "Proteins")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Categoria (EN)", "Category (EN)")}
              </label>
              <Input
                value={form.category_en}
                onChange={(e) => update("category_en", e.target.value)}
                placeholder={label("Proteins", "Proteins")}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Porção", "Serving size")}
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.serving_size}
                onChange={(e) => update("serving_size", parseFloat(e.target.value || "0"))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Unidade", "Unit")}
              </label>
              <Input
                value={form.serving_unit}
                onChange={(e) => update("serving_unit", e.target.value)}
                placeholder="g"
                required
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-text">
                {label("Marca", "Brand")}
              </label>
              <Input
                value={form.brand}
                onChange={(e) => update("brand", e.target.value)}
                placeholder={label("Optimum Nutrition", "Optimum Nutrition")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Descrição (PT)", "Description (PT)")}
              </label>
              <Textarea
                value={form.description_pt}
                onChange={(e) => update("description_pt", e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Descrição (EN)", "Description (EN)")}
              </label>
              <Textarea
                value={form.description_en}
                onChange={(e) => update("description_en", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <ProductImageField
            value={form.image_url}
            onChange={(url) => update("image_url", url)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Sugestões de uso (PT)", "Suggested times (PT)")}
              </label>
              <Input
                value={form.suggested_times_pt}
                onChange={(e) => update("suggested_times_pt", e.target.value)}
                placeholder={label("manhã, pré-treino", "morning, pre-workout")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Sugestões de uso (EN)", "Suggested times (EN)")}
              </label>
              <Input
                value={form.suggested_times_en}
                onChange={(e) => update("suggested_times_en", e.target.value)}
                placeholder={label("morning, pre-workout", "morning, pre-workout")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Contraindicações (PT)", "Contraindications (PT)")}
              </label>
              <Input
                value={form.contraindications_pt}
                onChange={(e) => update("contraindications_pt", e.target.value)}
                placeholder={label("alergia a soja", "soy allergy")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Contraindicações (EN)", "Contraindications (EN)")}
              </label>
              <Input
                value={form.contraindications_en}
                onChange={(e) => update("contraindications_en", e.target.value)}
                placeholder={label("soy allergy", "soy allergy")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Benefícios (PT)", "Benefits (PT)")}
              </label>
              <Input
                value={form.benefits_pt}
                onChange={(e) => update("benefits_pt", e.target.value)}
                placeholder={label("recuperação muscular", "muscle recovery")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Benefícios (EN)", "Benefits (EN)")}
              </label>
              <Input
                value={form.benefits_en}
                onChange={(e) => update("benefits_en", e.target.value)}
                placeholder={label("muscle recovery", "muscle recovery")}
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
                {label("Suplemento ativo", "Supplement active")}
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

export default SupplementUpsertModal;
