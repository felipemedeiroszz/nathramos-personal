"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Dumbbell, RefreshCw, Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react";
import { syncExercisesAction, deleteExerciseAction } from "@/app/actions/workouts";
import type { ExerciseRow, MuscleGroup, Equipment, Difficulty, ExerciseSource } from "@/types";

const ExerciseUpsertModal = dynamic(
  () => import("@/components/admin/workout/ExerciseUpsertModal").catch(() => () => null),
  { ssr: false }
);

interface TranslatorFn {
  (key: string): string;
}

interface AdminExerciciosClientProps {
  locale: string;
  userId: string;
  title: string;
  exercises: ExerciseRow[];
  translateMuscle: TranslatorFn;
  translateEquipment: TranslatorFn;
  translateDifficulty: TranslatorFn;
  searchValue: string;
  sourceValue: string;
  muscleValue: string;
  equipmentValue: string;
  difficultyValue: string;
  publishedValue: string;
  muscleGroups: MuscleGroup[];
  equipmentTypes: Equipment[];
  difficultyLevels: Difficulty[];
  exerciseSources: ExerciseSource[];
}

export function AdminExerciciosClient({
  locale,
  userId,
  title,
  exercises,
  translateMuscle,
  translateEquipment,
  translateDifficulty,
  searchValue,
  sourceValue,
  muscleValue,
  equipmentValue,
  difficultyValue,
  publishedValue,
  muscleGroups,
  equipmentTypes,
  difficultyLevels,
  exerciseSources,
}: AdminExerciciosClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState(searchValue);
  const [source, setSource] = useState(sourceValue);
  const [muscle, setMuscle] = useState(muscleValue);
  const [equipment, setEquipment] = useState(equipmentValue);
  const [difficulty, setDifficulty] = useState(difficultyValue);
  const [published, setPublished] = useState(publishedValue);

  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  function applyFilters() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (source) params.set("source", source);
    if (muscle) params.set("muscle", muscle);
    if (equipment) params.set("equipment", equipment);
    if (difficulty) params.set("difficulty", difficulty);
    if (published) params.set("published", published);
    const qs = params.toString();
    router.push(`/${locale}/admin/exercicios${qs ? "?" + qs : ""}`);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await syncExercisesAction();
    } finally {
      setSyncing(false);
      router.refresh();
    }
  }

  function openCreate() {
    setEditingExercise(null);
    setModalOpen(true);
  }

  function openEdit(ex: ExerciseRow) {
    setEditingExercise(ex);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteExerciseAction(deleteConfirm.id);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
      router.refresh();
    }
  }

  function onModalSaved() {
    setModalOpen(false);
    setEditingExercise(null);
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                Total exibido: <span className="font-semibold text-text">{exercises.length}</span>
                {exercises.length >= 50 && <span className="ml-2 text-xs">(primeiros 50)</span>}
              </CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Dumbbell size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <Input
                placeholder="Buscar por nome..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw size={18} className={`mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar ExerciseDB"}
              </Button>
              <Button variant="primary" size="md" onClick={openCreate}>
                <Plus size={18} className="mr-2" />
                Novo Exercicio
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select
              className="w-full sm:w-auto min-w-[160px]"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onBlur={applyFilters}
            >
              <option value="">Origem: Todos</option>
              {exerciseSources.map((s) => (
                <option key={s} value={s}>
                  Origem: {s === "exercisedb" ? "ExerciseDB" : "Custom"}
                </option>
              ))}
            </Select>
            <Select
              className="w-full sm:w-auto min-w-[180px]"
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
              onBlur={applyFilters}
            >
              <option value="">Grupo muscular: Todos</option>
              {muscleGroups.map((m) => (
                <option key={m} value={m}>
                  Grupo: {translateMuscle(m)}
                </option>
              ))}
            </Select>
            <Select
              className="w-full sm:w-auto min-w-[180px]"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              onBlur={applyFilters}
            >
              <option value="">Equipamento: Todos</option>
              {equipmentTypes.map((eq) => (
                <option key={eq} value={eq}>
                  Equip: {translateEquipment(eq)}
                </option>
              ))}
            </Select>
            <Select
              className="w-full sm:w-auto min-w-[160px]"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              onBlur={applyFilters}
            >
              <option value="">Dificuldade: Todas</option>
              {difficultyLevels.map((d) => (
                <option key={d} value={d}>
                  Dific: {translateDifficulty(d)}
                </option>
              ))}
            </Select>
            <Select
              className="w-full sm:w-auto min-w-[160px]"
              value={published}
              onChange={(e) => setPublished(e.target.value)}
              onBlur={applyFilters}
            >
              <option value="">Publicacao: Todos</option>
              <option value="1">Publicado</option>
              <option value="0">Rascunho</option>
            </Select>
          </div>

          {exercises.length === 0 ? (
            <EmptyState
              icon={<Dumbbell size={28} className="text-text-secondary" />}
              title="Nenhum exercicio encontrado"
              description="Ajuste os filtros ou crie um novo exercicio personalizado."
              action={
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Plus size={16} className="mr-2" />
                  Novo Exercicio
                </Button>
              }
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome (pt/en)</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Dificuldade</TableHead>
                    <TableHead>Tr. bloqueado</TableHead>
                    <TableHead>Publicado</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercises.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-text">{ex.name_pt}</span>
                          <span className="text-xs text-text-secondary">{ex.name_en}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text">{translateMuscle(ex.primary_muscle)}</TableCell>
                      <TableCell className="text-text">{translateEquipment(ex.equipment)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={ex.source === "exercisedb" ? "default" : "outline"}
                          className={
                            ex.source === "exercisedb"
                              ? "bg-blue-500/10 text-blue-400 border-0"
                              : undefined
                          }
                        >
                          {ex.source === "exercisedb" ? "ExerciseDB" : "Custom"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text">{translateDifficulty(ex.difficulty)}</TableCell>
                      <TableCell>
                        {ex.translation_locked ? (
                          <Badge variant="warning">Sim</Badge>
                        ) : (
                          <Badge variant="outline" className="text-text-secondary">
                            Nao
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {ex.is_published ? (
                          <Badge variant="success">Sim</Badge>
                        ) : (
                          <Badge variant="outline" className="text-text-secondary">
                            Nao
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Editar"
                            onClick={() => openEdit(ex)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Excluir"
                            className="text-red-500 hover:text-red-500"
                            onClick={() =>
                              setDeleteConfirm({ id: ex.id, name: ex.name_pt })
                            }
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {ExerciseUpsertModal && modalOpen && (
        <ExerciseUpsertModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingExercise(null);
          }}
          onSaved={onModalSaved}
          exercise={editingExercise ?? undefined}
          userId={userId}
        />
      )}

      <Dialog
        isOpen={!!deleteConfirm}
        onClose={() => !deleting && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <DialogTitle>Confirmar exclusao</DialogTitle>
            </div>
            <DialogDescription>
              Tem certeza que deseja excluir o exercicio{" "}
              <span className="font-semibold text-text">{deleteConfirm?.name}</span>?
              Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              <Trash2 size={16} className="mr-2" />
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
