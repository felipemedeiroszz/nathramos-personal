import { AdminWorkQueue } from "@/components/admin/AdminWorkQueue";
import { adminCurrency } from "@/lib/admin/reporting";
import { AdminCurrencySelector } from "@/components/admin/billing/AdminCurrencySelector";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations, getLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Chart } from "@/components/ui/Chart";
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Ban,
  Banknote,
  CreditCard,
  UserX,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { AdminMetricsService } from "@/services/AdminMetricsService";

export const dynamic = "force-dynamic";

type LocaleKey = (typeof locales)[number];

export const metadata: Metadata = {
  title: "Painel Admin",
};

type Metric = {
  labelKey: string;
  fallback: string;
  value: string | number;

  icon: React.ReactNode;
};

export default async function AdminDashboardPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: LocaleKey };
  searchParams: { currency?: string };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const actor = await requireRole(["admin", "coach"], "/dashboard");
  if (actor.role === "coach") return <AdminWorkQueue locale={locale} />;

  const safe = async (ns: string, key: string, fb: string) => {
    try {
      const t = await getTranslations(ns);
      if (t.has(key)) return t(key);
    } catch {}
    return fb;
  };

  const pageTitle = await safe("admin", "title", "Painel Administrativo");
  const pageSubtitle = await safe(
    "admin",
    "subtitle",
    "Visão geral da plataforma, alunos e receita",
  );
  const thisMonth = await safe("admin", "thisMonth", "este mês");

  // Buscar métricas reais do banco
  const currency = adminCurrency(searchParams.currency);
  const [
    metricsData,
    revenueData,
    subscriptionStatusData,
    topPlans,
    lastPayments,
    growthData,
  ] = await Promise.all([
    AdminMetricsService.getDashboardMetrics(currency),
    AdminMetricsService.getRevenueData(12, currency),
    AdminMetricsService.getSubscriptionStatusData(currency),
    AdminMetricsService.getTopPlans(5, currency),
    AdminMetricsService.getRecentPayments(5, currency, locale),
    AdminMetricsService.getGrowthData(currency),
  ]);

  const formatCurrency = (cents: number, currency: string) => {
    const value = cents / 100;
    return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  const metrics: Metric[] = [
    {
      labelKey: "totalStudents",
      fallback: "Total de Alunos",
      value: metricsData.totalStudents,

      icon: <Users size={22} />,
    },
    {
      labelKey: "activeStudents",
      fallback: "Alunos Ativos",
      value: metricsData.activeStudents,

      icon: <UserCheck size={22} />,
    },
    {
      labelKey: "pendingStudents",
      fallback: "Pendentes",
      value: metricsData.pendingStudents,

      icon: <Clock size={22} />,
    },
    {
      labelKey: "pastDueStudents",
      fallback: "Atrasados",
      value: metricsData.pastDueStudents,

      icon: <AlertTriangle size={22} />,
    },
    {
      labelKey: "blockedStudents",
      fallback: "Bloqueados",
      value: metricsData.blockedStudents,

      icon: <Ban size={22} />,
    },
    {
      labelKey: "monthlyRevenue",
      fallback: "Receita do Mês",
      value: formatCurrency(metricsData.monthlyRevenue, metricsData.currency),

      icon: <Banknote size={22} />,
    },
    {
      labelKey: "activeSubscriptions",
      fallback: "Assinaturas Ativas",
      value: metricsData.activeSubscriptions,

      icon: <CreditCard size={22} />,
    },
    {
      labelKey: "monthlyCancellations",
      fallback: "Cancelamentos do Mês",
      value: metricsData.monthlyCancellations,

      icon: <UserX size={22} />,
    },
  ];

  const revenueTitle = await safe(
    "admin",
    "revenueChartTitle",
    "Evolução da Receita (últimos 12 meses)",
  );
  const vsTitle = await safe(
    "admin",
    "studentsVsCancelsChartTitle",
    "Novos Alunos vs Cancelamentos (últimos 6 meses)",
  );
  const subsTitle = await safe(
    "admin",
    "subscriptionStatusTitle",
    "Status de Assinaturas",
  );
  const topPlansTitle = await safe("admin", "topPlansTitle", "Planos em uso");
  const lastPaymentsTitle = await safe(
    "admin",
    "lastPaymentsTitle",
    "Últimos Pagamentos",
  );

  const statusLabel: Record<
    string,
    { label: string; variant: "success" | "warning" | "error" | "default" }
  > = {
    paid: {
      label: await safe("admin", "paymentStatusPaid", "Aprovado"),
      variant: "success",
    },
    pending: {
      label: await safe("admin", "paymentStatusPending", "Pendente"),
      variant: "warning",
    },
    refunded: { label: "Reembolsado", variant: "default" },
    partially_refunded: { label: "Reembolso parcial", variant: "default" },
    processing: { label: "Processando", variant: "warning" },
    canceled: { label: "Cancelado", variant: "default" },
    expired: { label: "Expirado", variant: "error" },
    failed: {
      label: await safe("admin", "paymentStatusFailed", "Falhou"),
      variant: "error",
    },
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      <AdminWorkQueue locale={locale} />
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">
          {pageTitle}
        </h1>
        <p className="text-sm md:text-base text-text-secondary">
          {pageSubtitle}
        </p>
      </header>
      <AdminCurrencySelector currency={currency} />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.labelKey}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <p className="text-sm text-text-secondary">{m.fallback}</p>
                  <p className="text-2xl font-bold text-text">{m.value}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {m.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>{revenueTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Chart
              type="area"
              data={revenueData}
              xKey="name"
              yKey="value"
              className="h-80"
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>{vsTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Chart
              type="bar"
              data={growthData}
              xKey="name"
              series={[
                {
                  key: "students",
                  label: "Novos alunos",
                  color: "hsl(var(--primary))",
                },
                {
                  key: "cancellations",
                  label: "Cancelamentos",
                  color: "#f87171",
                },
              ]}
              className="h-80"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{subsTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Chart
              type="pie"
              data={subscriptionStatusData}
              xKey="name"
              yKey="value"
              className="h-72"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{topPlansTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {!topPlans.length && (
                <li className="text-sm text-text-secondary">
                  Nenhum plano em uso nesta moeda.
                </li>
              )}
              {topPlans.map((p, idx) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-text truncate">
                      {p.name}
                    </span>
                  </div>
                  <Badge variant="default">{p.value}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{lastPaymentsTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {!lastPayments.length && (
                <li className="text-sm text-text-secondary">
                  Nenhum pagamento no período.
                </li>
              )}
              {lastPayments.map((p, idx) => {
                const s = statusLabel[p.status] || statusLabel.pending;
                return (
                  <li
                    key={`${p.name}-${idx}`}
                    className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0 min-w-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text truncate">{p.name}</p>
                      <p className="text-xs text-text-secondary">{p.date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-text text-sm">
                        {p.value}
                      </span>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
