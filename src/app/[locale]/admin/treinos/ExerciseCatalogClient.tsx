"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal, ModalHeader, ModalTitle, ModalClose, ModalBody } from "@/components/ui/Modal";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  ImageOff,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import type { ExerciseDbExercise } from "@/lib/exercisedb";

const PAGE_SIZE = 24;

export interface ExerciseCatalogPageMeta {
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
}

interface ExerciseCatalogClientProps {
  initialItems: ExerciseDbExercise[];
  initialMeta: ExerciseCatalogPageMeta;
  initialError: string | null;
  bodyParts: string[];
  muscles: string[];
  equipments: string[];
}

interface QueryState {
  q: string;
  bodyPart: string;
  muscle: string;
  equipment: string;
}

const EMPTY_QUERY: QueryState = { q: "", bodyPart: "", muscle: "", equipment: "" };

export function ExerciseCatalogClient({
  initialItems,
  initialMeta,
  initialError,
  bodyParts,
  muscles,
  equipments,
}: ExerciseCatalogClientProps) {
  const t = useTranslations("adminExerciseCatalog");

  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<ExerciseDbExercise[]>(initialItems);
  const [meta, setMeta] = useState<ExerciseCatalogPageMeta>(initialMeta);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [reloadToken, setReloadToken] = useState(0);

  const [afterCursor, setAfterCursor] = useState<string | null>(null);
  const [afterStack, setAfterStack] = useState<Array<string | null>>([]);

  const [selected, setSelected] = useState<ExerciseDbExercise | null>(null);

  const skipFirstFetch = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(query.q.trim());
      setAfterCursor(null);
      setAfterStack([]);
    }, 450);
    return () => clearTimeout(timer);
  }, [query.q]);

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (query.bodyPart) params.set("bodyPart", query.bodyPart);
        if (query.muscle) params.set("muscle", query.muscle);
        if (query.equipment) params.set("equipment", query.equipment);
        if (afterCursor) params.set("after", afterCursor);

        const response = await fetch(`/api/exercisedb/exercises?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);

        if (cancelled) return;

        if (!response.ok) {
          setItems([]);
          setError(payload?.code ?? "unavailable");
          return;
        }

        setItems(Array.isArray(payload?.items) ? payload.items : []);
        setMeta({
          total: typeof payload?.total === "number" ? payload.total : 0,
          hasNextPage: payload?.hasNextPage === true,
          hasPreviousPage: payload?.hasPreviousPage === true,
          nextCursor: payload?.nextCursor ?? null,
          previousCursor: payload?.previousCursor ?? null,
        });
      } catch (err) {
        if (cancelled || (err as Error)?.name === "AbortError") return;
        setItems([]);
        setError("unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedSearch, query.bodyPart, query.muscle, query.equipment, afterCursor, reloadToken]);

  const updateFilter = (patch: Partial<QueryState>) => {
    setQuery((prev) => ({ ...prev, ...patch }));
    setAfterCursor(null);
    setAfterStack([]);
  };

  const clearFilters = () => {
    setQuery(EMPTY_QUERY);
    setDebouncedSearch("");
    setAfterCursor(null);
    setAfterStack([]);
  };

  const goToNextPage = () => {
    if (!meta.nextCursor) return;
    setAfterStack((prev) => [...prev, afterCursor]);
    setAfterCursor(meta.nextCursor);
  };

  const goToPreviousPage = () => {
    if (afterStack.length === 0) return;
    const previous = afterStack[afterStack.length - 1];
    setAfterStack((prev) => prev.slice(0, -1));
    setAfterCursor(previous);
  };

  const retry = () => setReloadToken((value) => value + 1);

  const hasActiveFilters =
    query.q.trim().length > 0 ||
    query.bodyPart.length > 0 ||
    query.muscle.length > 0 ||
    query.equipment.length > 0;

  let errorMessage: string | null = null;
  if (error === "rate_limited") {
    errorMessage = t("errorRateLimited");
  } else if (error === "UNAUTHENTICATED" || error === "FORBIDDEN") {
    errorMessage = t("errorNotAuthenticated");
  } else if (error) {
    errorMessage = t("errorUnavailable");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <Input
            value={query.q}
            onChange={(event) => updateFilter({ q: event.target.value })}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="pl-10"
          />
        </div>

        <Select
          value={query.bodyPart}
          onChange={(event) => updateFilter({ bodyPart: event.target.value })}
          aria-label={t("filterBodyPart")}
          className="md:w-52"
        >
          <option value="">{t("filterBodyPart")}</option>
          {bodyParts.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>

        <Select
          value={query.muscle}
          onChange={(event) => updateFilter({ muscle: event.target.value })}
          aria-label={t("filterMuscle")}
          className="md:w-52"
        >
          <option value="">{t("filterMuscle")}</option>
          {muscles.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>

        <Select
          value={query.equipment}
          onChange={(event) => updateFilter({ equipment: event.target.value })}
          aria-label={t("filterEquipment")}
          className="md:w-52"
        >
          <option value="">{t("filterEquipment")}</option>
          {equipments.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="shrink-0"
          >
            <X size={16} className="mr-1" />
            {t("clearFilters")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">
          {t("resultsCount", { count: meta.total })}
          <span className="ml-1 opacity-70">· {t("totalAvailable", { total: meta.total })}</span>
        </p>
        {loading && (
          <span className="flex items-center gap-2 text-xs text-text-secondary">
            <RefreshCw size={14} className="animate-spin" />
            {t("loading")}
          </span>
        )}
      </div>

      {error && items.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface">
          <ErrorState
            title={t("errorTitle")}
            description={errorMessage ?? t("errorUnavailable")}
            action={
              <Button type="button" variant="secondary" size="sm" onClick={retry}>
                {t("retry")}
              </Button>
            }
          />
        </div>
      ) : loading && items.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-border/60 bg-surface">
              <Skeleton className="h-44 w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface">
          <EmptyState
            icon={<Dumbbell size={28} className="text-primary" />}
            title={t("emptyTitle")}
            description={t("emptyDesc")}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((exercise) => (
            <ExerciseCard
              key={exercise.exerciseId}
              exercise={exercise}
              onOpenDetails={() => setSelected(exercise)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={goToPreviousPage}
          disabled={afterStack.length === 0 || loading}
        >
          <ChevronLeft size={16} className="mr-1" />
          {t("previous")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={goToNextPage}
          disabled={!meta.hasNextPage || !meta.nextCursor || loading}
        >
          {t("next")}
          <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>

      <p className="text-center text-xs text-text-secondary/70">{t("attribution")}</p>

      <ExerciseDetailsModal exercise={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

interface ExerciseCardProps {
  exercise: ExerciseDbExercise;
  onOpenDetails: () => void;
}

function ExerciseCard({ exercise, onOpenDetails }: ExerciseCardProps) {
  const t = useTranslations("adminExerciseCatalog");
  const displayName = exercise.name || t("unnamedExercise");

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)]">
      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-surface-secondary">
        {exercise.gifUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={exercise.gifUrl}
            alt={t("imageAlt", { name: displayName })}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-secondary">
            <ImageOff size={28} />
            <span className="text-xs">{t("noImage")}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold capitalize text-text">{displayName}</h3>

        {exercise.bodyParts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {exercise.bodyParts.map((part) => (
              <Badge key={part} variant="outline" className="px-2 py-0.5 text-[11px] capitalize">
                {part}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-1 text-xs text-text-secondary">
          <p className="line-clamp-2">
            <span className="font-semibold">{t("targetMuscles")}: </span>
            {exercise.targetMuscles.length > 0 ? (
              <span className="capitalize">{exercise.targetMuscles.join(", ")}</span>
            ) : (
              <span className="italic opacity-80">{t("notProvided")}</span>
            )}
          </p>
          <p className="line-clamp-2">
            <span className="font-semibold">{t("equipments")}: </span>
            {exercise.equipments.length > 0 ? (
              <span className="capitalize">{exercise.equipments.join(", ")}</span>
            ) : (
              <span className="italic opacity-80">{t("notProvided")}</span>
            )}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onOpenDetails}
          className="mt-auto w-full"
        >
          {t("viewDetails")}
        </Button>
      </div>
    </article>
  );
}

interface ExerciseDetailsModalProps {
  exercise: ExerciseDbExercise | null;
  onClose: () => void;
}

function ExerciseDetailsModal({ exercise, onClose }: ExerciseDetailsModalProps) {
  const t = useTranslations("adminExerciseCatalog");
  const [details, setDetails] = useState<ExerciseDbExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const exerciseId = exercise?.exerciseId ?? null;

  useEffect(() => {
    if (!exerciseId) {
      setDetails(null);
      setFailed(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setDetails(null);
    setFailed(false);
    setLoading(true);

    fetch(`/api/exercisedb/exercises/${encodeURIComponent(exerciseId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !payload?.exercise) {
          setFailed(true);
          return;
        }
        setDetails(payload.exercise as ExerciseDbExercise);
      })
      .catch((err) => {
        if (cancelled || (err as Error)?.name === "AbortError") return;
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [exerciseId]);

  if (!exercise) return null;

  const current = details ?? exercise;
  const displayName = current.name || t("unnamedExercise");

  return (
    <Modal
      isOpen
      onClose={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={displayName}
      className="max-h-[90vh] max-w-2xl overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle className="pr-4 capitalize">{displayName}</ModalTitle>
        <ModalClose onClick={onClose} aria-label={t("close")} autoFocus />
      </ModalHeader>

      <ModalBody className="space-y-4">
        <div className="relative flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl bg-surface-secondary">
          {current.gifUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.gifUrl}
              alt={t("imageAlt", { name: displayName })}
              className="max-h-80 w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-text-secondary">
              <ImageOff size={32} />
              <span className="text-xs">{t("noImage")}</span>
            </div>
          )}
        </div>

        {loading && (
          <p className="flex items-center gap-2 text-xs text-text-secondary">
            <RefreshCw size={14} className="animate-spin" />
            {t("loadingDetails")}
          </p>
        )}

        {failed && !loading && (
          <p className="rounded-lg border border-yellow-600/40 bg-yellow-600/10 px-3 py-2 text-xs text-yellow-500">
            {t("detailsFallbackWarning")}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoBlock label={t("bodyPart")} values={current.bodyParts} capitalize />
          <InfoBlock label={t("equipments")} values={current.equipments} capitalize />
          <InfoBlock label={t("targetMuscles")} values={current.targetMuscles} capitalize />
          <InfoBlock
            label={t("secondaryMuscles")}
            values={current.secondaryMuscles}
            capitalize
          />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-text">{t("instructions")}</h4>
          {current.instructions.length > 0 ? (
            <ol className="space-y-2">
              {current.instructions.map((step, index) => (
                <li key={`${index}-${step.slice(0, 12)}`} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-text-secondary">{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm italic text-text-secondary/80">{t("notProvided")}</p>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}

interface InfoBlockProps {
  label: string;
  values: string[];
  capitalize?: boolean;
}

function InfoBlock({ label, values, capitalize }: InfoBlockProps) {
  const t = useTranslations("adminExerciseCatalog");

  return (
    <div className="rounded-xl border border-border/60 bg-surface-secondary/40 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Badge
              key={value}
              variant="outline"
              className={capitalize ? "px-2 py-0.5 text-[11px] capitalize" : "px-2 py-0.5 text-[11px]"}
            >
              {value}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-text-secondary/80">{t("notProvided")}</p>
      )}
    </div>
  );
}
