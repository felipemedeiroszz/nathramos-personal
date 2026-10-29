"use client";
import { useAsyncTransition } from "@/hooks/useAsyncTransition";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
} from "@/components/ui/Modal";
import {
  AlertTriangle,
  Dumbbell,
  Edit,
  Eye,
  ImageOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteExerciseAction,
  saveExerciseAction,
} from "@/app/actions/workouts";
import { getWorkoutLabels } from "@/lib/workoutLabels";
import type { ExerciseRow } from "@/types";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, DIFFICULTY_LEVELS } from "@/types";

const ExerciseUpsertModal = dynamic(
  () =>
    import("@/components/admin/workout/ExerciseUpsertModal").then(
      (mod) => mod.ExerciseUpsertModal,
    ),
  { ssr: false },
);

interface OwnExercisesClientProps {
  locale: string;
  userId: string;
  title: string;
  subtitle: string;
  exercises: ExerciseRow[];
}

export function OwnExercisesClient({
  locale,
  userId,
  title,
  subtitle,
  exercises,
}: OwnExercisesClientProps) {
  const router = useRouter();
  const localeCode = useLocale();
  const [isPending, startTransition] = useAsyncTransition();

  const label = (pt: string, en: string) => (localeCode === "pt-BR" ? pt : en);
  const {
    muscle: muscleLabels,
    equipment: equipmentLabels,
    difficulty: difficultyLabels,
  } = getWorkoutLabels(localeCode);

  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const [details, setDetails] = useState<ExerciseRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ExerciseRow | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchSearch =
        !term ||
        ex.name_pt.toLowerCase().includes(term) ||
        ex.name_en.toLowerCase().includes(term);
      const matchMuscle = !muscleFilter || ex.primary_muscle === muscleFilter;
      const matchEquipment =
        !equipmentFilter || ex.equipment === equipmentFilter;
      const matchDifficulty =
        !difficultyFilter || ex.difficulty === difficultyFilter;
      return matchSearch && matchMuscle && matchEquipment && matchDifficulty;
    });
  }, [exercises, search, muscleFilter, equipmentFilter, difficultyFilter]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    muscleFilter.length > 0 ||
    equipmentFilter.length > 0 ||
    difficultyFilter.length > 0;

  function clearFilters() {
    setSearch("");
    setMuscleFilter("");
    setEquipmentFilter("");
    setDifficultyFilter("");
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(ex: ExerciseRow) {
    setEditing(ex);
    setModalOpen(true);
  }

  function onSaved() {
    setModalOpen(false);
    setEditing(null);
    router.refresh();
  }

  function confirmDelete() {
    if (!deleteConfirm) return;
    const id = deleteConfirm.id;
    startTransition(async () => {
      setDeleteError(null);
      try {
        const result = await deleteExerciseAction(id);
        if (!result.success) {
          setDeleteError(result.message);
          return;
        }
        setDeleteConfirm(null);
        router.refresh();
      } catch (error) {
        setDeleteError(
          error instanceof Error
            ? error.message
            : label("Falha ao excluir.", "Deletion failed."),
        );
      }
    });
  }

  function displayName(ex: ExerciseRow) {
    return localeCode === "pt-BR" ? ex.name_pt : ex.name_en || ex.name_pt;
  }

  function instructionsOf(ex: ExerciseRow) {
    const list =
      localeCode === "pt-BR" ? ex.instructions_pt : ex.instructions_en;
    return Array.isArray(list) ? list : [];
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{subtitle}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Dumbbell size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={label(
                  "Buscar exercício por nome...",
                  "Search exercise by name...",
                )}
                className="pl-10"
              />
            </div>
            <Select
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value)}
              className="md:w-52"
            >
              <option value="">{label("Músculo: Todos", "Muscle: All")}</option>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {muscleLabels[m] ?? m}
                </option>
              ))}
            </Select>
            <Select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              className="md:w-52"
            >
              <option value="">
                {label("Equipamento: Todos", "Equipment: All")}
              </option>
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq} value={eq}>
                  {equipmentLabels[eq] ?? eq}
                </option>
              ))}
            </Select>
            <Select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="md:w-44"
            >
              <option value="">{label("Nível: Todos", "Level: All")}</option>
              {DIFFICULTY_LEVELS.map((d) => (
                <option key={d} value={d}>
                  {difficultyLabels[d] ?? d}
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
                {label("Limpar filtros", "Clear filters")}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-text-secondary">
              {filtered.length}{" "}
              {filtered.length === 1
                ? label("exercício", "exercise")
                : label("exercícios", "exercises")}
            </p>
            <Button variant="primary" size="md" onClick={openCreate}>
              <Plus size={18} className="mr-2" />
              {label("Novo Exercício", "New Exercise")}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-surface">
              <EmptyState
                icon={<Dumbbell size={28} className="text-primary" />}
                title={label(
                  "Nenhum exercício encontrado",
                  "No exercises found",
                )}
                description={
                  hasActiveFilters
                    ? label(
                        "Ajuste a busca ou os filtros para ver mais resultados.",
                        "Adjust the search or filters to see more results.",
                      )
                    : label(
                        "Crie seu primeiro exercício com GIF ou imagem.",
                        "Create your first exercise with a GIF or image.",
                      )
                }
                action={
                  !hasActiveFilters ? (
                    <Button variant="primary" size="sm" onClick={openCreate}>
                      <Plus size={16} className="mr-2" />
                      {label("Novo Exercício", "New Exercise")}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((ex) => (
                <article
                  key={ex.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface transition-colors duration-150 hover:border-primary/30"
                >
                  <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-surface-secondary">
                    {ex.gif_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ex.gif_url}
                        alt={displayName(ex)}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-text-secondary">
                        <ImageOff size={28} />
                        <span className="text-xs">
                          {label("Sem mídia", "No media")}
                        </span>
                      </div>
                    )}
                    {!ex.is_published && (
                      <Badge
                        variant="outline"
                        className="absolute left-2 top-2"
                      >
                        {label("Rascunho", "Draft")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold capitalize text-text">
                      {displayName(ex)}
                    </h3>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className="px-2 py-0.5 text-[11px]"
                      >
                        {muscleLabels[ex.primary_muscle] ?? ex.primary_muscle}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="px-2 py-0.5 text-[11px]"
                      >
                        {equipmentLabels[ex.equipment] ?? ex.equipment}
                      </Badge>
                      <Badge
                        variant="default"
                        className="px-2 py-0.5 text-[11px]"
                      >
                        {difficultyLabels[ex.difficulty] ?? ex.difficulty}
                      </Badge>
                    </div>

                    {(ex.description_pt || ex.description_en) && (
                      <p className="line-clamp-2 text-xs text-text-secondary">
                        {localeCode === "pt-BR"
                          ? ex.description_pt || ex.description_en
                          : ex.description_en || ex.description_pt}
                      </p>
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setDetails(ex)}
                        className="flex-1"
                      >
                        <Eye size={15} className="mr-1.5" />
                        {label("Ver detalhes", "View details")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        title={label("Editar", "Edit")}
                        onClick={() => openEdit(ex)}
                      >
                        <Edit size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-red-500 hover:text-red-500"
                        title={label("Excluir", "Delete")}
                        onClick={() => setDeleteConfirm(ex)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {ExerciseUpsertModal && modalOpen && (
        <ExerciseUpsertModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          exercise={editing ?? undefined}
          onSubmit={saveExerciseAction}
          onSaved={onSaved}
          userId={userId}
        />
      )}

      <ExerciseDetailsModal
        exercise={details}
        onClose={() => setDetails(null)}
        displayName={displayName}
        instructionsOf={instructionsOf}
        muscleLabels={muscleLabels}
        equipmentLabels={equipmentLabels}
        difficultyLabels={difficultyLabels}
        label={label}
      />

      <Dialog
        isOpen={!!deleteConfirm}
        onClose={() => !isPending && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <DialogTitle>
                {label("Confirmar exclusão", "Confirm deletion")}
              </DialogTitle>
            </div>
            <DialogDescription>
              {label(
                "Tem certeza que deseja excluir o exercício",
                "Are you sure you want to delete the exercise",
              )}{" "}
              <span className="font-semibold text-text">
                {deleteConfirm ? displayName(deleteConfirm) : ""}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-red-500">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirm(null)}
              disabled={isPending}
            >
              {label("Cancelar", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              <Trash2 size={16} className="mr-2" />
              {isPending
                ? label("Excluindo...", "Deleting...")
                : label("Excluir", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ExerciseDetailsModalProps {
  exercise: ExerciseRow | null;
  onClose: () => void;
  displayName: (ex: ExerciseRow) => string;
  instructionsOf: (ex: ExerciseRow) => string[];
  muscleLabels: Record<string, string>;
  equipmentLabels: Record<string, string>;
  difficultyLabels: Record<string, string>;
  label: (pt: string, en: string) => string;
}

function ExerciseDetailsModal({
  exercise,
  onClose,
  displayName,
  instructionsOf,
  muscleLabels,
  equipmentLabels,
  difficultyLabels,
  label,
}: ExerciseDetailsModalProps) {
  if (!exercise) return null;

  const name = displayName(exercise);
  const instructions = instructionsOf(exercise);
  const description = exercise.description_pt || exercise.description_en;

  return (
    <Modal
      isOpen
      onClose={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="max-h-[90vh] max-w-2xl overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle className="pr-4 capitalize">{name}</ModalTitle>
        <ModalClose
          onClick={onClose}
          aria-label={label("Fechar", "Close")}
          autoFocus
        />
      </ModalHeader>

      <ModalBody className="space-y-4">
        <div className="relative flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl bg-surface-secondary">
          {exercise.gif_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={exercise.gif_url}
              alt={name}
              className="max-h-80 w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-text-secondary">
              <ImageOff size={32} />
              <span className="text-xs">{label("Sem mídia", "No media")}</span>
            </div>
          )}
        </div>

        {description && (
          <p className="text-sm leading-relaxed text-text-secondary">
            {description}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoBlock
            label={label("Músculo principal", "Primary muscle")}
            values={[
              muscleLabels[exercise.primary_muscle] ?? exercise.primary_muscle,
            ]}
          />
          <InfoBlock
            label={label("Equipamento", "Equipment")}
            values={[equipmentLabels[exercise.equipment] ?? exercise.equipment]}
          />
          <InfoBlock
            label={label("Dificuldade", "Difficulty")}
            values={[
              difficultyLabels[exercise.difficulty] ?? exercise.difficulty,
            ]}
          />
        </div>

        {Array.isArray(exercise.secondary_muscles) &&
          exercise.secondary_muscles.length > 0 && (
            <InfoBlock
              label={label("Músculos secundários", "Secondary muscles")}
              values={exercise.secondary_muscles.map(
                (m) => muscleLabels[m] ?? m,
              )}
            />
          )}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-text">
            {label("Instruções de execução", "Execution instructions")}
          </h4>
          {instructions.length > 0 ? (
            <ol className="space-y-2">
              {instructions.map((step, index) => (
                <li
                  key={`${index}-${step.slice(0, 12)}`}
                  className="flex gap-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm italic text-text-secondary/80">
              {label(
                "Nenhuma instrução informada.",
                "No instructions provided.",
              )}
            </p>
          )}
        </div>

        {exercise.video_url && (
          <a
            href={exercise.video_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            {label("Assistir ao vídeo", "Watch video")}
          </a>
        )}
      </ModalBody>
    </Modal>
  );
}

function InfoBlock({
  label: title,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-secondary/40 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.filter(Boolean).map((value) => (
          <Badge
            key={value}
            variant="outline"
            className="px-2 py-0.5 text-[11px]"
          >
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default OwnExercisesClient;
