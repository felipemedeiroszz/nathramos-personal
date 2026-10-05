import type { Metadata } from "next";
import { setRequestLocale, getTranslations, getLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Chart } from "@/components/ui/Chart";
import { Skeleton } from "@/components/ui/Skeleton";
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
import { createClientSSR } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LocaleKey = (typeof locales)[number];

export const metadata: Metadata = {
  title: "Painel Admin",
};

type Metric = {
  labelKey: string;
  fallback: string;
  value: string | number;
  delta: string;
  deltaPositive: boolean;
  deltaGood: boolean;
  icon: React.ReactNode;
};

export default async function AdminDashboardPage({
  params: { locale },
}: {
  params: { locale: LocaleKey };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  await requireRole(["admin", "coach"], "/dashboard");
  void createClientSSR;

  const hasT = async (ns: string, key: string) => {
    try {
      const t = await getTranslations(ns);
      return t.has(key);
    } catch {
      return false;
    }
  };
  const safe = async (ns: string, key: string, fb: string) => {
    try {
      const t = await getTranslations(ns);
      if (t.has(key)) return t(key);
    } catch {}
    return fb;
  };

  const pageTitle = await safe("admin", "title", "Painel Administrativo");
  const pageSubtitle = await safe("admin", "subtitle", "Visão geral da plataforma, alunos e receita");
  const thisMonth = await safe("admin", "thisMonth", "este mês");

  const metricKeys: Array<{
    key: keyof typeof metricsStatic;
    k: string;
    fb: string;
  }> = [
    { key: "totalStudents", k: "totalStudents", fb: "Total de Alunos" },
    { key: "activeStudents", k: "activeStudents", fb: "Alunos Ativos" },
    { key: "pendingStudents", k: "pendingStudents", fb: "Pendentes" },
    { key: "pastDueStudents", k: "pastDueStudents", fb: "Atrasados" },
    { key: "blockedStudents", k: "blockedStudents", fb: "Bloqueados" },
    { key: "monthlyRevenue", k: "monthlyRevenue", fb: "Receita do Mês" },
    { key: "activeSubscriptions", k: "activeSubscriptions", fb: "Assinaturas Ativas" },
    { key: "monthlyCancellations", k: "monthlyCancellations", fb: "Cancelamentos do Mês" },
  ];

  const metricsStatic = {
    totalStudents: { value: 247, delta: "+12%", dp: true, dg: true, icon: <Users size={22} /> },
    activeStudents: { value: 189, delta: "+8%", dp: true, dg: true, icon: <UserCheck size={22} /> },
    pendingStudents: { value: 32, delta: "-3%", dp: false, dg: true, icon: <Clock size={22} /> },
    pastDueStudents: { value: 18, delta: "+2%", dp: false, dg: false, icon: <AlertTriangle size={22} /> },
    blockedStudents: { value: 8, delta: "-1%", dp: false, dg: true, icon: <Ban size={22} /> },
    monthlyRevenue: { value: "R$ 18.450,00", delta: "+15,3%", dp: true, dg: true, icon: <Banknote size={22} /> },
    activeSubscriptions: { value: 195, delta: "+7%", dp: true, dg: true, icon: <CreditCard size={22} /> },
    monthlyCancellations: { value: 12, delta: "-4%", dp: false, dg: true, icon: <UserX size={22} /> },
  } as const;

  const metrics: Metric[] = await Promise.all(
    metricKeys.map(async ({ key, k, fb }) => {
      const label = await safe("admin", k, fb);
      const ms = metricsStatic[key];
      return {
        labelKey: k,
        fallback: fb,
        value: ms.value,
        delta: ms.delta,
        deltaPositive: ms.dp,
        deltaGood: ms.dg,
        icon: ms.icon,
      } as Metric;
    })
  );

  const revenueTitle = await safe("admin", "revenueChartTitle", "Evolução da Receita (últimos 12 meses)");
  const vsTitle = await safe("admin", "studentsVsCancelsChartTitle", "Novos Alunos vs Cancelamentos (últimos 6 meses)");
  const subsTitle = await safe("admin", "subscriptionStatusTitle", "Status de Assinaturas");
  const topPlansTitle = await safe("admin", "topPlansTitle", "Top 5 Planos Vendidos");
  const lastPaymentsTitle = await safe("admin", "lastPaymentsTitle", "Últimos Pagamentos");

  const revenueData = [
    { name: "Jan", value: 12000 },
    { name: "Fev", value: 13000 },
    { name: "Mar", value: 12500 },
    { name: "Abr", value: 14000 },
    { name: "Mai", value: 15200 },
    { name: "Jun", value: 16000 },
    { name: "Jul", value: 15800 },
    { name: "Ago", value: 17000 },
    { name: "Set", value: 16500 },
    { name: "Out", value: 17800 },
    { name: "Nov", value: 18000 },
    { name: "Dez", value: 18450 },
  ];

  const subscriptionStatusData = [
    { name: "Ativas", value: 195 },
    { name: "Teste", value: 14 },
    { name: "Atrasadas", value: 18 },
    { name: "Canceladas", value: 12 },
    { name: "Bloqueadas", value: 8 },
  ];

  const topPlans = [
    { name: "Transformação", value: 97 },
    { name: "Essencial", value: 63 },
    { name: "Elite", value: 35 },
    { name: "Iniciante", value: 30 },
    { name: "Premium", value: 22 },
  ];

  const lastPayments = [
    { name: "Ana Souza", value: "R$ 197,00", status: "paid", date: "02/10" },
    { name: "Bruno Lima", value: "R$ 97,00", status: "pending", date: "02/10" },
    { name: "Carla Dias", value: "R$ 497,00", status: "paid", date: "01/10" },
    { name: "Diego Rocha", value: "R$ 197,00", status: "failed", date: "01/10" },
    { name: "Elisa Prado", value: "R$ 97,00", status: "paid", date: "30/09" },
  ];

  const statusLabel: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
    paid: { label: "Aprovado", variant: "success" },
    pending: { label: "Pendente", variant: "warning" },
    failed: { label: "Falhou", variant: "error" },
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{pageTitle}</h1>
        <p className="text-sm md:text-base text-text-secondary">{pageSubtitle}</p>
      </header>

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
              <div className="mt-3 flex items-center gap-1.5">
                <span
                  className={
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold " +
                    (m.deltaGood
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400")
                  }
                >
                  {m.deltaPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {m.delta}
                </span>
                <span className="text-xs text-text-secondary">{thisMonth}</span>
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
            <Skeleton className="h-80 w-full rounded-xl" />
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
            <Chart type="pie" data={subscriptionStatusData} xKey="name" yKey="value" className="h-72" />
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
              {topPlans.map((p, idx) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-text truncate">{p.name}</span>
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
                      <span className="font-semibold text-text text-sm">{p.value}</span>
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
