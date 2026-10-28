"use client";
import { useAsyncTransition } from "@/hooks/useAsyncTransition";

import { useEffect, useState } from "react";
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

interface DayUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  day?: any;
  programId: string;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onSaved?: () => void;
  userId?: string;
}

const DAYS_OF_WEEK_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const DAYS_OF_WEEK_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function DayUpsertModal({
  isOpen,
  onClose,
  day,
  programId,
  onSubmit,
  onSaved,
  userId,
}: DayUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useAsyncTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);
  const dayLabels = locale === "pt-BR" ? DAYS_OF_WEEK_PT : DAYS_OF_WEEK_EN;

  const [form, setForm] = useState({
    id: day?.id,
    program_id: day?.program_id ?? programId,
    name_pt: day?.name_pt ?? "",
    name_en: day?.name_en ?? "",
    focus_pt: day?.focus_pt ?? "",
    focus_en: day?.focus_en ?? "",
    week_number: day?.week_number ?? 1,
    day_of_week: day?.day_of_week ?? 0,
    order_index: day?.order_index ?? 0,
    est_minutes: day?.est_minutes ?? 60,
    warmup_minutes: day?.warmup_minutes ?? 5,
    cooldown_minutes: day?.cooldown_minutes ?? 5,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (day) {
      setForm({
        id: day.id,
        program_id: day.program_id ?? programId,
        name_pt: day.name_pt ?? "",
        name_en: day.name_en ?? "",
        focus_pt: day.focus_pt ?? "",
        focus_en: day.focus_en ?? "",
        week_number: day.week_number ?? 1,
        day_of_week: day.day_of_week ?? 0,
        order_index: day.order_index ?? 0,
        est_minutes: day.est_minutes ?? 60,
        warmup_minutes: day.warmup_minutes ?? 5,
        cooldown_minutes: day.cooldown_minutes ?? 5,
      });
    } else {
      setForm({
        id: undefined,
        program_id: programId,
        name_pt: "",
        name_en: "",
        focus_pt: "",
        focus_en: "",
        week_number: 1,
        day_of_week: 0,
        order_index: 0,
        est_minutes: 60,
        warmup_minutes: 5,
        cooldown_minutes: 5,
      });
    }
  }, [isOpen, day, programId]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    startTransition(async () => {
      try {
        const payload: Record<string, any> = { ...form };
        if (!payload.id) delete payload.id;
        if (onSubmit) await onSubmit(payload);
        onSaved?.();
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Falha ao salvar.",
        );
      }
    });
  };

  const titleCreate = label("Criar Dia", "Create Day");
  const titleEdit = label("Editar Dia", "Edit Day");

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) onClose();
      }}
      className="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{day ? titleEdit : titleCreate}</ModalTitle>
        <ModalClose disabled={isPending} onClick={onClose} />
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        {saveError && (
          <p role="alert" className="text-red-500 p-3">
            {saveError}
          </p>
        )}
        <ModalBody className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Nome (PT)", "Name (PT)")}
              </label>
              <Input
                value={form.name_pt}
                onChange={(e) => update("name_pt", e.target.value)}
                placeholder={label("Dia de Peito", "Chest Day")}
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
                placeholder={label("Dia de Peito", "Chest Day")}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Foco (PT)", "Focus (PT)")}
              </label>
              <Textarea
                value={form.focus_pt}
                onChange={(e) => update("focus_pt", e.target.value)}
                rows={2}
                placeholder={label(
                  "Foco em hipertrofia de peito e triceps...",
                  "Focus on chest and triceps hypertrophy...",
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Foco (EN)", "Focus (EN)")}
              </label>
              <Textarea
                value={form.focus_en}
                onChange={(e) => update("focus_en", e.target.value)}
                rows={2}
                placeholder={label(
                  "Foco em hipertrofia de peito e triceps...",
                  "Focus on chest and triceps hypertrophy...",
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Semana", "Week")}
              </label>
              <Input
                type="number"
                min={1}
                value={form.week_number}
                onChange={(e) =>
                  update("week_number", parseInt(e.target.value || "1", 10))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Dia da Semana", "Day of Week")}
              </label>
              <Select
                value={String(form.day_of_week)}
                onChange={(e) =>
                  update("day_of_week", parseInt(e.target.value, 10))
                }
                required
              >
                {dayLabels.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
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
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Duracao (min)", "Duration (min)")}
              </label>
              <Input
                type="number"
                min={1}
                value={form.est_minutes}
                onChange={(e) =>
                  update("est_minutes", parseInt(e.target.value || "1", 10))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Aquecimento (min)", "Warmup (min)")}
              </label>
              <Input
                type="number"
                min={0}
                value={form.warmup_minutes}
                onChange={(e) =>
                  update("warmup_minutes", parseInt(e.target.value || "0", 10))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Desaquecimento (min)", "Cooldown (min)")}
              </label>
              <Input
                type="number"
                min={0}
                value={form.cooldown_minutes}
                onChange={(e) =>
                  update(
                    "cooldown_minutes",
                    parseInt(e.target.value || "0", 10),
                  )
                }
                required
              />
            </div>
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

export default DayUpsertModal;
