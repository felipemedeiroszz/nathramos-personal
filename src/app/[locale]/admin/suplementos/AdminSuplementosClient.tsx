"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table"
import { EmptyState } from "@/components/ui/EmptyState"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog"
import { Pill, RefreshCw, Plus, Search, Edit, Trash2, AlertTriangle } from "lucide-react"
import { upsertSupplementAction, deleteSupplementAction } from "@/app/actions/content"
import type { SupplementRow } from "@/types"

const SupplementUpsertModal = dynamic(
  () => import("@/components/admin/content/SupplementUpsertModal").catch(() => () => null),
  { ssr: false }
)

interface AdminSuplementosClientProps {
  locale: string
  userId: string
  title: string
  supplements: SupplementRow[]
  searchValue: string
}

export function AdminSuplementosClient({
  locale,
  userId,
  title,
  supplements,
  searchValue,
}: AdminSuplementosClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("adminSupplements")
  const tCommon = useTranslations("common")

  const [search, setSearch] = useState(searchValue ?? "")
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSupplement, setEditingSupplement] = useState<SupplementRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (search.trim()) {
      params.set("q", search.trim())
    } else {
      params.delete("q")
    }
    router.push(`/${locale}/admin/suplementos?${params.toString()}`)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    router.refresh()
    setTimeout(() => setIsLoading(false), 500)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-US")
    } catch {
      return dateStr
    }
  }

  function openCreate() {
    setEditingSupplement(null)
    setModalOpen(true)
  }

  function openEdit(supplement: SupplementRow) {
    setEditingSupplement(supplement)
    setModalOpen(true)
  }

  async function confirmDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await deleteSupplementAction(deleteConfirm.id)
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
      router.refresh()
    }
  }

  function onModalSaved() {
    setModalOpen(false)
    setEditingSupplement(null)
    router.refresh()
  }

  return (
    <>
      <div className="space-y-6">
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
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button variant="primary" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("newSupplement")}
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

            {supplements.length === 0 ? (
              <EmptyState
                icon={<Pill size={40} className="text-text-secondary" />}
                title={t("noSupplements")}
                description={t("noSupplementsDesc")}
                action={
                  <Button variant="primary" size="sm" onClick={openCreate}>
                    <Plus size={16} className="mr-2" />
                    {t("newSupplement")}
                  </Button>
                }
              />
            ) : (
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("category")}</TableHead>
                      <TableHead>{t("brand")}</TableHead>
                      <TableHead>{t("serving")}</TableHead>
                      <TableHead>{t("createdAt")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplements.map((supplement) => (
                      <TableRow key={supplement.id}>
                        <TableCell className="font-medium">
                          {locale === "pt-BR" ? supplement.name_pt : supplement.name_en}
                        </TableCell>
                        <TableCell>
                          {locale === "pt-BR" ? supplement.category_pt : supplement.category_en}
                        </TableCell>
                        <TableCell>{supplement.brand || "-"}</TableCell>
                        <TableCell>
                          {supplement.serving_size} {supplement.serving_unit}
                        </TableCell>
                        <TableCell>{formatDate(supplement.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={supplement.is_active ? "success" : "outline"}>
                            {supplement.is_active ? t("active") : t("inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" title={tCommon("edit")} onClick={() => openEdit(supplement)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={tCommon("delete")}
                              className="text-red-500 hover:text-red-500"
                              onClick={() => setDeleteConfirm({ id: supplement.id, name: supplement.name_pt })}
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

      {SupplementUpsertModal && modalOpen && (
        <SupplementUpsertModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditingSupplement(null)
          }}
          supplement={editingSupplement ?? undefined}
          onSubmit={async (data) => {
            await upsertSupplementAction(data)
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
              {t("confirmDeleteDesc")} <span className="font-semibold text-text">{deleteConfirm?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              <Trash2 size={16} className="mr-2" />
              {deleting ? tCommon("loading") : tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
