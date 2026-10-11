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
import type { DietProgramRow } from "@/types";

interface DietUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  program?: DietProgramRow;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onSaved?: () => void;
}

export function DietUpsertModal({
  isOpen,
  onClose,
  program,
  onSubmit,
  onSaved,
}: DietUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [form, setForm] = useState({
    id: program?.id,
    title_pt: program?.title_pt ?? "",
    title_en: program?.title_en ?? "",
    daily_calories: program?.daily_calories ?? 2000,
    protein_g: program?.protein_g ?? 150,
    carbs_g: program?.carbs_g ?? 200,
    fats_g: program?.fats_g ?? 70,
    fiber_g: program?.fiber_g ?? 25,
    sodium_mg: program?.sodium_mg ?? 2300,
    water_liters: program?.water_liters ?? 2.0,
    start_date: program?.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: program?.end_date ?? "",
    is_active: program?.is_active ?? true,
    restrictions_pt: Array.isArray(program?.restrictions_pt) ? program!.restrictions_pt!.join(", ") : "",
    restrictions_en: Array.isArray(program?.restrictions_en) ? program!.restrictions_en!.join(", ") : "",
    notes_pt: program?.notes_pt ?? "",
    notes_en: program?.notes_en ?? "",
  });

  useEffect(() => {
    if (!isOpen) return;
    if (program) {
      setForm({
        id: program.id,
        title_pt: program.title_pt ?? "",
        title_en: program.title_en ?? "",
        daily_calories: program.daily_calories ?? 2000,
        protein_g: program.protein_g ?? 150,
        carbs_g: program.carbs_g ?? 200,
        fats_g: program.fats_g ?? 70,
        fiber_g: program.fiber_g ?? 25,
        sodium_mg: program.sodium_mg ?? 2300,
        water_liters: program.water_liters ?? 2.0,
        start_date: program.start_date ?? new Date().toISOString().slice(0, 10),
        end_date: program.end_date ?? "",
        is_active: program.is_active ?? true,
        restrictions_pt: Array.isArray(program.restrictions_pt) ? program.restrictions_pt.join(", ") : "",
        restrictions_en: Array.isArray(program.restrictions_en) ? program.restrictions_en.join(", ") : "",
        notes_pt: program.notes_pt ?? "",
        notes_en: program.notes_en ?? "",
      });
    } else {
      setForm({
        id: undefined,
        title_pt: "",
        title_en: "",
        daily_calories: 2000,
        protein_g: 150,
        carbs_g: 200,
        fats_g: 70,
        fiber_g: 25,
        sodium_mg: 2300,
        water_liters: 2.0,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: "",
        is_active: true,
        restrictions_pt: "",
        restrictions_en: "",
        notes_pt: "",
        notes_en: "",
      });
    }
  }, [isOpen, program]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload: Record<string, any> = {
        ...form,
        end_date: form.end_date || null,
        restrictions_pt: form.restrictions_pt
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        restrictions_en: form.restrictions_en
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
      };
      if (!payload.id) delete payload.id;
      if (onSubmit) await onSubmit(payload);
      onSaved?.();
    });
  };

  const titleCreate = label("Criar Dieta", "Create Diet");
  const titleEdit = label("Editar Dieta", "Edit Diet");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{program ? titleEdit : titleCreate}</ModalTitle>
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
                placeholder={label("Corte 8 semanas", "Cut 8 weeks")}
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
                placeholder={label("Corte 8 semanas", "Cut 8 weeks")}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Calorias (kcal)", "Calories (kcal)")}
              </label>
              <Input
                type="number"
                min={500}
                max={10000}
                value={form.daily_calories}
                onChange={(e) => update("daily_calories", parseInt(e.target.value || "0", 10))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Proteína (g)", "Protein (g)")}
              </label>
              <Input
                type="number"
                min={0}
                value={form.protein_g}
                onChange={(e) => update("protein_g", parseFloat(e.target.value || "0"))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Carboidratos (g)", "Carbs (g)")}
              </label>
              <Input
                type="number"
                min={0}
                value={form.carbs_g}
                onChange={(e) => update("carbs_g", parseFloat(e.target.value || "0"))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Gorduras (g)", "Fats (g)")}
              </label>
              <Input
                type="number"
                min={0}
                value={form.fats_g}
                onChange={(e) => update("fats_g", parseFloat(e.target.value || "0"))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Fibra (g)", "Fiber (g)")}
              </label>
              <Input
                type="number"
                min={0}
                value={form.fiber_g}
                onChange={(e) => update("fiber_g", parseFloat(e.target.value || "0"))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Sódio (mg)", "Sodium (mg)")}
              </label>
              <Input
                type="number"
                min={0}
                value={form.sodium_mg}
                onChange={(e) => update("sodium_mg", parseInt(e.target.value || "0", 10))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Água (L)", "Water (L)")}
              </label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.water_liters}
                onChange={(e) => update("water_liters", parseFloat(e.target.value || "0"))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Data início", "Start date")}
              </label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Data fim", "End date")}
              </label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => update("end_date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Restrições (PT)", "Restrictions (PT)")}
              </label>
              <Input
                value={form.restrictions_pt}
                onChange={(e) => update("restrictions_pt", e.target.value)}
                placeholder={label("gluten, lactose", "gluten, lactose")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Restrições (EN)", "Restrictions (EN)")}
              </label>
              <Input
                value={form.restrictions_en}
                onChange={(e) => update("restrictions_en", e.target.value)}
                placeholder={label("gluten, lactose", "gluten, lactose")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Notas (PT)", "Notes (PT)")}
              </label>
              <Textarea
                value={form.notes_pt}
                onChange={(e) => update("notes_pt", e.target.value)}
                rows={3}
                placeholder={label("Observações para o aluno...", "Notes for the student...")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Notas (EN)", "Notes (EN)")}
              </label>
              <Textarea
                value={form.notes_en}
                onChange={(e) => update("notes_en", e.target.value)}
                rows={3}
                placeholder={label("Observações para o aluno...", "Notes for the student...")}
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
                {label("Dieta ativa", "Diet active")}
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

export default DietUpsertModal;
