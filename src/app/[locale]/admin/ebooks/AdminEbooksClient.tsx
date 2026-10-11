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
import { BookOpen, RefreshCw, Plus, Search, Edit, Trash2, Calendar } from "lucide-react"
import type { EbookRow } from "@/types"

interface AdminEbooksClientProps {
  locale: string
  userId: string
  title: string
  ebooks: EbookRow[]
  searchValue: string
}

export function AdminEbooksClient({
  locale,
  userId,
  title,
  ebooks,
  searchValue,
}: AdminEbooksClientProps) {
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
    router.push(`/${locale}/admin/ebooks?${params.toString()}`)
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>Gerencie a biblioteca de e-books</CardDescription>
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
                Novo E-book
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Buscar por título, autor ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Buscar</Button>
          </div>

          {ebooks.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={40} className="text-text-secondary" />}
              title="Nenhum e-book encontrado"
              description="Comece adicionando e-books à biblioteca."
            />
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Idioma</TableHead>
                    <TableHead>Páginas</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Publicado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
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
                      <TableCell className="font-mono text-xs">{ebook.slug}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-text-secondary" />
                          <span>{formatDate(ebook.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ebook.is_published ? "default" : "secondary"}>
                          {ebook.is_published ? "Publicado" : "Rascunho"}
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
