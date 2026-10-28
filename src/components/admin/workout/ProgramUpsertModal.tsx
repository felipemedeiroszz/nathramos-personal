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
import type { WorkoutProgramRow, WorkoutCategoryRow } from "@/types";
import { DIFFICULTY_LEVELS, WORKOUT_STATUSES } from "@/types";

interface ProgramUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  program?: WorkoutProgramRow;
  categories?: WorkoutCategoryRow[];
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onSaved?: () => void;
  userId?: string;
}

const DIFFICULTY_LABELS_PT: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};
const DIFFICULTY_LABELS_EN: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const STATUS_LABELS_PT: Record<string, string> = {
  active: "Ativo",
  completed: "Concluído",
  paused: "Pausado",
  archived: "Arquivado",
};
const STATUS_LABELS_EN: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  paused: "Paused",
  archived: "Archived",
};

export function ProgramUpsertModal({
  isOpen,
  onClose,
  program,
  categories = [],
  onSubmit,
  onSaved,
  userId,
}: ProgramUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useAsyncTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);
  const difficultyLabels =
    locale === "pt-BR" ? DIFFICULTY_LABELS_PT : DIFFICULTY_LABELS_EN;
  const statusLabels = locale === "pt-BR" ? STATUS_LABELS_PT : STATUS_LABELS_EN;

  const [form, setForm] = useState({
    id: program?.id,
    title_pt: program?.title_pt ?? "",
    title_en: program?.title_en ?? "",
    goal_pt: program?.goal_pt ?? "",
    goal_en: program?.goal_en ?? "",
    category_id: program?.category_id ?? ("" as string),
    difficulty: program?.difficulty ?? DIFFICULTY_LEVELS[0],
    total_weeks: program?.total_weeks ?? 4,
    days_per_week: program?.days_per_week ?? 3,
    est_minutes_per_session: program?.est_minutes_per_session ?? 45,
    status: (program?.status ?? WORKOUT_STATUSES[0]) as any,
    is_template: program?.is_template ?? false,
    notes_pt: program?.notes_pt ?? "",
    notes_en: program?.notes_en ?? "",
    cover_image_url: program?.cover_image_url ?? "",
    tags: Array.isArray(program?.tags) ? program!.tags!.join(", ") : "",
  });

  useEffect(() => {
    if (!isOpen) return;
    if (program) {
      setForm({
        id: program.id,
        title_pt: program.title_pt ?? "",
        title_en: program.title_en ?? "",
        goal_pt: program.goal_pt ?? "",
        goal_en: program.goal_en ?? "",
        category_id: program.category_id ?? "",
        difficulty: program.difficulty ?? DIFFICULTY_LEVELS[0],
        total_weeks: program.total_weeks ?? 4,
        days_per_week: program.days_per_week ?? 3,
        est_minutes_per_session: program.est_minutes_per_session ?? 45,
        status: program.status ?? WORKOUT_STATUSES[0],
        is_template: program.is_template ?? false,
        notes_pt: program.notes_pt ?? "",
        notes_en: program.notes_en ?? "",
        cover_image_url: program.cover_image_url ?? "",
        tags: Array.isArray(program.tags) ? program.tags.join(", ") : "",
      });
    } else {
      setForm({
        id: undefined,
        title_pt: "",
        title_en: "",
        goal_pt: "",
        goal_en: "",
        category_id: "",
        difficulty: DIFFICULTY_LEVELS[0],
        total_weeks: 4,
        days_per_week: 3,
        est_minutes_per_session: 45,
        status: WORKOUT_STATUSES[0] as any,
        is_template: false,
        notes_pt: "",
        notes_en: "",
        cover_image_url: "",
        tags: "",
      });
    }
  }, [isOpen, program]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    startTransition(async () => {
      try {
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
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Falha ao salvar.",
        );
      }
    });
  };

  const titleCreate = label("Criar Programa", "Create Program");
  const titleEdit = label("Editar Programa", "Edit Program");

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) onClose();
      }}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{program ? titleEdit : titleCreate}</ModalTitle>
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
                {label("Titulo (PT)", "Title (PT)")}
              </label>
              <Input
                value={form.title_pt}
                onChange={(e) => update("title_pt", e.target.value)}
                placeholder={label("Força 8 semanas", "Strength 8 weeks")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Titulo (EN)", "Title (EN)")}
              </label>
              <Input
                value={form.title_en}
                onChange={(e) => update("title_en", e.target.value)}
                placeholder={label("Força 8 semanas", "Strength 8 weeks")}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Objetivo (PT)", "Goal (PT)")}
              </label>
              <Textarea
                value={form.goal_pt}
                onChange={(e) => update("goal_pt", e.target.value)}
                rows={2}
                placeholder={label(
                  "Aumentar forca nos exercicios basicos...",
                  "Increase strength in basic exercises...",
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Objetivo (EN)", "Goal (EN)")}
              </label>
              <Textarea
                value={form.goal_en}
                onChange={(e) => update("goal_en", e.target.value)}
                rows={2}
                placeholder={label(
                  "Aumentar forca nos exercicios basicos...",
                  "Increase strength in basic exercises...",
                )}
              />
            </div>
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Total de Semanas", "Total Weeks")}
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Min/Sessao", "Min/Session")}
              </label>
              <Input
                type="number"
                min={1}
                value={form.est_minutes_per_session}
                onChange={(e) =>
                  update(
                    "est_minutes_per_session",
                    parseInt(e.target.value || "1", 10),
                  )
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Status", "Status")}
              </label>
              <Select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                required
              >
                {WORKOUT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s] ?? s}
                  </option>
                ))}
              </Select>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Notas (PT)", "Notes (PT)")}
              </label>
              <Textarea
                value={form.notes_pt}
                onChange={(e) => update("notes_pt", e.target.value)}
                rows={3}
                placeholder={label(
                  "Observacoes para o aluno...",
                  "Notes for the student...",
                )}
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
                placeholder={label(
                  "Observacoes para o aluno...",
                  "Notes for the student...",
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Tags (virgula)", "Tags (comma)")}
            </label>
            <Input
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder={label(
                "forca, push-pull-legs, 8semanas",
                "strength, push-pull-legs, 8weeks",
              )}
            />
          </div>

          <div className="flex gap-6 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_template}
                onChange={(e) => update("is_template", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-text">
                {label("E modelo (template)", "Is template")}
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

export default ProgramUpsertModal;
