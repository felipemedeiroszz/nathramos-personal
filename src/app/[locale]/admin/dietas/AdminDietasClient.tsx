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
import { UtensilsCrossed, RefreshCw, Plus, Search, Edit, Trash2, Calendar, User } from "lucide-react"
import type { DietProgramRow } from "@/types"

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
  const [search, setSearch] = useState(searchValue ?? "")
  const [isLoading, setIsLoading] = useState(false)

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>Gerencie os programas nutricionais dos alunos</CardDescription>
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
                Nova Dieta
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Buscar</Button>
          </div>

          {programs.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed size={40} className="text-text-secondary" />}
              title="Nenhuma dieta encontrada"
              description="Comece criando um novo programa nutricional."
            />
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Calorias</TableHead>
                    <TableHead>Macros</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
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
                        <Badge variant={program.is_active ? "default" : "secondary"}>
                          {program.is_active ? "Ativo" : "Inativo"}
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
