"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Lock, Unlock } from "lucide-react";
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
import type { ExerciseRow } from "@/types";
import {
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  DIFFICULTY_LEVELS,
} from "@/types";

interface ExerciseUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise?: ExerciseRow;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onSaved?: () => void;
  userId?: string;
}

const MUSCLE_LABELS_PT: Record<string, string> = {
  chest: "Peito", back: "Costas", shoulders: "Ombros", biceps: "Bíceps",
  triceps: "Tríceps", forearms: "Antebraços", core: "Core", abs: "Abdômen",
  obliques: "Oblíquos", quads: "Quadríceps", hamstrings: "Posteriores",
  glutes: "Glúteos", calves: "Panturrilhas", adductors: "Adutores",
  abductors: "Abductores", lower_back: "Lombar", traps: "Trapézio",
  full_body: "Corpo Todo", cardio: "Cardio",
};

const MUSCLE_LABELS_EN: Record<string, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps",
  triceps: "Triceps", forearms: "Forearms", core: "Core", abs: "Abs",
  obliques: "Obliques", quads: "Quads", hamstrings: "Hamstrings",
  glutes: "Glutes", calves: "Calves", adductors: "Adductors",
  abductors: "Abductors", lower_back: "Lower Back", traps: "Traps",
  full_body: "Full Body", cardio: "Cardio",
};

const EQUIPMENT_LABELS_PT: Record<string, string> = {
  body_weight: "Peso Corporal", barbell: "Barra", dumbbell: "Halteres",
  kettlebell: "Kettlebell", cable: "Polia", machine: "Máquina",
  smith: "Smith", resistance_band: "Elástico", medicine_ball: "Bola Medicinal",
  bosu_ball: "Bosu", foam_roller: "Rolo de Liberação", treadmill: "Esteira",
  elliptical: "Elíptico", bike: "Bicicleta", rowing: "Remo",
  jump_rope: "Corda", bench: "Banco", pull_up_bar: "Barra Fixa", other: "Outro",
};

const EQUIPMENT_LABELS_EN: Record<string, string> = {
  body_weight: "Body Weight", barbell: "Barbell", dumbbell: "Dumbbell",
  kettlebell: "Kettlebell", cable: "Cable", machine: "Machine",
  smith: "Smith Machine", resistance_band: "Resistance Band",
  medicine_ball: "Medicine Ball", bosu_ball: "Bosu Ball",
  foam_roller: "Foam Roller", treadmill: "Treadmill", elliptical: "Elliptical",
  bike: "Bike", rowing: "Rowing", jump_rope: "Jump Rope", bench: "Bench",
  pull_up_bar: "Pull Up Bar", other: "Other",
};

const DIFFICULTY_LABELS_PT: Record<string, string> = {
  beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado",
};

const DIFFICULTY_LABELS_EN: Record<string, string> = {
  beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
};

export function ExerciseUpsertModal({
  isOpen,
  onClose,
  exercise,
  onSubmit,
  onSaved,
  userId,
}: ExerciseUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const muscleLabels = locale === "pt-BR" ? MUSCLE_LABELS_PT : MUSCLE_LABELS_EN;
  const equipmentLabels = locale === "pt-BR" ? EQUIPMENT_LABELS_PT : EQUIPMENT_LABELS_EN;
  const difficultyLabels = locale === "pt-BR" ? DIFFICULTY_LABELS_PT : DIFFICULTY_LABELS_EN;

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [form, setForm] = useState({
    id: exercise?.id,
    source: (exercise?.source ?? "custom") as "exercisedb" | "custom",
    name_pt: exercise?.name_pt ?? "",
    name_en: exercise?.name_en ?? "",
    description_pt: exercise?.description_pt ?? "",
    description_en: exercise?.description_en ?? "",
    instructions_pt: Array.isArray(exercise?.instructions_pt)
      ? exercise!.instructions_pt!.join("\n")
      : "",
    instructions_en: Array.isArray(exercise?.instructions_en)
      ? exercise!.instructions_en!.join("\n")
      : "",
    primary_muscle: exercise?.primary_muscle ?? MUSCLE_GROUPS[0],
    equipment: exercise?.equipment ?? EQUIPMENT_TYPES[0],
    difficulty: exercise?.difficulty ?? DIFFICULTY_LEVELS[0],
    gif_url: exercise?.gif_url ?? "",
    video_url: exercise?.video_url ?? "",
    thumbnail_url: exercise?.thumbnail_url ?? "",
    tags: Array.isArray(exercise?.tags) ? exercise!.tags!.join(", ") : "",
    translation_locked: exercise?.translation_locked ?? false,
    is_published: exercise?.is_published ?? true,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (exercise) {
      setForm({
        id: exercise.id,
        source: exercise.source,
        name_pt: exercise.name_pt ?? "",
        name_en: exercise.name_en ?? "",
        description_pt: exercise.description_pt ?? "",
        description_en: exercise.description_en ?? "",
        instructions_pt: Array.isArray(exercise.instructions_pt)
          ? exercise.instructions_pt.join("\n")
          : "",
        instructions_en: Array.isArray(exercise.instructions_en)
          ? exercise.instructions_en.join("\n")
          : "",
        primary_muscle: exercise.primary_muscle ?? MUSCLE_GROUPS[0],
        equipment: exercise.equipment ?? EQUIPMENT_TYPES[0],
        difficulty: exercise.difficulty ?? DIFFICULTY_LEVELS[0],
        gif_url: exercise.gif_url ?? "",
        video_url: exercise.video_url ?? "",
        thumbnail_url: exercise.thumbnail_url ?? "",
        tags: Array.isArray(exercise.tags) ? exercise.tags.join(", ") : "",
        translation_locked: exercise.translation_locked ?? false,
        is_published: exercise.is_published ?? true,
      });
    } else {
      setForm({
        id: undefined,
        source: "custom",
        name_pt: "",
        name_en: "",
        description_pt: "",
        description_en: "",
        instructions_pt: "",
        instructions_en: "",
        primary_muscle: MUSCLE_GROUPS[0],
        equipment: EQUIPMENT_TYPES[0],
        difficulty: DIFFICULTY_LEVELS[0],
        gif_url: "",
        video_url: "",
        thumbnail_url: "",
        tags: "",
        translation_locked: false,
        is_published: true,
      });
    }
  }, [isOpen, exercise]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload: Record<string, any> = {
        ...form,
        instructions_pt: form.instructions_pt
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        instructions_en: form.instructions_en
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        tags: form.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        gif_url: form.gif_url || null,
        video_url: form.video_url || null,
        thumbnail_url: form.thumbnail_url || null,
      };
      if (!payload.id) delete payload.id;
      if (onSubmit) await onSubmit(payload);
      onSaved?.();
    });
  };

  const titlePT = label("Criar Exercicio", "Create Exercise");
  const titleEN = label("Editar Exercicio", "Edit Exercise");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{exercise ? titleEN : titlePT}</ModalTitle>
        <ModalClose onClick={onClose} />
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Nome (PT)", "Name (EN)")}
              </label>
              <Input
                value={form.name_pt}
                onChange={(e) => update("name_pt", e.target.value)}
                placeholder={label("Agachamento livre", "Back squat")}
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
                placeholder={label("Agachamento livre", "Back squat")}
                required
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
                placeholder={label("Exercicio basico para membros inferiores...", "Basic exercise for lower body...")}
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
                placeholder={label("Exercicio basico para membros inferiores...", "Basic exercise for lower body...")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Musculo Principal", "Primary Muscle")}
              </label>
              <Select
                value={form.primary_muscle}
                onChange={(e) => update("primary_muscle", e.target.value)}
                required
              >
                {MUSCLE_GROUPS.map((m) => (
                  <option key={m} value={m}>
                    {muscleLabels[m] ?? m}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Equipamento", "Equipment")}
              </label>
              <Select
                value={form.equipment}
                onChange={(e) => update("equipment", e.target.value)}
                required
              >
                {EQUIPMENT_TYPES.map((eq) => (
                  <option key={eq} value={eq}>
                    {equipmentLabels[eq] ?? eq}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">GIF URL</label>
              <Input
                type="url"
                value={form.gif_url}
                onChange={(e) => update("gif_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Video URL", "Video URL")}
              </label>
              <Input
                type="url"
                value={form.video_url}
                onChange={(e) => update("video_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Thumbnail URL", "Thumbnail URL")}
              </label>
              <Input
                type="url"
                value={form.thumbnail_url}
                onChange={(e) => update("thumbnail_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Instrucoes (PT) - uma por linha", "Instructions (PT) - one per line")}
              </label>
              <Textarea
                value={form.instructions_pt}
                onChange={(e) => update("instructions_pt", e.target.value)}
                rows={5}
                placeholder={label(
                  "Posicione os pes na largura dos ombros\nFlexione os joelhos...",
                  "Place feet shoulder-width\nBend your knees..."
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Instrucoes (EN) - uma por linha", "Instructions (EN) - one per line")}
              </label>
              <Textarea
                value={form.instructions_en}
                onChange={(e) => update("instructions_en", e.target.value)}
                rows={5}
                placeholder={label(
                  "Posicione os pes na largura dos ombros\nFlexione os joelhos...",
                  "Place feet shoulder-width\nBend your knees..."
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Tags (separadas por virgula)", "Tags (comma separated)")}
            </label>
            <Input
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              placeholder={label(
                "hipertrofia, pernas, livre",
                "hypertrophy, legs, free-weight"
              )}
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.translation_locked}
                onChange={(e) => update("translation_locked", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="inline-flex items-center gap-1.5 text-sm text-text">
                {form.translation_locked ? (
                  <Lock size={14} className="text-primary" />
                ) : (
                  <Unlock size={14} className="text-text-secondary" />
                )}
                {label("Traducao bloqueada", "Translation locked")}
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

export default ExerciseUpsertModal;
