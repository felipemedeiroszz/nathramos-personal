"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit,
  Package,
  Pill,
  Plus,
  Search,
  Star,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { deleteSupplementKitAction } from "@/app/actions/content";
import type { SupplementKitWithItems, SupplementRow } from "@/types";
import type { AssignStudentOption } from "@/components/admin/supplement/AssignSupplementKitModal";

const SupplementKitModal = dynamic(
  () =>
    import("@/components/admin/supplement/SupplementKitModal").catch(
      () => () => null,
    ),
  { ssr: false },
);

const AssignSupplementKitModal = dynamic(
  () =>
    import("@/components/admin/supplement/AssignSupplementKitModal").catch(
      () => () => null,
    ),
  { ssr: false },
);

interface AdminSupplementKitsClientProps {
  locale: string;
  userId: string;
  title: string;
  subtitle: string;
  kits: SupplementKitWithItems[];
  supplements: SupplementRow[];
  students: AssignStudentOption[];
  assignedByKit: Record<string, string[]>;
}

export function AdminSupplementKitsClient({
  locale,
  userId,
  title,
  subtitle,
  kits,
  supplements,
  students,
  assignedByKit,
}: AdminSupplementKitsClientProps) {
  const t = useTranslations("adminSupplementKits");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<SupplementKitWithItems | null>(
    null,
  );
  const [assignKit, setAssignKit] = useState<SupplementKitWithItems | null>(
    null,
  );
  const [expandedKitId, setExpandedKitId] = useState<string | null>(
    kits[0]?.id ?? null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supplementName = (id?: string | null) => {
    const found = supplements.find((s) => s.id === id);
    if (!found) return id ? `${id.slice(0, 8)}...` : "-";
    return locale === "pt-BR" ? found.name_pt : found.name_en;
  };

  const filteredKits = kits.filter((kit) => {
    const matchSearch =
      !search.trim() ||
      kit.name_pt.toLowerCase().includes(search.toLowerCase()) ||
      kit.name_en.toLowerCase().includes(search.toLowerCase()) ||
      (kit.goal_pt ?? "").toLowerCase().includes(search.toLowerCase());
    const matchPublished =
      !publishedFilter ||
      (publishedFilter === "1" ? kit.is_published : !kit.is_published);
    const matchFeatured =
      !featuredFilter ||
      (featuredFilter === "1" ? kit.is_featured : !kit.is_featured);
    return matchSearch && matchPublished && matchFeatured;
  });

  function openCreate() {
    setEditingKit(null);
    setModalOpen(true);
  }

  function openEdit(kit: SupplementKitWithItems) {
    setEditingKit(kit);
    setModalOpen(true);
  }

  function toggleExpand(id: string) {
    setExpandedKitId(expandedKitId === id ? null : id);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    setOperationError(null);
    try {
      const result = await deleteSupplementKitAction(deleteConfirm.id);
      if (!result.success) {
        setOperationError(result.message);
        return;
      }
      setDeleteConfirm(null);
      router.refresh();
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Falha ao excluir.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function onModalSaved() {
    setModalOpen(false);
    setEditingKit(null);
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
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Package size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 flex-wrap">
              <Select
                className="w-full sm:max-w-[180px]"
                value={publishedFilter}
                onChange={(e) => setPublishedFilter(e.target.value)}
              >
                <option value="">
                  {t("publishedFilter")}: {t("all")}
                </option>
                <option value="1">{t("yes")}</option>
                <option value="0">{t("no")}</option>
              </Select>
              <Select
                className="w-full sm:max-w-[180px]"
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value)}
              >
                <option value="">
                  {t("featuredFilter")}: {t("all")}
                </option>
                <option value="1">{t("yes")}</option>
                <option value="0">{t("no")}</option>
              </Select>
              <div className="relative flex-1 sm:max-w-sm">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <Input
                  placeholder={t("searchPlaceholder")}
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              className="shrink-0"
              onClick={openCreate}
            >
              <Plus size={18} className="mr-2" />
              {t("newKit")}
            </Button>
          </div>

          {filteredKits.length === 0 ? (
            <EmptyState
              icon={<Package size={28} className="text-text-secondary" />}
              title={t("noKits")}
              description={t("noKitsDesc")}
              action={
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Plus size={16} className="mr-2" />
                  {t("newKit")}
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
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-surface-secondary to-surface" />
                          )}
                          {!kit.cover_image_url && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Pill size={42} className="text-primary/40" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 z-10 flex gap-2">
                            {kit.is_featured && (
                              <Badge variant="warning">
                                <Star size={12} className="mr-1 fill-current" />
                                {t("featured")}
                              </Badge>
                            )}
                            {kit.is_published ? (
                              <Badge variant="success">{t("published")}</Badge>
                            ) : (
                              <Badge variant="outline">{t("draft")}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-5 space-y-3 flex flex-col flex-1">
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-text leading-tight">
                              {kit.name_pt}
                            </h3>
                            <p className="text-xs text-text-secondary">
                              {kit.name_en}
                            </p>
                          </div>

                          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
                            {kit.short_desc_pt || kit.description_pt || "-"}
                          </p>

                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                            <div className="flex flex-wrap items-center gap-2">
                              {kit.goal_pt && (
                                <Badge variant="outline">{kit.goal_pt}</Badge>
                              )}
                              <Badge variant="outline">
                                {kit.items.length} {t("itemsCount")}
                              </Badge>
                              <Badge variant="default">
                                <Users size={12} className="mr-1" />
                                {(assignedByKit[kit.id] ?? []).length}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-primary hover:text-primary"
                                title={t("assignStudents")}
                                onClick={() => setAssignKit(kit)}
                              >
                                <UserPlus size={15} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title={tCommon("edit")}
                                onClick={() => openEdit(kit)}
                              >
                                <Edit size={15} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title={
                                  expanded ? t("hideItems") : t("showItems")
                                }
                                onClick={() => toggleExpand(kit.id)}
                              >
                                {expanded ? (
                                  <ChevronUp size={15} />
                                ) : (
                                  <ChevronDown size={15} />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                                title={tCommon("delete")}
                                onClick={() =>
                                  setDeleteConfirm({
                                    id: kit.id,
                                    name: kit.name_pt,
                                  })
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
                      <Card className="border border-primary/40">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <CardTitle className="text-base">
                                {t("kitItems")}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {kit.items.length} {t("itemsCount")}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setAssignKit(kit)}
                              >
                                <UserPlus size={14} className="mr-1" />
                                {t("assignStudents")}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openEdit(kit)}
                              >
                                <Edit size={14} className="mr-1" />
                                {tCommon("edit")}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {kit.items.length === 0 ? (
                            <EmptyState
                              icon={
                                <Pill
                                  size={22}
                                  className="text-text-secondary"
                                />
                              }
                              title={t("noItems")}
                              description={t("noItemsDesc")}
                              className="py-4"
                            />
                          ) : (
                            <div className="rounded-xl border border-border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>{t("kitItems")}</TableHead>
                                    <TableHead>{t("dosage")}</TableHead>
                                    <TableHead>{t("frequency")}</TableHead>
                                    <TableHead>{t("timesOfDay")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {kit.items.map((item, index) => (
                                    <TableRow key={item.id}>
                                      <TableCell>
                                        <Badge
                                          variant="default"
                                          className="w-8 h-8 rounded-full flex items-center justify-center p-0 text-sm"
                                        >
                                          {index + 1}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="font-semibold text-text">
                                        {item.supplement
                                          ? locale === "pt-BR"
                                            ? item.supplement.name_pt
                                            : item.supplement.name_en
                                          : supplementName(item.supplement_id)}
                                      </TableCell>
                                      <TableCell className="text-text">
                                        {item.dosage
                                          ? `${item.dosage}${item.dosage_unit ?? ""}`
                                          : "-"}
                                      </TableCell>
                                      <TableCell className="text-text">
                                        {item.frequency_per_day}x
                                      </TableCell>
                                      <TableCell className="text-text-secondary text-sm">
                                        {(item.times_of_day ?? []).join(", ") ||
                                          "-"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
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

      {SupplementKitModal && modalOpen && (
        <SupplementKitModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingKit(null);
          }}
          kit={editingKit ?? undefined}
          supplements={supplements}
          userId={userId}
          onSaved={onModalSaved}
        />
      )}

      {AssignSupplementKitModal && assignKit && (
        <AssignSupplementKitModal
          isOpen={!!assignKit}
          onClose={() => setAssignKit(null)}
          kit={assignKit}
          students={students}
          fingerprint={assignKit.assignment_fingerprint}
          assignedStudentIds={assignedByKit[assignKit.id] ?? []}
          onSaved={() => router.refresh()}
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
              <DialogTitle>{t("confirmDelete")}</DialogTitle>
            </div>
            <DialogDescription>
              {t("confirmDeleteDesc")}{" "}
              <span className="font-semibold text-text">
                {deleteConfirm?.name}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          {operationError && (
            <p role="alert" className="text-red-500">
              {operationError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              <Trash2 size={16} className="mr-2" />
              {deleting ? tCommon("loading") : tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AdminSupplementKitsClient;
