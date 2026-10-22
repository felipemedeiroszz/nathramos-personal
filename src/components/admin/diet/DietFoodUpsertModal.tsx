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
import type { DietFoodRow } from "@/types";
import { ProductImageField } from "@/components/admin/content/ProductImageField";

interface DietFoodUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  food?: DietFoodRow;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onSaved?: () => void;
}

export function DietFoodUpsertModal({
  isOpen,
  onClose,
  food,
  onSubmit,
  onSaved,
}: DietFoodUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [form, setForm] = useState({
    id: food?.id,
    name_pt: food?.name_pt ?? "",
    name_en: food?.name_en ?? "",
    category_pt: food?.category_pt ?? "",
    category_en: food?.category_en ?? "",
    description_pt: food?.description_pt ?? "",
    description_en: food?.description_en ?? "",
    serving_size: food?.serving_size ?? 100,
    serving_unit: food?.serving_unit ?? "g",
    calories_kcal: food?.calories_kcal ?? 0,
    protein_g: food?.protein_g ?? 0,
    carbs_g: food?.carbs_g ?? 0,
    fats_g: food?.fats_g ?? 0,
    fiber_g: food?.fiber_g ?? 0,
    brand: food?.brand ?? "",
    image_url: food?.image_url ?? "",
    is_active: food?.is_active ?? true,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (food) {
      setForm({
        id: food.id,
        name_pt: food.name_pt ?? "",
        name_en: food.name_en ?? "",
        category_pt: food.category_pt ?? "",
        category_en: food.category_en ?? "",
        description_pt: food.description_pt ?? "",
        description_en: food.description_en ?? "",
        serving_size: food.serving_size ?? 100,
        serving_unit: food.serving_unit ?? "g",
        calories_kcal: food.calories_kcal ?? 0,
        protein_g: food.protein_g ?? 0,
        carbs_g: food.carbs_g ?? 0,
        fats_g: food.fats_g ?? 0,
        fiber_g: food.fiber_g ?? 0,
        brand: food.brand ?? "",
        image_url: food.image_url ?? "",
        is_active: food.is_active ?? true,
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
        serving_size: 100,
        serving_unit: "g",
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fats_g: 0,
        fiber_g: 0,
        brand: "",
        image_url: "",
        is_active: true,
      });
    }
  }, [isOpen, food]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload: Record<string, any> = {
        ...form,
        image_url: form.image_url || null,
        brand: form.brand || null,
        description_pt: form.description_pt || null,
        description_en: form.description_en || null,
      };
      if (!payload.id) delete payload.id;
      if (onSubmit) await onSubmit(payload);
      onSaved?.();
    });
  };

  const titleCreate = label("Criar Alimento", "Create Food");
  const titleEdit = label("Editar Alimento", "Edit Food");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{food ? titleEdit : titleCreate}</ModalTitle>
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
                placeholder={label("Arroz integral", "Brown rice")}
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
                placeholder={label("Brown rice", "Brown rice")}
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
                placeholder={label("Carboidratos", "Carbohydrates")}
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
                placeholder={label("Carbohydrates", "Carbohydrates")}
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
                placeholder={label("Opcional", "Optional")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Calorias (kcal)", "Calories (kcal)")}
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.calories_kcal}
                onChange={(e) => update("calories_kcal", parseFloat(e.target.value || "0"))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Proteínas (g)", "Protein (g)")}
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.protein_g}
                onChange={(e) => update("protein_g", parseFloat(e.target.value || "0"))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Carboidratos (g)", "Carbs (g)")}
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.carbs_g}
                onChange={(e) => update("carbs_g", parseFloat(e.target.value || "0"))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Gorduras (g)", "Fats (g)")}
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.fats_g}
                onChange={(e) => update("fats_g", parseFloat(e.target.value || "0"))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Fibras (g)", "Fiber (g)")}
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.fiber_g}
                onChange={(e) => update("fiber_g", parseFloat(e.target.value || "0"))}
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

          <div className="flex gap-6 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update("is_active", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-text">
                {label("Alimento ativo", "Food active")}
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

export default DietFoodUpsertModal;
