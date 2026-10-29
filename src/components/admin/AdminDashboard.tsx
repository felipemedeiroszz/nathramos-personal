"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Download,
  Dumbbell,
  LayoutGrid,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  AlertCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type Point = { name: string; value: number };
type Props = {
  locale: string;
  currency: string;
  updatedAt: string;
  workQueue: ReactNode;
  metrics: {
    totalStudents: number;
    activeStudents: number;
    pendingStudents: number;
    pastDueStudents: number;
    blockedStudents: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
    monthlyCancellations: number;
  };
  revenue: Point[];
  statuses: Point[];
  plans: Point[];
  growth: { name: string; students: number; cancellations: number }[];
  payments: { name: string; value: string; status: string; date: string }[];
};
const colors = [
  "#facc15",
  "#60a5fa",
  "#fb923c",
  "#a78bfa",
  "#64748b",
  "#f87171",
  "#2dd4bf",
];
const panel = "min-w-0 rounded-2xl border border-white/[0.08] bg-[#101113]";
const control =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400";
const tooltip = {
  background: "#18191c",
  border: "1px solid #343438",
  borderRadius: 12,
  color: "#fafafa",
  fontSize: 12,
};

export function AdminDashboard({
  locale,
  currency,
  metrics: m,
  revenue,
  statuses,
  plans,
  payments,
  growth,
  updatedAt,
  workQueue,
}: Props) {
  const t = (pt: string, en: string) => (locale === "en-US" ? en : pt);
  const [tab, setTab] = useState("overview"),
    [months, setMonths] = useState(12),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all");
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const money = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  const href = (path: string) => `/${locale}/admin/${path}`;
  const activeRate = m.totalStudents
    ? Math.round((m.activeStudents / m.totalStudents) * 100)
    : 0;
  const total = statuses.reduce((sum, p) => sum + p.value, 0);
  const chartData = revenue.slice(-months);
  const filtered = payments.filter(
    (p) =>
      p.name
        .toLocaleLowerCase(locale)
        .includes(search.toLocaleLowerCase(locale)) &&
      (status === "all" || p.status === status),
  );
  const statusLabels: Record<string, string> = {
    paid: t("Aprovado", "Paid"),
    pending: t("Pendente", "Pending"),
    failed: t("Falhou", "Failed"),
    refunded: t("Reembolsado", "Refunded"),
    partially_refunded: t("Reembolso parcial", "Partially refunded"),
    processing: t("Processando", "Processing"),
    canceled: t("Cancelado", "Canceled"),
    expired: t("Expirado", "Expired"),
  };
  const monthLabel = (key: string) =>
    /^\d{4}-\d{2}$/.test(key)
      ? new Date(`${key}-02T12:00:00Z`)
          .toLocaleDateString(locale, {
            month: "short",
            timeZone: "America/Sao_Paulo",
          })
          .replace(".", "")
      : key;
  const cards = [
    {
      label: t("Receita do mês", "Monthly revenue"),
      value: money(m.monthlyRevenue / 100),
      icon: Wallet,
      detail: t(
        "Pagamentos aprovados · mês atual",
        "Approved payments · current month",
      ),
      accent: true,
      path: "financeiro",
    },
    {
      label: t("Alunos ativos", "Active students"),
      value: m.activeStudents,
      icon: Users,
      detail: `${activeRate}% ${t("da base total de alunos", "of all students")}`,
      path: "alunos",
    },
    {
      label: t("Assinaturas ativas", "Active subscriptions"),
      value: m.activeSubscriptions,
      icon: CreditCard,
      detail: t(
        "Ativas e em teste na moeda selecionada",
        "Active and trialing in selected currency",
      ),
      path: "assinaturas",
    },
    {
      label: t("Precisam de atenção", "Need attention"),
      value: m.pastDueStudents + m.blockedStudents,
      icon: AlertCircle,
      detail: `${m.pastDueStudents} ${t("atrasados", "past due")} · ${m.blockedStudents} ${t("bloqueados", "blocked")}`,
      path: "alunos",
    },
  ];

  return (
    <div className="space-y-6 text-zinc-100 [font-variant-numeric:tabular-nums]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            {t("Central de gestão", "Management center")}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[34px]">
            {t("Visão geral", "Overview")}
            <span className="text-yellow-400">.</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {t(
              "Seu negócio em movimento. Cada detalhe, sob controle.",
              "Your business in motion. Every detail under control.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            className={control}
            aria-label={t("Atualizar dados", "Refresh data")}
            onClick={() => router.refresh()}
          >
            <RefreshCw size={14} />
          </button>
          <Link href={href("relatorios")} className={control}>
            <Download size={14} />
            {t("Relatórios", "Reports")}
          </Link>
          <Link
            href={href("alunos")}
            className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-yellow-300"
          >
            {t("Gerenciar alunos", "Manage students")}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
        <div
          role="tablist"
          aria-label={t("Seções do dashboard", "Dashboard sections")}
          className="flex gap-5"
        >
          {[
            {
              key: "overview",
              label: t("Visão geral", "Overview"),
              icon: LayoutGrid,
            },
            { key: "finance", label: t("Financeiro", "Finance"), icon: Wallet },
            {
              key: "operations",
              label: t("Operação", "Operations"),
              icon: Activity,
            },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              id={`tab-${key}`}
              role="tab"
              aria-selected={tab === key}
              aria-controls="dashboard-panel"
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 border-b-2 py-3.5 text-xs font-medium transition",
                tab === key
                  ? "border-yellow-400 text-yellow-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <span className="text-[11px] text-zinc-500">
            {t("Moeda", "Currency")}
          </span>
          {["BRL", "USD"].map((code) => {
            const query = new URLSearchParams(params.toString());
            query.set("currency", code);
            return (
              <Link
                key={code}
                aria-current={currency === code ? "page" : undefined}
                href={`${pathname}?${query}`}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                  currency === code
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-white",
                )}
              >
                {code}
              </Link>
            );
          })}
        </div>
      </div>
      <div
        id="dashboard-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="space-y-5"
      >
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, detail, accent, path }) => (
            <Link
              key={label}
              href={href(path)}
              className={cn(
                panel,
                "group p-5 transition hover:border-white/20",
                accent &&
                  "border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.09] to-[#101113]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{label}</span>
                <Icon
                  size={17}
                  className={accent ? "text-yellow-400" : "text-zinc-500"}
                />
              </div>
              <div className="my-4 flex items-center justify-between">
                <strong className="text-[30px] font-semibold tracking-tight">
                  {value}
                </strong>
                <ArrowUpRight
                  size={17}
                  className="text-zinc-600 group-hover:text-yellow-400"
                />
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-500">
                {detail}
              </p>
            </Link>
          ))}
        </section>
        {tab !== "operations" && (
          <>
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(280px,1fr)]">
              <article className={panel}>
                <div className="flex flex-wrap justify-between gap-3 p-5">
                  <div>
                    <h2 className="text-sm font-semibold">
                      {t("Evolução da receita", "Revenue performance")}
                    </h2>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {t(
                        "Receita bruta de pagamentos aprovados",
                        "Gross revenue from approved payments",
                      )}
                    </p>
                  </div>
                  <label className={control}>
                    <CalendarDays size={13} />
                    <select
                      aria-label={t("Período do gráfico", "Chart period")}
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      className="bg-[#18191c] text-xs"
                    >
                      {[3, 6, 12].map((n) => (
                        <option key={n} value={n}>
                          {n} {t("meses", "months")}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap items-baseline gap-3 px-5 pb-6">
                  <strong className="text-3xl font-semibold tracking-tight">
                    {money(chartData.reduce((sum, p) => sum + p.value, 0))}
                  </strong>
                  <span className="text-[11px] text-zinc-500">
                    {t("no período selecionado", "in selected period")}
                  </span>
                </div>
                <div
                  className="h-64 w-full px-3 pb-4"
                  role="img"
                  aria-label={t(
                    "Gráfico de receita mensal",
                    "Monthly revenue chart",
                  )}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ right: 12, top: 5 }}>
                      <defs>
                        <linearGradient
                          id="dashboard-revenue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#facc15"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="#facc15"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="#27272a"
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="name"
                        tickFormatter={monthLabel}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#71717a", fontSize: 10 }}
                        minTickGap={22}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#71717a", fontSize: 10 }}
                        tickFormatter={(v) =>
                          new Intl.NumberFormat(locale, {
                            notation: "compact",
                          }).format(v)
                        }
                        width={50}
                      />
                      <Tooltip
                        contentStyle={tooltip}
                        formatter={(v: number) => [
                          money(v),
                          t("Receita", "Revenue"),
                        ]}
                        labelFormatter={monthLabel}
                      />
                      <Area
                        dataKey="value"
                        type="monotone"
                        stroke="#facc15"
                        strokeWidth={2.5}
                        fill="url(#dashboard-revenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between border-t border-white/[0.06] px-5 py-3 text-[10px] text-zinc-500">
                  <span>
                    {currency} ·{" "}
                    {t("Sem conversão de moedas", "No currency conversion")}
                  </span>
                  <Link
                    className="flex items-center gap-1 hover:text-yellow-400"
                    href={href("financeiro")}
                  >
                    {t("Ver financeiro", "View finances")}
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </article>
              <article className={cn(panel, "p-5")}>
                <h2 className="text-sm font-semibold">
                  {t("Saúde das assinaturas", "Subscription health")}
                </h2>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {t(
                    "Distribuição na moeda selecionada",
                    "Distribution in selected currency",
                  )}
                </p>
                <div className="relative my-3 h-48">
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <strong className="text-3xl font-semibold">{total}</strong>
                    <span className="mt-1 text-[10px] text-zinc-500">
                      {t("assinaturas", "subscriptions")}
                    </span>
                  </div>
                  {total > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statuses}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={65}
                          outerRadius={82}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {statuses.map((p, i) => (
                            <Cell
                              key={p.name}
                              fill={colors[i % colors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltip}
                          itemStyle={{ color: "#fafafa" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-[14px] border-white/5" />
                  )}
                </div>
                <div className="space-y-2.5">
                  {statuses.map((p, i) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="flex items-center gap-2 text-zinc-400">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: colors[i % colors.length] }}
                        />
                        {p.name}
                      </span>
                      <span>
                        {p.value}
                        <span className="ml-3 inline-block w-9 text-right text-zinc-500">
                          {total ? Math.round((p.value / total) * 100) : 0}%
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </section>
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <article className={cn(panel, "p-5")}>
                <h2 className="text-sm font-semibold">
                  {t("Movimentação de alunos", "Student growth")}
                </h2>
                <p className="mb-6 mt-1 text-[11px] text-zinc-500">
                  {t(
                    "Novos alunos e cancelamentos · últimos 6 meses",
                    "New students and cancellations · last 6 months",
                  )}
                </p>
                <div
                  className="h-52"
                  role="img"
                  aria-label={t(
                    "Novos alunos e cancelamentos",
                    "New students and cancellations",
                  )}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growth} barGap={4}>
                      <CartesianGrid
                        vertical={false}
                        stroke="#27272a"
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="name"
                        tickFormatter={monthLabel}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#71717a", fontSize: 10 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                        tick={{ fill: "#71717a", fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={tooltip}
                        cursor={{ fill: "#ffffff05" }}
                        labelFormatter={monthLabel}
                      />
                      <Bar
                        name={t("Novos alunos", "New students")}
                        dataKey="students"
                        fill="#facc15"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={20}
                      />
                      <Bar
                        name={t("Cancelamentos", "Cancellations")}
                        dataKey="cancellations"
                        fill="#52525b"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex gap-4 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-2">
                    <i className="h-2 w-2 rounded-sm bg-yellow-400" />
                    {t("Novos alunos", "New students")}
                  </span>
                  <span className="flex items-center gap-2">
                    <i className="h-2 w-2 rounded-sm bg-zinc-600" />
                    {t("Cancelamentos", "Cancellations")}
                  </span>
                </div>
              </article>
              <article className={cn(panel, "p-5")}>
                <div className="flex justify-between">
                  <h2 className="text-sm font-semibold">
                    {t("Planos em destaque", "Top plans")}
                  </h2>
                  <Link
                    href={href("planos")}
                    aria-label={t("Ver planos", "View plans")}
                    className="text-zinc-500 hover:text-yellow-400"
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </div>
                <p className="mb-6 mt-1 text-[11px] text-zinc-500">
                  {t(
                    "Distribuição dos 5 planos mais utilizados",
                    "Distribution of the top 5 plans",
                  )}
                </p>
                {plans.length ? (
                  <div className="space-y-5">
                    {plans.map((p, i) => {
                      const count = plans.reduce(
                        (n, item) => n + item.value,
                        0,
                      );
                      return (
                        <div key={p.name}>
                          <div className="mb-2 flex justify-between gap-3 text-xs">
                            <span className="truncate text-zinc-300">
                              <span className="mr-2 text-[10px] text-zinc-600">
                                0{i + 1}
                              </span>
                              {p.name}
                            </span>
                            <span className="shrink-0 text-zinc-400">
                              {p.value} ·{" "}
                              {count ? Math.round((p.value / count) * 100) : 0}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${count ? (p.value / count) * 100 : 0}%`,
                                background: colors[i],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty
                    text={t(
                      "Nenhum plano em uso nesta moeda.",
                      "No plans in use for this currency.",
                    )}
                  />
                )}
              </article>
            </section>
            <article className={panel}>
              <div className="flex justify-between gap-4 p-5">
                <div>
                  <h2 className="text-sm font-semibold">
                    {t("Últimos pagamentos", "Recent payments")}
                  </h2>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {t(
                      "As 10 transações mais recentes",
                      "The 10 most recent transactions",
                    )}
                  </p>
                </div>
                <Link
                  className="flex items-center gap-2 text-xs text-zinc-400 hover:text-yellow-400"
                  href={href("pagamentos")}
                >
                  {t("Ver todos", "View all")}
                  <ArrowRight size={13} />
                </Link>
              </div>
              <div className="flex flex-wrap gap-3 border-y border-white/[0.06] px-5 py-3">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-zinc-500">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label={t(
                      "Buscar nos pagamentos recentes",
                      "Search recent payments",
                    )}
                    placeholder={t("Buscar aluno…", "Search student…")}
                    className="w-full min-w-0 bg-transparent py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:outline-yellow-400"
                  />
                </label>
                <select
                  aria-label={t("Status do pagamento", "Payment status")}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={cn(control, "max-w-44 bg-[#18191c]")}
                >
                  <option value="all">
                    {t("Todos os status", "All statuses")}
                  </option>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="bg-white/[0.015] text-[10px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      {[
                        t("Aluno", "Student"),
                        t("Data", "Date"),
                        "Status",
                        t("Valor", "Amount"),
                      ].map((label) => (
                        <th
                          key={label}
                          className="px-5 py-3 font-medium last:text-right"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {filtered.map((p, i) => (
                      <tr
                        key={`${p.name}-${i}`}
                        className="hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] text-zinc-400">
                              {p.name
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("")}
                            </span>
                            <span className="font-medium">{p.name}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500">{p.date}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px]",
                              p.status === "paid"
                                ? "bg-emerald-400/10 text-emerald-400"
                                : ["failed", "expired"].includes(p.status)
                                  ? "bg-rose-400/10 text-rose-400"
                                  : "bg-amber-400/10 text-amber-300",
                            )}
                          >
                            <span className="h-1 w-1 rounded-full bg-current" />
                            {statusLabels[p.status] || p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium">
                          {p.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <Empty
                    text={t(
                      "Nenhum pagamento encontrado com estes filtros.",
                      "No payments match these filters.",
                    )}
                  />
                )}
              </div>
              <div className="flex justify-between gap-2 border-t border-white/[0.06] px-5 py-3 text-[10px] text-zinc-500">
                <span>
                  {filtered.length} {t("de", "of")} {payments.length}{" "}
                  {t("transações recentes", "recent transactions")}
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck size={12} />
                  {currency}
                </span>
              </div>
            </article>
          </>
        )}
        {tab !== "finance" && (
          <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className={cn(panel, "p-5")}>{workQueue}</div>
            <aside className="space-y-4">
              <div className={cn(panel, "p-5")}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Activity size={15} className="text-yellow-400" />
                  {t("Retrato da base", "Student snapshot")}
                </h2>
                {[
                  {
                    label: t("Total de alunos", "Total students"),
                    value: m.totalStudents,
                  },
                  {
                    label: t("Aguardando ativação", "Awaiting activation"),
                    value: m.pendingStudents,
                  },
                  {
                    label: t("Cancelamentos no mês", "Monthly cancellations"),
                    value: m.monthlyCancellations,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between gap-3 border-t border-white/[0.06] py-3 text-xs"
                  >
                    <span className="text-zinc-500">{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                ))}
                <div className="mt-3 flex justify-between text-[10px] text-zinc-400">
                  <span>
                    {t("Alunos ativos / base total", "Active / total students")}
                  </span>
                  <span className="text-yellow-400">{activeRate}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-yellow-400"
                    style={{ width: `${activeRate}%` }}
                  />
                </div>
              </div>
              <div className={cn(panel, "p-5")}>
                <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  {t("Acesso rápido", "Quick access")}
                </h2>
                {[
                  {
                    icon: Dumbbell,
                    title: t("Biblioteca de treinos", "Workout library"),
                    path: "treinos",
                  },
                  {
                    icon: CalendarDays,
                    title: t("Agenda de reuniões", "Meeting calendar"),
                    path: "reunioes",
                  },
                  {
                    icon: CreditCard,
                    title: t("Gerenciar planos", "Manage plans"),
                    path: "planos",
                  },
                ].map(({ icon: Icon, title, path }) => (
                  <Link
                    key={path}
                    href={href(path)}
                    className="flex items-center gap-3 rounded-lg py-3 text-xs text-zinc-400 hover:text-yellow-400"
                  >
                    <Icon size={15} />
                    {title}
                    <ArrowUpRight size={13} className="ml-auto" />
                  </Link>
                ))}
              </div>
            </aside>
          </section>
        )}
      </div>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-white/[0.06] pt-4 text-[10px] text-zinc-500">
        <span>
          NATH RAMOS / {t("Painel administrativo", "Admin dashboard")}
        </span>
        <span>
          {t("Atualizado às", "Updated at")}{" "}
          {new Date(updatedAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          })}{" "}
          · {t("Fuso de São Paulo", "São Paulo time")}
        </span>
      </footer>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
      <CreditCard size={24} className="text-zinc-600" />
      <p className="text-xs text-zinc-500">{text}</p>
    </div>
  );
}
