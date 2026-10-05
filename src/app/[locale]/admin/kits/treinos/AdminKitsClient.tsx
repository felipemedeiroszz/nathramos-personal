"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { deleteKitAction } from "@/app/actions/workouts";
import type {
  WorkoutKitRow,
  WorkoutKitItemRow,
  WorkoutStatus,
} from "@/types";

const KitUpsertModal = dynamic(
  () => import("@/components/admin/workout/KitUpsertModal").catch(() => () => null),
  { ssr: false }
);

interface KitWithItems extends WorkoutKitRow {
  items: Array<WorkoutKitItemRow & { program?: any }>;
}

interface TranslatorFn {
  (key: string): string;
}

interface AdminKitsClientProps {
  locale: string;
  userId: string;
  title: string;
  subtitle: string;
  kits: KitWithItems[];
  programOptions: { id: string; title_pt: string; title_en: string }[];
  translateDifficulty: TranslatorFn;
}

export function AdminKitsClient({
  locale,
  userId,
  title,
  subtitle,
  kits,
  programOptions,
  translateDifficulty,
}: AdminKitsClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<KitWithItems | null>(null);
  const [expandedKitId, setExpandedKitId] = useState<string | null>(kits[0]?.id ?? null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [addProgramOpenFor, setAddProgramOpenFor] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

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

  function openAddProgram(kitId: string) {
    setSelectedProgramId("");
    setAddProgramOpenFor(kitId);
  }

  async function handleAddProgram() {
    if (!addProgramOpenFor || !selectedProgramId) return;
    try {
      const { WorkoutKitService } = await import("@/services/WorkoutKitService");
      const kit = kits.find((k) => k.id === addProgramOpenFor);
      const nextOrder = kit ? kit.items.length + 1 : 1;
      await WorkoutKitService.upsertKitItem(addProgramOpenFor, selectedProgramId, nextOrder);
    } catch {
    } finally {
      setAddProgramOpenFor(null);
      setSelectedProgramId("");
      router.refresh();
    }
  }

  async function handleRemoveItem(itemId: string) {
    try {
      const { WorkoutKitService } = await import("@/services/WorkoutKitService");
      await WorkoutKitService.removeKitItem(itemId);
    } finally {
      router.refresh();
    }
  }

  async function handleMoveItem(kitId: string, items: any[], index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    try {
      const { WorkoutKitService } = await import("@/services/WorkoutKitService");
      const reordered = items.map((it, i) => ({ id: it.id, order_index: i + 1 }));
      const tmp = reordered[index];
      reordered[index] = reordered[target];
      reordered[target] = tmp;
      await WorkoutKitService.reorderKitItems(kitId, reordered);
    } finally {
      router.refresh();
    }
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
                <option value="">Todas dificuldades</option>
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediario</option>
                <option value="advanced">Avancado</option>
              </Select>
              <Select
                className="w-full sm:max-w-[160px]"
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value)}
              >
                <option value="">Destaque: Todos</option>
                <option value="1">Sim</option>
                <option value="0">Nao</option>
              </Select>
              <Select
                className="w-full sm:max-w-[160px]"
                value={publishedFilter}
                onChange={(e) => setPublishedFilter(e.target.value)}
              >
                <option value="">Publicado: Todos</option>
                <option value="1">Sim</option>
                <option value="0">Nao</option>
              </Select>
              <div className="relative flex-1 sm:max-w-sm">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <Input
                  placeholder="Buscar kit..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button variant="primary" size="md" className="shrink-0" onClick={openCreate}>
              <Plus size={18} className="mr-2" />
              Novo Kit
            </Button>
          </div>

          {filteredKits.length === 0 ? (
            <EmptyState
              icon={<FolderKanban size={28} className="text-text-secondary" />}
              title="Nenhum kit encontrado"
              description="Crie seu primeiro kit de treino ou ajuste os filtros."
              action={
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Plus size={16} className="mr-2" />
                  Novo Kit
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredKits.map((kit) => {
                const expanded = expandedKitId === kit.id;
                return (
                  <div key={kit.id} className="space-y-2">
                    <Card
                      className="border border-border hover:border-primary/50 transition-colors flex flex-col"
                    >
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
                              <Badge
                                variant="warning"
                                className="shadow-[0_0_12px_hsl(var(--warning)/0.3)]"
                              >
                                <Star size={12} className="mr-1 fill-current" />
                                Destaque
                              </Badge>
                            )}
                            {kit.is_published ? (
                              <Badge variant="success">Publicado</Badge>
                            ) : (
                              <Badge variant="outline">Rascunho</Badge>
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
                            {kit.short_desc_pt || kit.short_desc_en || kit.description_pt || "Sem descricao curta."}
                          </p>

                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">
                                {translateDifficulty(kit.difficulty)}
                              </Badge>
                              <Badge variant="outline">
                                {kit.total_weeks} sem x {kit.days_per_week} dias
                              </Badge>
                              <span className="text-xs text-text-secondary">
                                {kit.est_minutes_per_session} min/sessao
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Editar"
                                onClick={() => openEdit(kit)}
                              >
                                <Edit size={15} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title={expanded ? "Recolher editor" : "Abrir editor"}
                                onClick={() => toggleExpand(kit.id)}
                              >
                                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                                title="Excluir"
                                onClick={() =>
                                  setDeleteConfirm({ id: kit.id, name: kit.name_pt })
                                }
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
                                Conteudo do Kit
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {kit.items.length} programa
                                {kit.items.length === 1 ? "" : "s"} associado
                                {kit.items.length === 1 ? "" : "s"}
                              </CardDescription>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => openAddProgram(kit.id)}>
                              <Plus size={14} className="mr-1" />
                              Adicionar Programa
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {kit.items.length === 0 ? (
                            <EmptyState
                              icon={<ArrowUpRight size={22} className="text-text-secondary" />}
                              title="Sem programas"
                              description="Adicione programas a este kit para montar uma sequencia."
                              action={
                                <Button variant="primary" size="sm" onClick={() => openAddProgram(kit.id)}>
                                  <Plus size={14} className="mr-1" />
                                  Adicionar
                                </Button>
                              }
                              className="py-4"
                            />
                          ) : (
                            <div className="rounded-xl border border-border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[80px]">Ordem</TableHead>
                                    <TableHead>Programa</TableHead>
                                    <TableHead>Semanas</TableHead>
                                    <TableHead>Dias/sem</TableHead>
                                    <TableHead className="w-[120px] text-right">Acoes</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {kit.items.map((item, i) => {
                                    const progTitle =
                                      item.program?.title_pt ||
                                      item.program?.title_en ||
                                      programOptions.find((p) => p.id === item.program_id)
                                        ?.title_pt ||
                                      `Programa #${item.program_id}`;
                                    return (
                                      <TableRow key={item.id}>
                                        <TableCell>
                                          <div className="flex items-center gap-1">
                                            <Badge
                                              variant="default"
                                              className="w-8 h-8 rounded-full flex items-center justify-center p-0 text-sm"
                                            >
                                              {i + 1}
                                            </Badge>
                                          </div>
                                        </TableCell>
                                        <TableCell className="font-semibold text-text">
                                          {progTitle}
                                        </TableCell>
                                        <TableCell className="text-text">
                                          {item.program?.total_weeks ?? "-"}
                                        </TableCell>
                                        <TableCell className="text-text">
                                          {item.program?.days_per_week ?? "-"}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center justify-end space-x-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                              title="Subir"
                                              disabled={i === 0}
                                              onClick={() =>
                                                handleMoveItem(kit.id, kit.items, i, -1)
                                              }
                                            >
                                              <ArrowUp size={14} />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                              title="Descer"
                                              disabled={i === kit.items.length - 1}
                                              onClick={() =>
                                                handleMoveItem(kit.id, kit.items, i, 1)
                                              }
                                            >
                                              <ArrowDown size={14} />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                                              title="Remover"
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

                    {addProgramOpenFor === kit.id && (
                      <Card className="border border-primary/60">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            Adicionar Programa ao Kit
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Selecione um programa existente para incluir na sequencia.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Select
                            value={selectedProgramId}
                            onChange={(e) => setSelectedProgramId(e.target.value)}
                          >
                            <option value="">Selecione um programa...</option>
                            {programOptions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title_pt}
                              </option>
                            ))}
                          </Select>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setAddProgramOpenFor(null);
                                setSelectedProgramId("");
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!selectedProgramId}
                              onClick={handleAddProgram}
                            >
                              <Plus size={14} className="mr-1" />
                              Adicionar
                            </Button>
                          </div>
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
          onSaved={onModalSaved}
          kit={editingKit ?? undefined}
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
              Tem certeza que deseja excluir o kit{" "}
              <span className="font-semibold text-text">{deleteConfirm?.name}</span>?
              Os programas associados nao serao removidos.
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
