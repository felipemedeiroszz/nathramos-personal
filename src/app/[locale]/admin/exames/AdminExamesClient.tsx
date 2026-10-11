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
import { FileText, RefreshCw, Plus, Search, Edit, Trash2, Calendar, User, AlertTriangle } from "lucide-react"
import { upsertExamAction, deleteExamAction } from "@/app/actions/content"
import type { ExamRow, ExamCategoryRow } from "@/types"

const ExamUpsertModal = dynamic(
  () => import("@/components/admin/content/ExamUpsertModal").catch(() => () => null),
  { ssr: false }
)

interface AdminExamesClientProps {
  locale: string
  userId: string
  title: string
  exams: ExamRow[]
  searchValue: string
  categories?: ExamCategoryRow[]
  studentOptions?: { id: string; name: string; email: string }[]
}

export function AdminExamesClient({
  locale,
  userId,
  title,
  exams,
  searchValue,
  categories = [],
  studentOptions = [],
}: AdminExamesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("adminExams")
  const tCommon = useTranslations("common")

  const [search, setSearch] = useState(searchValue ?? "")
  const [isLoading, setIsLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<ExamRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (search.trim()) {
      params.set("q", search.trim())
    } else {
      params.delete("q")
    }
    router.push(`/${locale}/admin/exames?${params.toString()}`)
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

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return "-"
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  function openCreate() {
    setEditingExam(null)
    setModalOpen(true)
  }

  function openEdit(exam: ExamRow) {
    setEditingExam(exam)
    setModalOpen(true)
  }

  async function confirmDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await deleteExamAction(deleteConfirm.id)
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
      router.refresh()
    }
  }

  function onModalSaved() {
    setModalOpen(false)
    setEditingExam(null)
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
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button variant="primary" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("newExam")}
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

            {exams.length === 0 ? (
              <EmptyState
                icon={<FileText size={40} className="text-text-secondary" />}
                title={t("noExams")}
                description={t("noExamsDesc")}
                action={
                  <Button variant="primary" size="sm" onClick={openCreate}>
                    <Plus size={16} className="mr-2" />
                    {t("newExam")}
                  </Button>
                }
              />
            ) : (
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("title")}</TableHead>
                      <TableHead>{t("student")}</TableHead>
                      <TableHead>{t("lab")}</TableHead>
                      <TableHead>{t("examDate")}</TableHead>
                      <TableHead>{t("file")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm">{exam.user_id.slice(0, 8)}...</span>
                          </div>
                        </TableCell>
                        <TableCell>{exam.lab_name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-text-secondary" />
                            <span>{formatDate(exam.exam_date)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {exam.file_name ? (
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="truncate max-w-[150px]">{exam.file_name}</span>
                              <span className="text-text-secondary">{formatFileSize(exam.file_size_bytes)}</span>
                            </div>
                          ) : (
                            <span className="text-text-secondary">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={exam.is_deleted ? "error" : "success"}>
                            {exam.is_deleted ? t("deleted") : t("active")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" title={tCommon("edit")} onClick={() => openEdit(exam)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={tCommon("delete")}
                              className="text-red-500 hover:text-red-500"
                              onClick={() => setDeleteConfirm({ id: exam.id, name: exam.title })}
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

      {ExamUpsertModal && modalOpen && (
        <ExamUpsertModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditingExam(null)
          }}
          exam={editingExam ?? undefined}
          categories={categories}
          studentOptions={studentOptions}
          onSubmit={async (data) => {
            await upsertExamAction(
              data as Parameters<typeof upsertExamAction>[0]
            )
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
