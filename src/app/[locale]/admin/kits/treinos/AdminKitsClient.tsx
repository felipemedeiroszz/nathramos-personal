"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import {
  FolderKanban,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Star,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  X,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import {
  deleteKitAction,
  saveWorkoutKitAction,
  removeWorkoutKitItemAction,
  reorderWorkoutKitItemsAction,
} from "@/app/actions/workouts";
import type {
  WorkoutKitRow,
  WorkoutKitItemWithSource,
} from "@/types";
import type { KitExerciseOption, KitProgramOption } from "@/components/admin/workout/KitItemUpsertModal";

const KitUpsertModal = dynamic(
  () => import("@/components/admin/workout/KitUpsertModal").catch(() => () => null),
  { ssr: false }
);

const KitItemUpsertModal = dynamic(
  () => import("@/components/admin/workout/KitItemUpsertModal").catch(() => () => null),
  { ssr: false }
);

const WEEKDAY_LABELS: Record<number, { pt: string; en: string }> = {
  1: { pt: "Segunda", en: "Monday" },
  2: { pt: "Terça", en: "Tuesday" },
  3: { pt: "Quarta", en: "Wednesday" },
  4: { pt: "Quinta", en: "Thursday" },
  5: { pt: "Sexta", en: "Friday" },
  6: { pt: "Sábado", en: "Saturday" },
  7: { pt: "Domingo", en: "Sunday" },
};

interface KitWithItems extends WorkoutKitRow {
  items: WorkoutKitItemWithSource[];
}

interface AdminKitsClientProps {
  locale: string;
  userId: string;
  title: string;
  subtitle: string;
  kits: KitWithItems[];
  programOptions: KitProgramOption[];
  exerciseOptions: KitExerciseOption[];
  difficultyLabels: Record<string, string>;
}

export function AdminKitsClient({
  locale,
  userId,
  title,
  subtitle,
  kits,
  programOptions,
  exerciseOptions,
  difficultyLabels,
}: AdminKitsClientProps) {
  const router = useRouter();
  const localeCode = useLocale();
  const label = (pt: string, en: string) => (localeCode === "pt-BR" ? pt : en);

  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<KitWithItems | null>(null);
  const [expandedKitId, setExpandedKitId] = useState<string | null>(kits[0]?.id ?? null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [itemModalKit, setItemModalKit] = useState<KitWithItems | null>(null);

  const filteredKits = kits.filter((k) => {
    const matchSearch =
      !search.trim() ||
      k.name_pt.toLowerCase().includes(search.toLowerCase()) ||
      k.name_en.toLowerCase().includes(search.toLowerCase()) ||
      (k.short_desc_pt ?? "").toLowerCase().includes(search.toLowerCase());
    const matchDiff = !difficultyFilter || k.difficulty === difficultyFilter;
    const matchFeatured =
      !featuredFilter ||
      (featuredFilter === "1" ? k.is_featured : !k.is_featured);
    const matchPublished =
      !publishedFilter ||
      (publishedFilter === "1" ? k.is_published : !k.is_published);
    return matchSearch && matchDiff && matchFeatured && matchPublished;
  });

  function openCreate() {
    setEditingKit(null);
    setModalOpen(true);
  }

  function openEdit(kit: KitWithItems) {
    setEditingKit(kit);
    setModalOpen(true);
  }

  function toggleExpand(id: string) {
    setExpandedKitId(expandedKitId === id ? null : id);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteKitAction(deleteConfirm.id);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
      router.refresh();
    }
  }

  function onModalSaved() {
    setModalOpen(false);
    setEditingKit(null);
    router.refresh();
  }

  async function handleRemoveItem(itemId: string) {
    try {
      await removeWorkoutKitItemAction(itemId);
    } finally {
      router.refresh();
    }
  }

  async function handleMoveItem(kitId: string, items: WorkoutKitItemWithSource[], index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    try {
      const reordered = items.map((it, i) => ({ id: it.id, order_index: i + 1 }));
      const tmp = reordered[index];
      reordered[index] = reordered[target];
      reordered[target] = tmp;
      await reorderWorkoutKitItemsAction(kitId, reordered);
    } finally {
      router.refresh();
    }
  }

  function itemTitle(item: WorkoutKitItemWithSource): string {
    if (item.program) {
      return localeCode === "pt-BR"
        ? item.program.title_pt
        : item.program.title_en || item.program.title_pt;
    }
    if (item.exercise) {
      return localeCode === "pt-BR"
        ? item.exercise.name_pt
        : item.exercise.name_en || item.exercise.name_pt;
    }
    return label("Treino removido", "Removed workout");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{subtitle}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderKanban size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 flex-wrap">
              <Select
                className="w-full sm:max-w-[200px]"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="">{label("Todas dificuldades", "All difficulties")}</option>
                <option value="beginner">{label("Iniciante", "Beginner")}</option>
                <option value="intermediate">{label("Intermediário", "Intermediate")}</option>
                <option value="advanced">{label("Avançado", "Advanced")}</option>
              </Select>
              <Select
                className="w-full sm:max-w-[160px]"
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value)}
              >
                <option value="">{label("Destaque: Todos", "Featured: All")}</option>
                <option value="1">{label("Sim", "Yes")}</option>
                <option value="0">{label("Não", "No")}</option>
              </Select>
              <Select
                className="w-full sm:max-w-[160px]"
                value={publishedFilter}
                onChange={(e) => setPublishedFilter(e.target.value)}
              >
                <option value="">{label("Publicado: Todos", "Published: All")}</option>
                <option value="1">{label("Sim", "Yes")}</option>
                <option value="0">{label("Não", "No")}</option>
              </Select>
              <div className="relative flex-1 sm:max-w-sm">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <Input
                  placeholder={label("Buscar kit...", "Search kit...")}
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button variant="primary" size="md" className="shrink-0" onClick={openCreate}>
              <Plus size={18} className="mr-2" />
              {label("Novo Kit", "New Kit")}
            </Button>
          </div>

          {filteredKits.length === 0 ? (
            <EmptyState
              icon={<FolderKanban size={28} className="text-text-secondary" />}
              title={label("Nenhum kit encontrado", "No kits found")}
              description={label(
                "Crie seu primeiro kit de treino ou ajuste os filtros.",
                "Create your first workout kit or adjust the filters."
              )}
              action={
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Plus size={16} className="mr-2" />
                  {label("Novo Kit", "New Kit")}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredKits.map((kit) => {
                const expanded = expandedKitId === kit.id;
                return (
                  <div key={kit.id} className="space-y-2">
                    <Card className="border border-border hover:border-primary/50 transition-colors flex flex-col">
                      <CardContent className="p-0 flex flex-col flex-1">
                        <div className="relative aspect-video w-full overflow-hidden rounded-t-xl">
                          {kit.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={kit.cover_image_url}
                              alt={kit.name_pt}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-surface-secondary to-surface" />
                          )}
                          {!kit.cover_image_url && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <FolderKanban size={42} className="text-primary/40" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 z-10 flex gap-2">
                            {kit.is_featured && (
                              <Badge variant="warning" className="shadow-[0_0_12px_hsl(var(--warning)/0.3)]">
                                <Star size={12} className="mr-1 fill-current" />
                                {label("Destaque", "Featured")}
                              </Badge>
                            )}
                            {kit.is_published ? (
                              <Badge variant="success">{label("Publicado", "Published")}</Badge>
                            ) : (
                              <Badge variant="outline">{label("Rascunho", "Draft")}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-5 space-y-3 flex flex-col flex-1">
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-text leading-tight">
                              {kit.name_pt}
                            </h3>
                            <p className="text-xs text-text-secondary">{kit.name_en}</p>
                          </div>

                          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
                            {kit.short_desc_pt ||
                              kit.short_desc_en ||
                              kit.description_pt ||
                              label("Sem descrição curta.", "No short description.")}
                          </p>

                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">
                                {difficultyLabels[kit.difficulty] ?? kit.difficulty}
                              </Badge>
                              <Badge variant="outline">
                                {kit.total_weeks} {label("sem", "wk")} x {kit.days_per_week}{" "}
                                {label("dias", "days")}
                              </Badge>
                              <span className="text-xs text-text-secondary">
                                {kit.est_minutes_per_session} {label("min/sessão", "min/session")}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title={label("Editar", "Edit")}
                                onClick={() => openEdit(kit)}
                              >
                                <Edit size={15} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title={expanded ? label("Recolher editor", "Collapse editor") : label("Abrir editor", "Open editor")}
                                onClick={() => toggleExpand(kit.id)}
                              >
                                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                                title={label("Excluir", "Delete")}
                                onClick={() => setDeleteConfirm({ id: kit.id, name: kit.name_pt })}
                              >
                                <Trash2 size={15} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {expanded && (
                      <Card className="border border-border border-primary/40">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <CardTitle className="text-base">
                                {label("Conteúdo do Kit", "Kit Content")}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {kit.items.length} {label("treino", "workout")}
                                {kit.items.length === 1 ? "" : label("s", "s")}{" "}
                                {label("associado", "associated")}
                                {kit.items.length === 1 ? "" : label("s", "s")}
                              </CardDescription>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => setItemModalKit(kit)}>
                              <Plus size={14} className="mr-1" />
                              {label("Adicionar Treino", "Add Workout")}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {kit.items.length === 0 ? (
                            <EmptyState
                              icon={<ArrowUpRight size={22} className="text-text-secondary" />}
                              title={label("Sem treinos", "No workouts")}
                              description={label(
                                "Adicione programas ou exercícios para montar este kit.",
                                "Add programs or exercises to build this kit."
                              )}
                              action={
                                <Button variant="primary" size="sm" onClick={() => setItemModalKit(kit)}>
                                  <Plus size={14} className="mr-1" />
                                  {label("Adicionar", "Add")}
                                </Button>
                              }
                              className="py-4"
                            />
                          ) : (
                            <div className="rounded-xl border border-border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[70px]">{label("Cat.", "Cat.")}</TableHead>
                                    <TableHead>{label("Treino", "Workout")}</TableHead>
                                    <TableHead className="w-[140px]">{label("Dia", "Day")}</TableHead>
                                    <TableHead className="w-[130px]">{label("Origem", "Source")}</TableHead>
                                    <TableHead className="w-[120px] text-right">
                                      {label("Ações", "Actions")}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {kit.items.map((item, i) => {
                                    const isExercise = !item.program && !!item.exercise;
                                    const weekday = item.day_of_week
                                      ? WEEKDAY_LABELS[item.day_of_week]
                                      : null;
                                    const originLabel = item.program
                                      ? label("Programa", "Program")
                                      : item.exercise?.source === "exercisedb"
                                        ? label("Exercício (API)", "Exercise (API)")
                                        : label("Exercício", "Exercise");
                                    return (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          <Badge
                                            variant="default"
                                            className="w-8 h-8 rounded-full flex items-center justify-center p-0 text-sm"
                                          >
                                            {item.category_label ?? i + 1}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-text">
                                          {itemTitle(item)}
                                          {isExercise && item.exercise?.primary_muscle && (
                                            <span className="block text-xs font-normal text-text-secondary capitalize">
                                              {item.exercise.primary_muscle.replace(/_/g, " ")}
                                            </span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-text">
                                          {weekday ? (
                                            <Badge variant="outline">
                                              {label(weekday.pt, weekday.en)}
                                            </Badge>
                                          ) : (
                                            <span className="text-text-secondary text-xs">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="text-[11px]">
                                            {originLabel}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center justify-end space-x-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                              title={label("Subir", "Move up")}
                                              disabled={i === 0}
                                              onClick={() => handleMoveItem(kit.id, kit.items, i, -1)}
                                            >
                                              <ArrowUp size={14} />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                              title={label("Descer", "Move down")}
                                              disabled={i === kit.items.length - 1}
                                              onClick={() => handleMoveItem(kit.id, kit.items, i, 1)}
                                            >
                                              <ArrowDown size={14} />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                                              title={label("Remover", "Remove")}
                                              onClick={() => handleRemoveItem(item.id)}
                                            >
                                              <X size={14} />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {KitUpsertModal && modalOpen && (
        <KitUpsertModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingKit(null);
          }}
          onSubmit={async (payload) => {
            await saveWorkoutKitAction(payload);
          }}
          onSaved={onModalSaved}
          kit={editingKit ?? undefined}
          userId={userId}
        />
      )}

      {KitItemUpsertModal && itemModalKit && (
        <KitItemUpsertModal
          isOpen={!!itemModalKit}
          onClose={() => setItemModalKit(null)}
          kitId={itemModalKit.id}
          kitName={itemModalKit.name_pt}
          nextOrder={itemModalKit.items.length + 1}
          programOptions={programOptions}
          exerciseOptions={exerciseOptions}
          onSaved={() => router.refresh()}
        />
      )}

      <Dialog isOpen={!!deleteConfirm} onClose={() => !deleting && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <DialogTitle>{label("Confirmar exclusão", "Confirm deletion")}</DialogTitle>
            </div>
            <DialogDescription>
              {label("Tem certeza que deseja excluir o kit", "Are you sure you want to delete the kit")}{" "}
              <span className="font-semibold text-text">{deleteConfirm?.name}</span>?{" "}
              {label(
                "Os programas associados não serão removidos.",
                "Associated programs will not be removed."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
              {label("Cancelar", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              <Trash2 size={16} className="mr-2" />
              {deleting ? label("Excluindo...", "Deleting...") : label("Excluir", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
