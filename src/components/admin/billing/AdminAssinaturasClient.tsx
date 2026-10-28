"use client";

import { useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Users, RotateCcw, Ban } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  cancelSubscriptionAdminAction,
  reactivateSubscriptionAdminAction,
  updateSubscriptionStatusAction,
} from "@/app/actions/billing";
import type { AdminSubscriptionRow } from "@/services/BillingAdminService";
import type { SubscriptionStatusT } from "@/lib/supabase/types";

interface AdminAssinaturasClientProps {
  title: string;
  subscriptions: AdminSubscriptionRow[];
}

const STATUSES: SubscriptionStatusT[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "inactive",
  "expired",
  "blocked",
];

function statusVariant(status: string) {
  switch (status) {
    case "active":
    case "trialing":
      return "success" as const;
    case "past_due":
      return "warning" as const;
    case "blocked":
    case "expired":
      return "error" as const;
    default:
      return "outline" as const;
  }
}

export function AdminAssinaturasClient({
  title,
  subscriptions,
}: AdminAssinaturasClientProps) {
  const t = useTranslations("adminAssinaturas");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, setPending] = useState(false);
  const running = useRef(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subscriptions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (providerFilter !== "all" && (s.provider ?? "—") !== providerFilter)
        return false;
      if (term && !(s.student_name ?? "").toLowerCase().includes(term))
        return false;
      return true;
    });
  }, [subscriptions, statusFilter, providerFilter, search]);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleDateString(
        locale === "pt-BR" ? "pt-BR" : "en-US",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        },
      );
    } catch {
      return "—";
    }
  };

  const formatMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
      style: "currency",
      currency: currency || "BRL",
    }).format((cents || 0) / 100);

  async function run(
    id: string,
    fn: () => Promise<{ success: boolean; message?: string }>,
  ) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setBusyId(id);
    setError(null);
    try {
      const result = await fn();
      if (!result.success)
        setError(result.message || "Não foi possível concluir a operação.");
      else router.refresh();
    } catch {
      setError(
        "Não foi possível concluir a operação. Confira o status antes de tentar novamente.",
      );
    } finally {
      running.current = false;
      setPending(false);
      setBusyId(null);
    }
  }

  function handleCancel(sub: AdminSubscriptionRow) {
    if (!window.confirm(t("cancelConfirm"))) return;
    run(sub.id, () => cancelSubscriptionAdminAction(sub.id, true));
  }

  function handleReactivate(sub: AdminSubscriptionRow) {
    run(sub.id, () => reactivateSubscriptionAdminAction(sub.id));
  }

  function handleStatusChange(sub: AdminSubscriptionRow, status: string) {
    run(sub.id, () =>
      updateSubscriptionStatusAction(sub.id, status as SubscriptionStatusT),
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-border">
        <div className="flex-1 flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Users size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-text">{title}</p>
            <p className="text-xs text-text-secondary">
              {t("countLabel", { count: filtered.length })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9 w-full sm:w-56"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="all">{t("allStatuses")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status_${s}` as any)}
              </option>
            ))}
          </Select>
          <Select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="w-full sm:w-36"
          >
            <option value="all">{t("allProviders")}</option>
            <option value="stripe">Stripe</option>
            <option value="asaas">Asaas</option>
          </Select>
        </div>
      </div>

      {error && (
        <p className="px-4 py-3 text-sm text-red-400 border-b border-border">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          className="py-16"
          icon={<Users size={36} className="text-text-secondary" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colStudent")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("colPlan")}
                </TableHead>
                <TableHead>{t("colAmount")}</TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("colProvider")}
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("colPeriodEnd")}
                </TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-right">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => {
                const isEnded =
                  sub.status === "canceled" ||
                  sub.status === "expired" ||
                  sub.status === "inactive" ||
                  sub.cancel_at_period_end;
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-text truncate max-w-[200px]">
                        {sub.student_name ?? t("unknownStudent")}
                      </p>
                      {sub.cancel_at_period_end && (
                        <span className="text-xs text-yellow-500">
                          {t("cancelAtPeriodEnd")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-text-secondary">
                      {sub.plan_name ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-text">
                      {formatMoney(sub.unit_amount_cents, sub.currency)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-text-secondary capitalize">
                      {sub.provider ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-text-secondary whitespace-nowrap">
                      {formatDate(sub.current_period_end)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(sub.status)}>
                          {t(`status_${sub.status}` as any)}
                        </Badge>
                        <Select
                          value={sub.status}
                          disabled={
                            busyId === sub.id ||
                            isPending ||
                            !!sub.provider ||
                            !!sub.external_id
                          }
                          title={
                            sub.provider
                              ? "Status sincronizado pelo provedor de pagamento"
                              : undefined
                          }
                          onChange={(e) =>
                            handleStatusChange(sub, e.target.value)
                          }
                          className="h-8 w-32 text-xs"
                          aria-label={t("changeStatus")}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {t(`status_${s}` as any)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEnded ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === sub.id || isPending}
                          onClick={() => handleReactivate(sub)}
                        >
                          <RotateCcw size={14} className="mr-1" />
                          {t("reactivate")}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === sub.id || isPending}
                          onClick={() => handleCancel(sub)}
                        >
                          <Ban size={14} className="mr-1" />
                          {t("cancel")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

export default AdminAssinaturasClient;
