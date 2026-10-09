"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Search, Plus, Eye, User } from "lucide-react";
import type { StudentWithSubscription } from "@/services/StudentService";

interface AdminAlunosClientProps {
  locale: string;
  students: StudentWithSubscription[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  limit: number;
}

function getStatusBadge(status: string): { label: string; variant: "success" | "warning" | "error" | "default" | "outline" } {
  switch (status) {
    case "trialing":
      return { label: "Teste", variant: "default" as const };
    case "active":
      return { label: "Ativa", variant: "success" as const };
    case "past_due":
      return { label: "Atrasada", variant: "warning" as const };
    case "canceled":
      return { label: "Cancelada", variant: "error" as const };
    case "blocked":
      return { label: "Bloqueada", variant: "error" as const };
    case "expired":
      return { label: "Expirada", variant: "outline" as const };
    default:
      return { label: status, variant: "outline" as const };
  }
}

function getProviderLabel(provider: string | null): string {
  if (!provider) return "-";
  switch (provider) {
    case "stripe":
      return "Stripe";
    case "asaas":
      return "ASAAS";
    default:
      return provider;
  }
}

export function AdminAlunosClient({
  locale,
  students,
  total,
  page,
  totalPages,
  search,
  status,
  limit,
}: AdminAlunosClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [statusFilter, setStatusFilter] = useState(status);

  const updateURL = (newSearch: string, newStatus: string, newPage: number = 1) => {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newStatus) params.set("status", newStatus);
    if (newPage > 1) params.set("page", newPage.toString());
    router.push(`/${locale}/admin/alunos?${params.toString()}`);
  };

  const handleSearch = () => {
    updateURL(searchInput, statusFilter, 1);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    updateURL(searchInput, newStatus, 1);
  };

  const handlePageChange = (newPage: number) => {
    updateURL(searchInput, statusFilter, newPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                className="pl-10"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>
          <Select
            className="w-full sm:w-[200px]"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="blocked">Bloqueados</option>
            <option value="canceled">Cancelados</option>
          </Select>
          <Button variant="primary" onClick={handleSearch}>
            <Search size={18} className="mr-2" />
            Buscar
          </Button>
        </div>

        {/* Table */}
        {students.length === 0 ? (
          <div className="text-center py-12">
            <User size={48} className="mx-auto text-text-secondary mb-4" />
            <p className="text-text-secondary">Nenhum aluno encontrado</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="hidden md:table-cell">País</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Gateway</TableHead>
                  <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                  <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const statusBadge = student.subscription
                    ? getStatusBadge(student.subscription.status)
                    : { label: "Sem assinatura", variant: "outline" };

                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={student.avatar_url || undefined}
                            alt={student.full_name}
                            size="sm"
                            fallback={student.full_name[0] || "?"}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-text truncate">{student.full_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-text">
                        {student.country || "-"}
                      </TableCell>
                      <TableCell className="text-text">
                        {student.subscription?.plan_name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant as any}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-text">
                        {getProviderLabel(student.subscription?.provider || null)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-text">
                        {student.subscription?.current_period_end
                          ? formatDate(student.subscription.current_period_end)
                          : "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-text">
                        {formatDate(student.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/${locale}/admin/alunos/${student.id}`}>
                            <Eye size={16} />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-text-secondary">
              Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total} alunos
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-text">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
