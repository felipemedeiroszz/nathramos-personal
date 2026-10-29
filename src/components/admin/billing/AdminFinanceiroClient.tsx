"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Banknote,
  TrendingUp,
  Users,
  AlertTriangle,
  Ban,
  Receipt,
  XCircle,
  RotateCcw,
  CheckCircle2,
  XOctagon,
  CreditCard,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Chart } from "@/components/ui/Chart";
import type {
  AdminPaymentRow,
  FinanceOverview,
  IntegrationStatus,
} from "@/services/BillingAdminService";

interface AdminFinanceiroClientProps {
  overview: FinanceOverview;
  revenueSeries: { name: string; value: number }[];
  statusCounts: { status: string; count: number }[];
  providerRevenue: { provider: string; revenue_cents: number; count: number }[];
  topPlans: { plan_id: string; name: string; count: number }[];
  integration: IntegrationStatus;
  recentPayments: AdminPaymentRow[];
}

export function AdminFinanceiroClient({
  overview,
  revenueSeries,
  statusCounts,
  providerRevenue,
  topPlans,
  integration,
  recentPayments,
}: AdminFinanceiroClientProps) {
  const t = useTranslations("adminFinance");
  const tSubs = useTranslations("adminAssinaturas");
  const tPay = useTranslations("adminPayments");
  const locale = useLocale();

  const formatMoney = (cents: number, currency = overview.currency) =>
    new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
      style: "currency",
      currency: currency || "BRL",
    }).format((cents || 0) / 100);

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

  const kpis = [
    {
      label:
        locale === "pt-BR"
          ? "Estornos confirmados no mês"
          : "Confirmed monthly refunds",
      value: formatMoney(overview.month_refunded_cents),
      icon: <RotateCcw size={18} />,
    },
    {
      label:
        locale === "pt-BR"
          ? "Após estornos, antes de taxas"
          : "After refunds, before fees",
      value: formatMoney(overview.month_after_refunds_cents),
      icon: <Banknote size={18} />,
    },
    {
      label: t("mrr"),
      value: formatMoney(overview.mrr_cents),
      icon: <TrendingUp size={18} />,
      accent: true,
    },
    {
      label: t("monthRevenue"),
      value: formatMoney(overview.month_revenue_cents),
      icon: <Banknote size={18} />,
    },
    {
      label: t("yearRevenue"),
      value: formatMoney(overview.year_revenue_cents),
      icon: <Banknote size={18} />,
    },
    {
      label: t("last12Revenue"),
      value: formatMoney(overview.last12_revenue_cents),
      icon: <TrendingUp size={18} />,
    },
    {
      label: t("avgTicket"),
      value: formatMoney(overview.avg_ticket_cents),
      icon: <Receipt size={18} />,
    },
    {
      label: t("activeSubs"),
      value: String(overview.active_subscriptions),
      icon: <Users size={18} />,
    },
    {
      label: t("trialingSubs"),
      value: String(overview.trialing_subscriptions),
      icon: <Users size={18} />,
    },
    {
      label: t("pastDueSubs"),
      value: String(overview.past_due_subscriptions),
      icon: <AlertTriangle size={18} />,
    },
    {
      label: t("blockedSubs"),
      value: String(overview.blocked_subscriptions),
      icon: <Ban size={18} />,
    },
    {
      label: t("paymentsThisMonth"),
      value: String(overview.payments_this_month),
      icon: <Receipt size={18} />,
    },
    {
      label: t("failedThisMonth"),
      value: String(overview.failed_this_month),
      icon: <XCircle size={18} />,
    },
    {
      label: t("refundedThisMonth"),
      value: String(overview.refunded_this_month),
      icon: <RotateCcw size={18} />,
    },
  ];

  const statusData = statusCounts.map((s) => ({
    name: tSubs(`status_${s.status}` as any),
    value: s.count,
  }));

  const providerData = providerRevenue.map((p) => ({
    name:
      p.provider === "stripe"
        ? "Stripe"
        : p.provider === "asaas"
          ? "Asaas"
          : p.provider,
    value: Number((p.revenue_cents / 100).toFixed(2)),
  }));

  const planData = topPlans.map((p) => ({ name: p.name, value: p.count }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center gap-3">
              <span
                className={
                  kpi.accent
                    ? "w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                    : "w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"
                }
              >
                {kpi.icon}
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-text-secondary truncate">
                  {kpi.label}
                </p>
                <p className="text-lg font-bold text-text truncate">
                  {kpi.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("revenueChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueSeries.length > 0 ? (
              <Chart appearance="admin" data={revenueSeries} type="area" />
            ) : (
              <p className="py-16 text-center text-sm text-text-secondary">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("statusChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <Chart appearance="admin" data={statusData} type="pie" />
            ) : (
              <p className="py-16 text-center text-sm text-text-secondary">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("topPlansChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            {planData.length > 0 ? (
              <Chart appearance="admin" data={planData} type="bar" />
            ) : (
              <p className="py-16 text-center text-sm text-text-secondary">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("providerChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            {providerData.length > 0 ? (
              <Chart appearance="admin" data={providerData} type="bar" />
            ) : (
              <p className="py-16 text-center text-sm text-text-secondary">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("integrations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <CreditCard size={17} />
                </span>
                <div>
                  <p className="text-sm font-medium text-text">Stripe</p>
                  <p className="text-xs text-text-secondary">
                    {t("mode")}: {integration.stripe.mode}
                  </p>
                </div>
              </div>
              <Badge
                variant={integration.stripe.configured ? "success" : "error"}
              >
                {integration.stripe.configured
                  ? t("configured")
                  : t("notConfigured")}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet size={17} />
                </span>
                <div>
                  <p className="text-sm font-medium text-text">Asaas</p>
                  <p className="text-xs text-text-secondary">
                    {t("environment")}: {integration.asaas.environment}
                  </p>
                </div>
              </div>
              <Badge
                variant={integration.asaas.configured ? "success" : "error"}
              >
                {integration.asaas.configured
                  ? t("configured")
                  : t("notConfigured")}
              </Badge>
            </div>

            <p className="text-xs text-text-secondary flex items-start gap-2">
              {integration.stripe.configured && integration.asaas.configured ? (
                <CheckCircle2
                  size={14}
                  className="text-green-500 mt-0.5 shrink-0"
                />
              ) : (
                <XOctagon size={14} className="text-red-400 mt-0.5 shrink-0" />
              )}
              {t("integrationHint")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Últimos pagamentos */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Receipt size={18} className="text-primary" />
          <p className="text-sm font-semibold text-text">
            {t("recentPayments")}
          </p>
        </div>
        {recentPayments.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary">
            {t("noData")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recentPayments.map((p) => (
              <li
                key={p.id}
                className="px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-text truncate">
                    {p.student_name ?? tPay("unknownStudent")}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(p.paid_at ?? p.created_at)} · {p.provider}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-text">
                    {formatMoney(p.amount_cents, p.currency)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {tPay(`status_${p.status}` as any)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default AdminFinanceiroClient;
