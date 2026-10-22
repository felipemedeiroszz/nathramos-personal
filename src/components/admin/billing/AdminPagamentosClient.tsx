"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, DollarSign, Eye } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
} from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { AdminPaymentRow } from "@/services/BillingAdminService";

interface AdminPagamentosClientProps {
  title: string;
  payments: AdminPaymentRow[];
}

const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "canceled",
  "refunded",
  "expired",
  "partially_refunded",
];

const PAYMENT_METHODS = ["credit_card", "pix", "boleto", "bank_transfer"];

function statusVariant(status: string) {
  switch (status) {
    case "paid":
      return "success" as const;
    case "pending":
    case "processing":
      return "warning" as const;
    case "failed":
    case "canceled":
    case "expired":
      return "error" as const;
    default:
      return "outline" as const;
  }
}

export function AdminPagamentosClient({ title, payments }: AdminPagamentosClientProps) {
  const t = useTranslations("adminPayments");
  const locale = useLocale();

  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<AdminPaymentRow | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (providerFilter !== "all" && p.provider !== providerFilter) return false;
      if (methodFilter !== "all" && p.method !== methodFilter) return false;
      if (
        term &&
        !(p.student_name ?? "").toLowerCase().includes(term) &&
        !(p.description_pt ?? "").toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [payments, statusFilter, providerFilter, methodFilter, search]);

  const formatMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
      style: "currency",
      currency: currency || "BRL",
    }).format((cents || 0) / 100);

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs uppercase tracking-wide text-text-secondary">{label}</span>
      <span className="text-sm text-text text-right break-all">{value || "—"}</span>
    </div>
  );

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-border">
          <div className="flex-1 flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign size={18} />
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
                className="pl-9 w-full sm:w-52"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="all">{t("allStatuses")}</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status_${s}` as any)}
                </option>
              ))}
            </Select>
            <Select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="w-full sm:w-32"
            >
              <option value="all">{t("allProviders")}</option>
              <option value="stripe">Stripe</option>
              <option value="asaas">Asaas</option>
            </Select>
            <Select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full sm:w-36"
            >
              <option value="all">{t("allMethods")}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`method_${m}` as any)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            className="py-16"
            icon={<DollarSign size={36} className="text-text-secondary" />}
            title={t("emptyTitle")}
            description={t("emptyDesc")}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colStudent")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("colDescription")}</TableHead>
                  <TableHead>{t("colAmount")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("colMethod")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("colProvider")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("colDate")}</TableHead>
                  <TableHead className="text-right">{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium text-text truncate max-w-[180px]">
                      {p.student_name ?? t("unknownStudent")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-text-secondary truncate max-w-[220px]">
                      {locale === "pt-BR" ? p.description_pt : p.description_en}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-text">
                      {formatMoney(p.amount_cents, p.currency)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-text-secondary">
                      {t(`method_${p.method}` as any)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-text-secondary capitalize">
                      {p.provider}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>
                        {t(`status_${p.status}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-text-secondary whitespace-nowrap">
                      {formatDateTime(p.paid_at ?? p.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t("details")}
                        onClick={() => setDetail(p)}
                      >
                        <Eye size={15} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {detail && (
        <Modal
          isOpen={!!detail}
          onClose={() => setDetail(null)}
          className="max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <ModalHeader>
            <ModalTitle>{t("details")}</ModalTitle>
            <ModalClose onClick={() => setDetail(null)} />
          </ModalHeader>
          <ModalBody className="space-y-1">
            <DetailRow label={t("colStudent")} value={detail.student_name} />
            <DetailRow label={t("colDescription")} value={detail.description_pt} />
            <DetailRow
              label={t("colAmount")}
              value={formatMoney(detail.amount_cents, detail.currency)}
            />
            <DetailRow
              label={t("fee")}
              value={formatMoney(detail.fee_cents, detail.currency)}
            />
            <DetailRow
              label={t("net")}
              value={formatMoney(detail.net_amount_cents, detail.currency)}
            />
            <DetailRow label={t("colMethod")} value={t(`method_${detail.method}` as any)} />
            <DetailRow label={t("installments")} value={String(detail.installments)} />
            <DetailRow label={t("colProvider")} value={detail.provider} />
            <DetailRow label={t("externalId")} value={detail.external_id} />
            <DetailRow label={t("externalEventId")} value={detail.external_event_id} />
            <DetailRow label={t("card")} value={detail.card_last4 ? `•••• ${detail.card_last4}` : null} />
            <DetailRow label={t("cardBrand")} value={detail.card_brand} />
            <DetailRow label={t("pix")} value={detail.pix_copy_paste ? t("yes") : null} />
            <DetailRow label={t("boleto")} value={detail.boleto_digitable_line} />
            <DetailRow label={t("dueAt")} value={formatDateTime(detail.due_at)} />
            <DetailRow label={t("paidAt")} value={formatDateTime(detail.paid_at)} />
            <DetailRow label={t("failedAt")} value={formatDateTime(detail.failed_at)} />
            <DetailRow label={t("refundedAt")} value={formatDateTime(detail.refunded_at)} />
            <DetailRow label={t("failureReason")} value={detail.failure_reason} />
            <DetailRow label={t("createdAt")} value={formatDateTime(detail.created_at)} />
          </ModalBody>
        </Modal>
      )}
    </>
  );
}

export default AdminPagamentosClient;
