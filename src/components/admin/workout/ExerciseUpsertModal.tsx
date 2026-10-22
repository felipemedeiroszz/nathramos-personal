"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ImageOff, Lock, Unlock, Upload, X } from "lucide-react";
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
import { uploadExerciseAssetAction } from "@/app/actions/workouts";
import { getWorkoutLabels } from "@/lib/workoutLabels";
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
  onSubmit?: (data: Record<string, any>) => void | Promise<any>;
  onSaved?: () => void;
  userId?: string;
}

const EMPTY_FORM = {
  id: undefined as string | undefined,
  source: "custom" as "exercisedb" | "custom",
  name_pt: "",
  name_en: "",
  description_pt: "",
  description_en: "",
  instructions_pt: "",
  instructions_en: "",
  primary_muscle: MUSCLE_GROUPS[0] as string,
  equipment: EQUIPMENT_TYPES[0] as string,
  difficulty: DIFFICULTY_LEVELS[0] as string,
  gif_url: "",
  video_url: "",
  thumbnail_url: "",
  tags: "",
  translation_locked: false,
  is_published: true,
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

  const { muscle: muscleLabels, equipment: equipmentLabels, difficulty: difficultyLabels } =
    getWorkoutLabels(locale);

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setUploading(false);
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
      setForm(EMPTY_FORM);
    }
  }, [isOpen, exercise]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg(null);
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await uploadExerciseAssetAction(data);
      if (!result?.success || !result.url) {
        setErrorMsg(result?.message ?? label("Falha ao enviar arquivo.", "Upload failed."));
        return;
      }
      update("gif_url", result.url);
    } catch (err: any) {
      setErrorMsg(err?.message ?? label("Falha ao enviar arquivo.", "Upload failed."));
    } finally {
      setUploading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
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

      try {
        const result = onSubmit ? await onSubmit(payload) : undefined;
        if (result && typeof result === "object" && "success" in result && result.success === false) {
          setErrorMsg(result.message ?? label("Erro ao salvar exercício.", "Failed to save exercise."));
          return;
        }
        onSaved?.();
      } catch (err: any) {
        setErrorMsg(err?.message ?? label("Erro ao salvar exercício.", "Failed to save exercise."));
      }
    });
  };

  const busy = isPending || uploading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>
          {exercise
            ? label("Editar Exercício", "Edit Exercise")
            : label("Criar Exercício", "Create Exercise")}
        </ModalTitle>
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-text">
              {label("Mídia (GIF / Imagem)", "Media (GIF / Image)")}
            </label>
            <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-secondary">
              {form.gif_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.gif_url}
                    alt={label("Pré-visualização do exercício", "Exercise preview")}
                    className="max-h-64 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => update("gif_url", "")}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                    title={label("Remover mídia", "Remove media")}
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 p-8 text-text-secondary">
                  <ImageOff size={28} />
                  <span className="text-xs">
                    {label("Nenhuma mídia adicionada", "No media added")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4"
                className="hidden"
                onChange={handleFileSelected}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} className="mr-2" />
                {uploading
                  ? label("Enviando...", "Uploading...")
                  : label("Enviar GIF/Imagem", "Upload GIF/Image")}
              </Button>
              <Input
                type="url"
                value={form.gif_url}
                onChange={(e) => update("gif_url", e.target.value)}
                placeholder={label("ou cole uma URL (https://...)", "or paste a URL (https://...)")}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-text-secondary">
              {label(
                "GIF, PNG, JPG, WEBP ou MP4 · até 20MB.",
                "GIF, PNG, JPG, WEBP or MP4 · up to 20MB."
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Músculo Principal", "Primary Muscle")}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Descrição (PT)", "Description (PT)")}
              </label>
              <Textarea
                value={form.description_pt}
                onChange={(e) => update("description_pt", e.target.value)}
                rows={3}
                placeholder={label(
                  "Exercício básico para membros inferiores...",
                  "Basic exercise for lower body..."
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Descrição (EN)", "Description (EN)")}
              </label>
              <Textarea
                value={form.description_en}
                onChange={(e) => update("description_en", e.target.value)}
                rows={3}
                placeholder={label(
                  "Exercício básico para membros inferiores...",
                  "Basic exercise for lower body..."
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Instruções (PT) - uma por linha", "Instructions (PT) - one per line")}
              </label>
              <Textarea
                value={form.instructions_pt}
                onChange={(e) => update("instructions_pt", e.target.value)}
                rows={5}
                placeholder={label(
                  "Posicione os pés na largura dos ombros\nFlexione os joelhos...",
                  "Place feet shoulder-width\nBend your knees..."
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Instruções (EN) - uma por linha", "Instructions (EN) - one per line")}
              </label>
              <Textarea
                value={form.instructions_en}
                onChange={(e) => update("instructions_en", e.target.value)}
                rows={5}
                placeholder={label(
                  "Posicione os pés na largura dos ombros\nFlexione os joelhos...",
                  "Place feet shoulder-width\nBend your knees..."
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Vídeo (URL opcional)", "Video (optional URL)")}
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
                {label("Tags (separadas por vírgula)", "Tags (comma separated)")}
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
                {label("Tradução bloqueada", "Translation locked")}
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

          {errorMsg && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              {errorMsg}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? t("loading") : t("save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default ExerciseUpsertModal;
