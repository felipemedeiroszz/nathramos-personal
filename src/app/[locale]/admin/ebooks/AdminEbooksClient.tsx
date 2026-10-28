"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  BookOpen,
  RefreshCw,
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { upsertEbookAction, deleteEbookAction } from "@/app/actions/content";
import type { EbookRow } from "@/types";

const EbookUpsertModal = dynamic(
  () =>
    import("@/components/admin/content/EbookUpsertModal").catch(
      () => () => null,
    ),
  { ssr: false },
);

interface AdminEbooksClientProps {
  locale: string;
  userId: string;
  title: string;
  ebooks: EbookRow[];
  searchValue: string;
}

export function AdminEbooksClient({
  locale,
  userId,
  title,
  ebooks,
  searchValue,
}: AdminEbooksClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("adminEbooks");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState(searchValue ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEbook, setEditingEbook] = useState<EbookRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("q", search.trim());
    } else {
      params.delete("q");
    }
    router.push(`/${locale}/admin/ebooks?${params.toString()}`);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    router.refresh();
    setTimeout(() => setIsLoading(false), 500);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(
        locale === "pt-BR" ? "pt-BR" : "en-US",
      );
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (ebook: EbookRow) => {
    if (ebook.is_free || !ebook.price_cents) {
      return locale === "pt-BR" ? "Grátis" : "Free";
    }
    try {
      return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
        style: "currency",
        currency: ebook.currency || "BRL",
      }).format(ebook.price_cents / 100);
    } catch {
      return `${ebook.currency} ${(ebook.price_cents / 100).toFixed(2)}`;
    }
  };

  function openCreate() {
    setEditingEbook(null);
    setModalOpen(true);
  }

  function openEdit(ebook: EbookRow) {
    setEditingEbook(ebook);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      setDeleteError("");
      const result = await deleteEbookAction(deleteConfirm.id);
      if (!result.success) {
        setDeleteError(result.message || "Não foi possível excluir.");
        return;
      }
      setDeleteConfirm(null);
      router.refresh();
    } catch {
      setDeleteError("Não foi possível excluir. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  function onModalSaved() {
    setModalOpen(false);
    setEditingEbook(null);
    router.refresh();
  }

  return (
    <>
      <div className="space-y-6">
        {deleteError && (
          <p role="alert" className="rounded-xl border border-border p-3">
            {deleteError}
          </p>
        )}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{t("subtitle")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
                <Button variant="primary" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("newEbook")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>{t("search")}</Button>
            </div>

            {ebooks.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={40} className="text-text-secondary" />}
                title={t("noEbooks")}
                description={t("noEbooksDesc")}
                action={
                  <Button variant="primary" size="sm" onClick={openCreate}>
                    <Plus size={16} className="mr-2" />
                    {t("newEbook")}
                  </Button>
                }
              />
            ) : (
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("title")}</TableHead>
                      <TableHead>{t("author")}</TableHead>
                      <TableHead>{t("language")}</TableHead>
                      <TableHead>{t("pages")}</TableHead>
                      <TableHead>
                        {locale === "pt-BR" ? "Preço" : "Price"}
                      </TableHead>
                      <TableHead>{t("slug")}</TableHead>
                      <TableHead>{t("publishedAt")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead className="text-right">
                        {t("actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ebooks.map((ebook) => (
                      <TableRow key={ebook.id}>
                        <TableCell className="font-medium">
                          {locale === "pt-BR" ? ebook.title_pt : ebook.title_en}
                        </TableCell>
                        <TableCell>{ebook.author || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ebook.language}</Badge>
                        </TableCell>
                        <TableCell>{ebook.pages_count || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ebook.is_free || !ebook.price_cents
                                ? "success"
                                : "default"
                            }
                          >
                            {formatPrice(ebook)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {ebook.slug}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-text-secondary" />
                            <span>{formatDate(ebook.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={ebook.is_published ? "success" : "outline"}
                          >
                            {ebook.is_published ? t("published") : t("draft")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={tCommon("edit")}
                              onClick={() => openEdit(ebook)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={tCommon("delete")}
                              className="text-red-500 hover:text-red-500"
                              onClick={() =>
                                setDeleteConfirm({
                                  id: ebook.id,
                                  name: ebook.title_pt,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
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
      </div>

      {EbookUpsertModal && modalOpen && (
        <EbookUpsertModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingEbook(null);
          }}
          ebook={editingEbook ?? undefined}
          onSubmit={async (data) => {
            await upsertEbookAction(
              data as Parameters<typeof upsertEbookAction>[0],
            );
          }}
          onSaved={onModalSaved}
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
          {deleteError && (
            <p role="alert" className="text-sm text-red-400 px-4">
              {deleteError}
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
