"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { FileText, RefreshCw, Plus, Search, Edit, Trash2, Calendar, User } from "lucide-react"
import type { ExamRow } from "@/types"

interface AdminExamesClientProps {
  locale: string
  userId: string
  title: string
  exams: ExamRow[]
  searchValue: string
}

export function AdminExamesClient({
  locale,
  userId,
  title,
  exams,
  searchValue,
}: AdminExamesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchValue ?? "")
  const [isLoading, setIsLoading] = useState(false)

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>Gerencie os exames dos alunos</CardDescription>
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Exame
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Buscar</Button>
          </div>

          {exams.length === 0 ? (
            <EmptyState
              icon={<FileText size={40} className="text-text-secondary" />}
              title="Nenhum exame encontrado"
              description="Comece adicionando exames ao sistema."
            />
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Laboratório</TableHead>
                    <TableHead>Data do Exame</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
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
                        <Badge variant={exam.is_deleted ? "destructive" : "default"}>
                          {exam.is_deleted ? "Excluído" : "Ativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
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
  )
}
