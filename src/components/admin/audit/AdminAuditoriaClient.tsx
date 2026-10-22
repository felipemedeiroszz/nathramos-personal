"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronLeft, ChevronRight, Search, Shield, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { AuditLogRow } from "@/services/AuditLogService";

interface Filters {
  q: string;
  entity: string;
  action: string;
  from: string;
  to: string;
}

interface AdminAuditoriaClientProps {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  entityTypes: string[];
  actions: string[];
  filters: Filters;
}

function actionVariant(action: string | null): "success" | "error" | "outline" {
  const a = (action ?? "").toLowerCase();
  if (a.includes("delete") || a.includes("remove") || a.includes("cancel")) return "error";
  if (a.includes("create") || a.includes("insert") || a.includes("add")) return "success";
  return "outline";
}

export function AdminAuditoriaClient({
  rows,
  total,
  page,
  pageSize,
  entityTypes,
  actions,
  filters,
}: AdminAuditoriaClientProps) {
  const t = useTranslations("adminAudit");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<Filters>(filters);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const navigate = (next: Partial<Filters>, nextPage?: number) => {
    const merged: Filters = { ...form, ...next };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.entity) params.set("entity", merged.entity);
    if (merged.action) params.set("action", merged.action);
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    const targetPage = nextPage ?? 1;
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  const handleClear = () => {
    const empty: Filters = { q: "", entity: "", action: "", from: "", to: "" };
    setForm(empty);
    startTransition(() => router.push(pathname));
  };

  const set = (key: keyof Filters, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-sm font-medium text-text">{t("search")}</label>
              <Input
                value={form.q}
                onChange={(e) => set("q", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate({});
                }}
                placeholder={t("searchPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("entity")}</label>
              <Select value={form.entity} onChange={(e) => set("entity", e.target.value)}>
                <option value="">{t("allEntities")}</option>
                {entityTypes.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("action")}</label>
              <Select value={form.action} onChange={(e) => set("action", e.target.value)}>
                <option value="">{t("allActions")}</option>
                {actions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">{t("from")}</label>
                <Input
                  type="date"
                  value={form.from}
                  onChange={(e) => set("from", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">{t("to")}</label>
                <Input type="date" value={form.to} onChange={(e) => set("to", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => navigate({})} disabled={isPending}>
              <Search size={15} />
              <span className="ml-2">{t("apply")}</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={handleClear} disabled={isPending}>
              <X size={15} />
              <span className="ml-2">{t("clear")}</span>
            </Button>
            <div className="flex-1" />
            <span className="text-sm text-text-secondary">
              {t("totalLabel", { count: total })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            className="py-16"
            icon={<Shield size={40} className="text-text-secondary" />}
            title={t("emptyTitle")}
            description={t("emptyDesc")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">{t("colDate")}</TableHead>
                <TableHead>{t("colActor")}</TableHead>
                <TableHead>{t("colAction")}</TableHead>
                <TableHead>{t("colEntity")}</TableHead>
                <TableHead>{t("colIp")}</TableHead>
                <TableHead className="w-[60px] text-right">{t("colDetails")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow>
                    <TableCell className="text-text-secondary whitespace-nowrap">
                      {formatDate(row.created_at)}
                    </TableCell>
                    <TableCell className="text-text">
                      {row.actor_name || t("systemActor")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(row.action)}>{row.action ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      <span className="text-text">{row.entity_type ?? "—"}</span>
                      {row.entity_id && (
                        <span className="block text-xs text-text-secondary/70 truncate max-w-[220px]">
                          {row.entity_id}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-text-secondary text-xs">
                      {row.ip_address ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border/60 text-text-secondary hover:text-primary hover:border-primary/60 transition-colors"
                        aria-label={t("colDetails")}
                      >
                        <ChevronDown
                          size={16}
                          className={expandedId === row.id ? "rotate-180 transition-transform" : "transition-transform"}
                        />
                      </button>
                    </TableCell>
                  </TableRow>
                  {expandedId === row.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-surface-secondary/40">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                          {t("detailsTitle")}
                        </p>
                        {row.details && Object.keys(row.details as object).length > 0 ? (
                          <pre className="text-xs text-text bg-background/60 rounded-lg p-3 overflow-auto max-h-72">
                            {JSON.stringify(row.details, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm text-text-secondary">{t("noDetails")}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-text-secondary">
              {t("pageOf", { page, total: totalPages })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1 || isPending}
                onClick={() => navigate({}, page - 1)}
              >
                <ChevronLeft size={15} />
                <span className="ml-1">{t("prev")}</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages || isPending}
                onClick={() => navigate({}, page + 1)}
              >
                <span className="mr-1">{t("next")}</span>
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminAuditoriaClient;
