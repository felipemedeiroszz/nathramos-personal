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

import { UtensilsCrossed, RefreshCw, Plus, Search, Edit, Trash2, Calendar, User, AlertTriangle } from "lucide-react"

import { upsertDietProgramAction, deleteDietProgramAction } from "@/app/actions/content"

import type { DietProgramRow } from "@/types"



const DietUpsertModal = dynamic(

  () => import("@/components/admin/content/DietUpsertModal").catch(() => () => null),

  { ssr: false }

)



interface AdminDietasClientProps {

  locale: string

  userId: string

  title: string

  programs: DietProgramRow[]

  searchValue: string

}



export function AdminDietasClient({

  locale,

  userId,

  title,

  programs,

  searchValue,

}: AdminDietasClientProps) {

  const router = useRouter()

  const searchParams = useSearchParams()

  const t = useTranslations("adminDiets")

  const tCommon = useTranslations("common")



  const [search, setSearch] = useState(searchValue ?? "")

  const [isLoading, setIsLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)

  const [editingProgram, setEditingProgram] = useState<DietProgramRow | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  const [deleting, setDeleting] = useState(false)



  const handleSearch = () => {

    const params = new URLSearchParams(searchParams.toString())

    if (search.trim()) {

      params.set("q", search.trim())

    } else {

      params.delete("q")

    }

    router.push(`/${locale}/admin/dietas?${params.toString()}`)

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



  const formatCalories = (cal: number) => {

    return new Intl.NumberFormat(locale).format(cal)

  }



  const formatMacros = (value: number) => {

    return `${value.toFixed(1)}g`

  }



  function openCreate() {

    setEditingProgram(null)

    setModalOpen(true)

  }



  function openEdit(program: DietProgramRow) {

    setEditingProgram(program)

    setModalOpen(true)

  }



  async function confirmDelete() {

    if (!deleteConfirm) return

    setDeleting(true)

    try {

      await deleteDietProgramAction(deleteConfirm.id)

    } finally {

      setDeleting(false)

      setDeleteConfirm(null)

      router.refresh()

    }

  }



  function onModalSaved() {

    setModalOpen(false)

    setEditingProgram(null)

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

                  {t("newDiet")}

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



            {programs.length === 0 ? (

              <EmptyState

                icon={<UtensilsCrossed size={40} className="text-text-secondary" />}

                title={t("noDiets")}

                description={t("noDietsDesc")}

                action={

                  <Button variant="primary" size="sm" onClick={openCreate}>

                    <Plus size={16} className="mr-2" />

                    {t("newDiet")}

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

                      <TableHead>{t("calories")}</TableHead>

                      <TableHead>{t("macros")}</TableHead>

                      <TableHead>{t("period")}</TableHead>

                      <TableHead>{t("status")}</TableHead>

                      <TableHead className="text-right">{t("actions")}</TableHead>

                    </TableRow>

                  </TableHeader>

                  <TableBody>

                    {programs.map((program) => (

                      <TableRow key={program.id}>

                        <TableCell className="font-medium">

                        {locale === "pt-BR" ? program.title_pt : program.title_en}

                      </TableCell>

                      <TableCell>

                        <div className="flex items-center gap-2">

                          <User className="h-4 w-4 text-text-secondary" />

                          <span className="text-sm">{program.user_id.slice(0, 8)}...</span>

                        </div>

                      </TableCell>

                      <TableCell>{formatCalories(program.daily_calories)} kcal</TableCell>

                      <TableCell>

                        <div className="flex flex-col gap-1 text-xs">

                          <span>P: {formatMacros(program.protein_g)}</span>

                          <span>C: {formatMacros(program.carbs_g)}</span>

                          <span>G: {formatMacros(program.fats_g)}</span>

                        </div>

                      </TableCell>

                      <TableCell>

                        <div className="flex items-center gap-2 text-sm">

                          <Calendar className="h-4 w-4 text-text-secondary" />

                          <span>{formatDate(program.start_date)}</span>

                          {program.end_date && (

                            <>

                              <span className="text-text-secondary">→</span>

                              <span>{formatDate(program.end_date)}</span>

                            </>

                          )}

                        </div>

                      </TableCell>

                      <TableCell>

                        <Badge variant={program.is_active ? "success" : "outline"}>

                          {program.is_active ? t("active") : t("inactive")}

                        </Badge>

                      </TableCell>

                      <TableCell className="text-right">

                        <div className="flex items-center justify-end gap-2">

                          <Button variant="ghost" size="sm" title={tCommon("edit")} onClick={() => openEdit(program)}>

                            <Edit className="h-4 w-4" />

                          </Button>

                          <Button

                            variant="ghost"

                            size="sm"

                            title={tCommon("delete")}

                            className="text-red-500 hover:text-red-500"

                            onClick={() => setDeleteConfirm({ id: program.id, name: program.title_pt })}

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



    {DietUpsertModal && modalOpen && (

      <DietUpsertModal

        isOpen={modalOpen}

        onClose={() => {

          setModalOpen(false)

          setEditingProgram(null)

        }}

        program={editingProgram ?? undefined}

        onSubmit={async (data) => {

          await upsertDietProgramAction(data)

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
