"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
  Tags,
  Plus,
  Edit,
  Trash2,
  Dumbbell,
  Flame,
  Gauge,
  Activity,
  Baby,
  Home,
  Heart,
  Zap,
  Target,
  Trophy,
  Star,
  AlertTriangle,
} from "lucide-react";
import { deleteCategoryAction } from "@/app/actions/workouts";
import type { WorkoutCategoryRow } from "@/types";

const CategoryUpsertModal = dynamic(
  () => import("@/components/admin/workout/CategoryUpsertModal").catch(() => () => null),
  { ssr: false }
);

const LUCIDE_ICON_MAP: Record<string, any> = {
  Dumbbell,
  Flame,
  Gauge,
  Activity,
  Baby,
  Home,
  Heart,
  Zap,
  Target,
  Trophy,
  Star,
  Tags,
};

function renderLucideIcon(name?: string | null, size = 22) {
  if (!name) return <Dumbbell size={size} />;
  const Icon = LUCIDE_ICON_MAP[name];
  if (Icon) return <Icon size={size} />;
  try {
    const AnyIcon = (LUCIDE_ICON_MAP as any)[name];
    if (AnyIcon) return <AnyIcon size={size} />;
  } catch {}
  return <Dumbbell size={size} />;
}

interface AdminCategoriasClientProps {
  locale: string;
  userId: string;
  title: string;
  subtitle: string;
  categories: WorkoutCategoryRow[];
  programCountByCategory: Record<string, number>;
}

export function AdminCategoriasClient({
  locale,
  userId,
  title,
  subtitle,
  categories,
  programCountByCategory,
}: AdminCategoriasClientProps) {
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WorkoutCategoryRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingCategory(null);
    setModalOpen(true);
  }

  function openEdit(cat: WorkoutCategoryRow) {
    setEditingCategory(cat);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteCategoryAction(deleteConfirm.id);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
      router.refresh();
    }
  }

  function onModalSaved() {
    setModalOpen(false);
    setEditingCategory(null);
    router.refresh();
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
            <div className="flex items-center space-x-2">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Tags size={22} />
              </div>
              <Button variant="primary" size="md" onClick={openCreate}>
                <Plus size={18} className="mr-2" />
                Nova Categoria
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <EmptyState
              icon={<Tags size={28} className="text-text-secondary" />}
              title="Nenhuma categoria"
              description="Crie sua primeira categoria para organizar os programas e kits de treino."
              action={
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Plus size={16} className="mr-2" />
                  Nova Categoria
                </Button>
              }
            />
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const count = programCountByCategory[cat.id] ?? 0;
                  return (
                    <Card
                    key={cat.id}
                    className="border border-border hover:border-primary/50 transition-colors"
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {renderLucideIcon(cat.icon_lucide, 22)}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Editar"
                            onClick={() => openEdit(cat)}
                          >
                            <Edit size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                            title="Excluir"
                            onClick={() =>
                              setDeleteConfirm({ id: cat.id, name: cat.name_pt })
                            }
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-text">{cat.name_pt}</h3>
                            <Badge variant="outline" className="text-xs">
                              {count} programa{count === 1 ? "" : "s"}
                            </Badge>
                          </div>
                          <p className="text-xs text-text-secondary">{cat.name_en}</p>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {cat.description_pt || cat.description_en || "Sem descricao."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-text-secondary">
                          Ordem:{" "}
                          <span className="font-semibold text-text">{cat.order_index}</span>
                        </span>
                        {cat.is_active ? (
                          <Badge variant="success">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-text-secondary">
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {CategoryUpsertModal && modalOpen && (
        <CategoryUpsertModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingCategory(null);
          }}
          onSaved={onModalSaved}
          category={editingCategory ?? undefined}
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
              Tem certeza que deseja desativar a categoria{" "}
              <span className="font-semibold text-text">{deleteConfirm?.name}</span>?
              Programas associados nao serao removidos.
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
              {deleting ? "Excluindo..." : "Desativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
