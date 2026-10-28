"use client";
import { useAsyncTransition } from "@/hooks/useAsyncTransition";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dumbbell,
  FolderKanban,
  ImageOff,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { addWorkoutKitItemAction } from "@/app/actions/workouts";
import type { ExerciseDbExercise } from "@/lib/exercisedb";

const CATEGORY_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

const WEEKDAY_LABELS: Record<number, { pt: string; en: string }> = {
  1: { pt: "Segunda-feira", en: "Monday" },
  2: { pt: "Terça-feira", en: "Tuesday" },
  3: { pt: "Quarta-feira", en: "Wednesday" },
  4: { pt: "Quinta-feira", en: "Thursday" },
  5: { pt: "Sexta-feira", en: "Friday" },
  6: { pt: "Sábado", en: "Saturday" },
  7: { pt: "Domingo", en: "Sunday" },
};

const API_PAGE_SIZE = 18;

type SourceKind = "program" | "api" | "catalog";

export interface KitExerciseOption {
  id: string;
  name_pt: string;
  name_en: string;
  primary_muscle: string;
  source: string;
}

export interface KitProgramOption {
  id: string;
  title_pt: string;
  title_en: string;
}

interface KitItemUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  kitId: string;
  kitName?: string;
  nextOrder: number;
  programOptions: KitProgramOption[];
  exerciseOptions: KitExerciseOption[];
  onSaved?: () => void;
}

export function KitItemUpsertModal({
  isOpen,
  onClose,
  kitId,
  kitName,
  nextOrder,
  programOptions,
  exerciseOptions,
  onSaved,
}: KitItemUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useAsyncTransition();

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [source, setSource] = useState<SourceKind>("program");
  const [programId, setProgramId] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [apiExercise, setApiExercise] = useState<ExerciseDbExercise | null>(
    null,
  );
  const [categoryLabel, setCategoryLabel] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [apiQuery, setApiQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [apiItems, setApiItems] = useState<ExerciseDbExercise[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSource("program");
    setProgramId("");
    setExerciseId("");
    setApiExercise(null);
    setCategoryLabel("");
    setDayOfWeek("");
    setErrorMsg(null);
    setApiQuery("");
    setDebouncedQuery("");
    setApiItems([]);
    setApiError(false);
  }, [isOpen, kitId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(apiQuery.trim()), 450);
    return () => clearTimeout(timer);
  }, [apiQuery]);

  useEffect(() => {
    if (!isOpen || source !== "api") return;

    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setApiLoading(true);
      setApiError(false);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(API_PAGE_SIZE));
        if (debouncedQuery) params.set("q", debouncedQuery);
        const response = await fetch(
          `/api/exercisedb/exercises?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setApiItems([]);
          setApiError(true);
          return;
        }
        setApiItems(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err) {
        if (cancelled || (err as Error)?.name === "AbortError") return;
        setApiItems([]);
        setApiError(true);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen, source, debouncedQuery]);

  const canSubmit =
    (source === "program" && !!programId) ||
    (source === "catalog" && !!exerciseId) ||
    (source === "api" && !!apiExercise);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const result = await addWorkoutKitItemAction({
          kit_id: kitId,
          category_label: categoryLabel || null,
          day_of_week: dayOfWeek ? Number(dayOfWeek) : null,
          program_id: source === "program" ? programId : null,
          exercise_id: source === "catalog" ? exerciseId : null,
          api_exercise: source === "api" ? apiExercise : null,
          order_index: nextOrder,
        });
        if (!result?.success) {
          setErrorMsg(
            result?.message ??
              label("Erro ao adicionar treino.", "Failed to add workout."),
          );
          return;
        }
        onSaved?.();
        onClose();
      } catch (err: any) {
        setErrorMsg(
          err?.message ?? label("Erro inesperado.", "Unexpected error."),
        );
      }
    });
  }

  const sourceTabs: Array<{ value: SourceKind; label: string }> = [
    { value: "program", label: label("Programas", "Programs") },
    { value: "api", label: label("Catálogo (API)", "Catalog (API)") },
    {
      value: "catalog",
      label: label("Exercícios cadastrados", "Saved exercises"),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) onClose();
      }}
      className="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <div>
          <ModalTitle>
            {label("Adicionar Treino ao Kit", "Add Workout to Kit")}
          </ModalTitle>
          {kitName && (
            <p className="text-sm text-text-secondary mt-1">{kitName}</p>
          )}
        </div>
        <ModalClose disabled={isPending} onClick={onClose} />
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Categoria", "Category")}
              </label>
              <Select
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
              >
                <option value="">
                  -- {label("Sem categoria", "No category")} --
                </option>
                {CATEGORY_LABELS.map((letter) => (
                  <option key={letter} value={letter}>
                    {label("Treino", "Workout")} {letter}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Dia da semana", "Day of week")}
              </label>
              <Select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
              >
                <option value="">
                  -- {label("Sem dia definido", "No day set")} --
                </option>
                {Object.entries(WEEKDAY_LABELS).map(([value, names]) => (
                  <option key={value} value={value}>
                    {label(names.pt, names.en)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex flex-wrap gap-1 rounded-lg bg-surface-secondary p-1">
              {sourceTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setSource(tab.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    source === tab.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-text-secondary hover:text-text"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {source === "program" && (
              <Select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                <option value="">
                  -- {label("Selecione um programa", "Select a program")} --
                </option>
                {programOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {locale === "pt-BR" ? p.title_pt : p.title_en}
                  </option>
                ))}
              </Select>
            )}

            {source === "catalog" && (
              <Select
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
              >
                <option value="">
                  -- {label("Selecione um exercício", "Select an exercise")} --
                </option>
                {exerciseOptions.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {locale === "pt-BR" ? ex.name_pt : ex.name_en}
                    {ex.source === "exercisedb" ? " (API)" : ""}
                  </option>
                ))}
              </Select>
            )}

            {source === "api" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <Input
                    value={apiQuery}
                    onChange={(e) => setApiQuery(e.target.value)}
                    placeholder={label(
                      "Buscar exercício na API...",
                      "Search exercise in API...",
                    )}
                    className="pl-10"
                  />
                </div>

                {apiLoading ? (
                  <p className="flex items-center gap-2 text-xs text-text-secondary">
                    <RefreshCw size={14} className="animate-spin" />
                    {t("loading")}
                  </p>
                ) : apiError ? (
                  <p className="rounded-lg border border-yellow-600/40 bg-yellow-600/10 px-3 py-2 text-xs text-yellow-500">
                    {label(
                      "Não foi possível carregar o catálogo da API.",
                      "Could not load the API catalog.",
                    )}
                  </p>
                ) : apiItems.length === 0 ? (
                  <p className="text-xs text-text-secondary">
                    {label(
                      "Nenhum exercício encontrado.",
                      "No exercises found.",
                    )}
                  </p>
                ) : (
                  <div className="grid max-h-[320px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                    {apiItems.map((exercise) => {
                      const selected =
                        apiExercise?.exerciseId === exercise.exerciseId;
                      return (
                        <button
                          key={exercise.exerciseId}
                          type="button"
                          onClick={() => setApiExercise(exercise)}
                          className={`flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                            selected
                              ? "border-primary ring-2 ring-primary/40"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="relative flex h-28 w-full items-center justify-center bg-surface-secondary">
                            {exercise.gifUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={exercise.gifUrl}
                                alt={exercise.name}
                                loading="lazy"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <ImageOff
                                size={22}
                                className="text-text-secondary"
                              />
                            )}
                          </div>
                          <div className="space-y-1 p-2">
                            <p className="line-clamp-2 text-xs font-semibold capitalize text-text">
                              {exercise.name || label("Sem nome", "Unnamed")}
                            </p>
                            {exercise.bodyParts.length > 0 && (
                              <Badge
                                variant="outline"
                                className="px-1.5 py-0.5 text-[10px] capitalize"
                              >
                                {exercise.bodyParts[0]}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {source === "api" && apiExercise && (
            <p className="flex items-center gap-2 text-xs text-text-secondary">
              <Dumbbell size={14} className="text-primary" />
              {label("Selecionado:", "Selected:")}{" "}
              <span className="font-semibold text-text capitalize">
                {apiExercise.name}
              </span>
            </p>
          )}

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
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isPending || !canSubmit}>
            <Plus size={16} className="mr-2" />
            {isPending ? t("loading") : label("Adicionar", "Add")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default KitItemUpsertModal;
