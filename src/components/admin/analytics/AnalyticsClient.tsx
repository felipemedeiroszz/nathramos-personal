"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Users,
  Activity,
  Wallet,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { analyticsCopy, analyticsValueLabel } from "@/lib/analytics/copy";
import {
  analyticsQuery,
  changePercent,
  ratio,
  type AnalyticsFilters,
  type AnalyticsReport,
} from "@/lib/analytics/model";
const palette = [
  "#e6bc16",
  "#38bdf8",
  "#34d399",
  "#fb7185",
  "#a78bfa",
  "#fb923c",
];
const field =
  "block mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text min-w-0";
const panel =
  "rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm min-w-0 report-panel";
export function AnalyticsClient({
  report,
  filters,
  locale,
}: {
  report: AnalyticsReport;
  filters: AnalyticsFilters;
  locale: string;
}) {
  const t = analyticsCopy(locale),
    en = locale === "en-US",
    router = useRouter(),
    pathname = usePathname();
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const s = report.summary,
    f = report.financial;
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const money = (cents: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: report.meta.currency,
    }).format(cents / 100);
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "short",
          timeZone: report.meta.timezone,
        }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value))
      : t.none;
  const delta = (current: number, previous: number) => {
    const value = changePercent(current, previous);
    return value === null
      ? t.noBase
      : `${value > 0 ? "+" : ""}${number(value)}% ${t.previous}`;
  };
  const pct = (value: number | null) =>
    value === null ? "—" : number(value) + "%";
  const trend = report.trend.map((row) => ({
    ...row,
    label: new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(row.key + "T12:00:00Z")),
    revenue: (row.revenue_cents || 0) / 100,
  }));
  const tooltip = {
    backgroundColor: "hsl(var(--surface))",
    color: "hsl(var(--text))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
  };
  const statuses =
    f?.statuses.map((item) => ({
      ...item,
      label: analyticsValueLabel(item.name, locale),
    })) || [];
  function preset(days: number) {
    const from = new Date(filters.to + "T12:00Z");
    from.setUTCDate(from.getUTCDate() - days + 1);
    const query = analyticsQuery({
      ...filters,
      from: from.toISOString().slice(0, 10),
      grain: days > 93 ? "month" : "week",
      page: 1,
    });
    router.push(pathname + "?" + query);
  }
  async function download(format: "pdf" | "xlsx") {
    if (busy) return;
    setBusy(format);
    setError("");
    setNotice("");
    try {
      const query = analyticsQuery({ ...filters, page: 1 });
      query.set("format", format);
      query.set("locale", locale);
      const response = await fetch("/api/admin/analytics/export?" + query, {
        cache: "no-store",
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || t.error);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `relatorio-${filters.from}-${filters.to}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setNotice(t.downloadReady);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setBusy(null);
    }
  }
  const coverage = [
    { name: t.workout, value: s.workout_coverage, color: palette[0] },
    { name: t.diet, value: s.diet_coverage, color: palette[2] },
  ];
  return (
    <div id="analytics-report" className="space-y-6 text-text">
      <header className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-surface to-surface p-5 sm:p-7 space-y-5 report-panel">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary text-sm font-semibold">
              <BarChart3 size={18} />
              {t.recorded}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t.title}
            </h1>
            <p className="text-sm text-text-secondary max-w-2xl">
              {t.subtitle}
            </p>
          </div>
          <span className="self-start rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium">
            {t.scope}: {f ? t.platform : t.portfolio}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">
            {t.updated}:{" "}
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: report.meta.timezone,
            }).format(new Date(report.meta.generated_at))}{" "}
            · {report.meta.timezone}
          </p>
          <div className="flex flex-wrap gap-2 print-hide">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} />
              {t.refresh}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => download("pdf")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm disabled:opacity-50"
            >
              <Download size={16} />
              {busy === "pdf" ? t.loading : t.pdf}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => download("xlsx")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              {busy === "xlsx" ? t.loading : t.excel}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm"
            >
              <Printer size={16} />
              {t.print}
            </button>
          </div>
        </div>
        <div className="text-sm font-medium">
          {t.period}: {date(filters.from)} – {date(filters.to)}{" "}
          <span className="text-text-secondary font-normal">
            · {t.previousPeriod}: {date(report.meta.previous_from)} –{" "}
            {date(report.meta.previous_to)}
          </span>
        </div>
        <p className="text-xs text-text-secondary break-words">
          {t.coach}:{" "}
          {f
            ? report.options.coaches.find((item) => item.id === filters.coach)
                ?.name || t.all
            : t.portfolio}
          {filters.q && ` · ${t.search}: ${filters.q}`}
          {f &&
            ` · ${t.currency}: ${filters.currency} · ${t.plan}: ${(() => {
              const plan = report.options.plans.find(
                (item) => item.id === filters.plan,
              );
              return plan ? (en ? plan.name_en : plan.name_pt) : t.all;
            })()} · ${t.provider}: ${filters.provider || t.all}`}
        </p>
        {error && (
          <p role="alert" className="text-red-500 print-hide">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-emerald-500 print-hide">
            {notice}
          </p>
        )}
      </header>
      <section className={panel + " print-hide"} aria-label={t.apply}>
        <div className="flex flex-wrap gap-2 mb-4">
          {[7, 30, 90, 365].map((days) => (
            <button
              type="button"
              key={days}
              onClick={() => preset(days)}
              className="rounded-full bg-surface-secondary border border-border px-3 py-1 text-xs"
            >
              {days} {t.days}
            </button>
          ))}
        </div>
        <form
          key={analyticsQuery(filters).toString()}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <label className="text-xs font-semibold text-text-secondary">
            {t.from}
            <input
              className={field}
              type="date"
              name="from"
              defaultValue={filters.from}
              required
            />
          </label>
          <label className="text-xs font-semibold text-text-secondary">
            {t.to}
            <input
              className={field}
              type="date"
              name="to"
              defaultValue={filters.to}
              required
            />
          </label>
          <label className="text-xs font-semibold text-text-secondary">
            {t.grain}
            <select className={field} name="grain" defaultValue={filters.grain}>
              <option value="day">{t.day}</option>
              <option value="week">{t.week}</option>
              <option value="month">{t.month}</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-text-secondary">
            {t.search}
            <input
              className={field}
              name="q"
              defaultValue={filters.q}
              maxLength={200}
            />
          </label>
          {f && (
            <>
              <label className="text-xs font-semibold text-text-secondary">
                {t.coach}
                <select
                  className={field}
                  name="coach"
                  defaultValue={filters.coach || ""}
                >
                  <option value="">{t.all}</option>
                  {report.options.coaches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-text-secondary">
                {t.currency}
                <select
                  className={field}
                  name="currency"
                  defaultValue={filters.currency}
                >
                  <option>BRL</option>
                  <option>USD</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-text-secondary">
                {t.plan}
                <select
                  className={field}
                  name="plan"
                  defaultValue={filters.plan || ""}
                >
                  <option value="">{t.all}</option>
                  {report.options.plans.map((item) => (
                    <option key={item.id} value={item.id}>
                      {en ? item.name_en : item.name_pt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-text-secondary">
                {t.provider}
                <select
                  className={field}
                  name="provider"
                  defaultValue={filters.provider || ""}
                >
                  <option value="">{t.all}</option>
                  <option value="stripe">Stripe</option>
                  <option value="asaas">Asaas</option>
                </select>
              </label>
            </>
          )}
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-secondary max-w-2xl">
              {f ? t.scopeNote : t.coverageNote}
            </p>
            <div className="flex gap-3 items-center">
              <Link href={pathname} className="text-sm underline">
                {t.reset}
              </Link>
              <button
                type="submit"
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
              >
                {t.apply}
              </button>
            </div>
          </div>
        </form>
      </section>
      <section
        aria-label={t.overview}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <Metric
          title={t.students}
          value={number(s.students)}
          note={`${number(s.new_students)} ${t.newStudents.toLowerCase()} · ${delta(s.new_students, s.previous_new_students)}`}
          icon={<Users size={18} />}
        />
        <Metric
          title={t.completed}
          value={number(s.completed_sessions)}
          note={delta(s.completed_sessions, s.previous_completed_sessions)}
          icon={<Activity size={18} />}
        />
        <Metric
          title={t.active}
          value={number(s.active_students)}
          note={`${pct(ratio(s.active_students, s.students))} ${t.of} ${number(s.students)}`}
          icon={<ArrowUpRight size={18} />}
        />
        <Metric
          title={t.completion}
          value={pct(ratio(s.cohort_completed, s.started_sessions))}
          note={`${number(s.cohort_completed)} / ${number(s.started_sessions)} · ${number(s.minutes)} min`}
          icon={<CalendarDays size={18} />}
        />
      </section>
      <section className="grid lg:grid-cols-3 gap-4">
        <div className={panel + " lg:col-span-2"}>
          <h2 className="text-lg font-semibold">{t.training}</h2>
          <p className="text-xs text-text-secondary mt-1">{t.trainingHint}</p>
          <div
            className="h-[290px] mt-4 report-chart"
            role="img"
            aria-label={t.training}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend}
                margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--text-secondary))" }}
                  minTickGap={28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--text-secondary))" }}
                />
                <Tooltip contentStyle={tooltip} />
                <Line
                  isAnimationActive={false}
                  dataKey="completed"
                  name={t.completed}
                  stroke={palette[0]}
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  isAnimationActive={false}
                  dataKey="new_students"
                  name={t.newStudents}
                  stroke={palette[1]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <Legend color={palette[0]} label={t.completed} />
            <Legend color={palette[1]} label={t.newStudents} />
          </div>
        </div>
        <div className={panel}>
          <h2 className="text-lg font-semibold">{t.coverage}</h2>
          <div className="space-y-7 mt-7">
            {coverage.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm gap-2">
                  <span>{item.name}</span>
                  <strong>{pct(ratio(item.value, s.students))}</strong>
                </div>
                <div className="h-3 rounded-full bg-surface-secondary mt-3 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: item.color,
                      width: `${ratio(item.value, s.students) || 0}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  {number(item.value)} {t.covered} ·{" "}
                  {number(s.students - item.value)} {t.without}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-6">{t.coverageNote}</p>
        </div>
      </section>
      <details className={panel}>
        <summary className="cursor-pointer text-sm font-semibold">
          {en ? "View trend data" : "Ver dados da evolução"}
        </summary>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-left">
            <thead>
              <tr>
                {[
                  t.period,
                  t.completed,
                  t.newStudents,
                  ...(f ? [t.revenue + " (" + report.meta.currency + ")"] : []),
                ].map((label) => (
                  <th key={label} className="p-2 border-b border-border">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.trend.map((row) => (
                <tr key={row.key}>
                  <td className="p-2">{date(row.key)}</td>
                  <td className="p-2 tabular-nums">{number(row.completed)}</td>
                  <td className="p-2 tabular-nums">
                    {number(row.new_students)}
                  </td>
                  {f && (
                    <td className="p-2 tabular-nums">
                      {money(row.revenue_cents || 0)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <section className={panel}>
        <h2 className="text-lg font-semibold">{t.care}</h2>
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          {[
            [t.exams, s.exams_pending, "exames"],
            [t.chats, s.unread_conversations, "mentoria"],
            [t.meetings, s.upcoming_meetings, "reunioes"],
          ].map(([label, value, url]) => (
            <Link
              href={`/${locale}/admin/${url}`}
              key={label}
              className="rounded-xl border border-border p-4 hover:border-primary"
            >
              <p className="text-sm text-text-secondary">{label}</p>
              <strong className="block text-3xl mt-2">
                {number(Number(value))}
              </strong>
            </Link>
          ))}
        </div>
      </section>
      {f && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t.finance}</h2>
            <span className="text-xs rounded-full border border-border px-3 py-1">
              {report.meta.currency}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Metric
              title={t.revenue}
              value={money(f.paid_cents)}
              note={delta(f.paid_cents, f.previous_paid_cents)}
              icon={<Wallet size={18} />}
            />
            <Metric
              title={locale === "pt-BR" ? "Estornos confirmados" : "Confirmed refunds"}
              value={money(f.refunded_cents || 0)}
              note={t.refunds}
            />
            <Metric
              title={locale === "pt-BR" ? "Após estornos, antes de taxas" : "After refunds, before fees"}
              value={money(f.paid_cents - (f.refunded_cents || 0))}
              note={t.revenue}
            />
            <Metric
              title={t.ticket}
              value={f.paid_count ? money(f.paid_cents / f.paid_count) : "—"}
              note={`${number(f.paid_count)} ${t.count.toLowerCase()}`}
            />
            <Metric
              title={t.mrr}
              value={money(f.mrr_cents)}
              note={`${number(f.subscriptions)} ${t.statuses.toLowerCase()}`}
            />
            <Metric
              title={t.failed}
              value={number(f.failed_count)}
              note={`${t.pending}: ${number(f.pending_count)} · ${t.refunds}: ${number(f.refund_count)}`}
            />
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className={panel + " lg:col-span-2"}>
              <h3 className="font-semibold">
                {t.revenueTrend} ({report.meta.currency})
              </h3>
              <div
                className="h-[290px] mt-4 report-chart"
                role="img"
                aria-label={t.revenueTrend}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trend}
                    margin={{ top: 8, right: 10, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--text-secondary))",
                      }}
                      minTickGap={28}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--text-secondary))",
                      }}
                      tickFormatter={(value) =>
                        new Intl.NumberFormat(locale, {
                          notation: "compact",
                        }).format(value)
                      }
                    />
                    <Tooltip
                      contentStyle={tooltip}
                      formatter={(value: number) => money(value * 100)}
                    />
                    <Area
                      isAnimationActive={false}
                      dataKey="revenue"
                      name={t.revenue}
                      stroke={palette[2]}
                      fill={palette[2]}
                      fillOpacity={0.18}
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={panel}>
              <h3 className="font-semibold">{t.statuses}</h3>
              {statuses.length ? (
                <>
                  <div
                    className="h-[220px] report-chart"
                    role="img"
                    aria-label={t.statuses}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={statuses}
                          dataKey="value"
                          nameKey="label"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {statuses.map((item, index) => (
                            <Cell
                              key={item.name}
                              fill={palette[index % palette.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltip} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xs">
                    {statuses.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex justify-between gap-2"
                      >
                        <Legend
                          color={palette[index % palette.length]}
                          label={item.label}
                        />
                        <strong>{number(item.value)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-secondary py-12">{t.empty}</p>
              )}
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className={panel}>
              <h3 className="font-semibold">{t.methods}</h3>
              {f.methods.length ? (
                <div
                  className="h-[260px] mt-4 report-chart"
                  role="img"
                  aria-label={t.methods}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={f.methods.map((item) => ({
                        ...item,
                        label: analyticsValueLabel(item.name, locale),
                      }))}
                      margin={{ left: -20, right: 8, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--text-secondary))",
                        }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fontSize: 11,
                          fill: "hsl(var(--text-secondary))",
                        }}
                      />
                      <Tooltip contentStyle={tooltip} />
                      <Bar
                        isAnimationActive={false}
                        dataKey="value"
                        name={t.count}
                        fill={palette[1]}
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-text-secondary py-12">{t.empty}</p>
              )}
            </div>
            <div className={panel}>
              <h3 className="font-semibold mb-5">{t.topPlans}</h3>
              <div className="space-y-4">
                {f.plans.map((item, index) => (
                  <div key={item.name_pt}>
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words">
                        {index + 1}. {en ? item.name_en : item.name_pt}
                      </span>
                      <strong className="shrink-0">{money(item.cents)}</strong>
                    </div>
                    <div className="h-2 bg-surface-secondary rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${f.plans[0]?.cents ? (item.cents / f.plans[0].cents) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {!f.plans.length && (
                  <p className="text-sm text-text-secondary py-12">{t.empty}</p>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-text-secondary">{t.financeNote}</p>
        </section>
      )}
      <section className={panel}>
        <h2 className="text-lg font-semibold">{t.details}</h2>
        <p className="text-xs text-text-secondary mt-1 mb-4">{t.detailNote}</p>
        <div className="overflow-x-auto report-table">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-secondary border-b border-border">
              <tr>
                {[
                  t.name,
                  t.responsible,
                  t.sessions,
                  t.minutes,
                  t.last,
                  t.prescriptions,
                  t.pendingExams,
                ].map((label) => (
                  <th className="p-3 font-medium whitespace-nowrap" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.students.map((student) => (
                <tr key={student.id} className="border-b border-border/60">
                  <td className="p-3 min-w-[160px]">
                    <Link
                      href={`/${locale}/admin/alunos/${student.id}`}
                      className="font-medium hover:underline"
                      aria-label={`${t.openStudent}: ${student.name}`}
                    >
                      {student.name}
                    </Link>
                  </td>
                  <td className="p-3 min-w-[130px] text-text-secondary">
                    {student.coach_name || "—"}
                  </td>
                  <td className="p-3 tabular-nums">
                    {number(student.completed)}
                  </td>
                  <td className="p-3 tabular-nums">
                    {number(student.minutes)}
                  </td>
                  <td className="p-3 whitespace-nowrap text-text-secondary">
                    {date(student.last_workout)}
                  </td>
                  <td className="p-3 min-w-[160px]">
                    <p>
                      {t.workout}:{" "}
                      <span
                        className={
                          student.workout
                            ? "text-emerald-500"
                            : "text-amber-500"
                        }
                      >
                        {student.workout ? t.yes : t.no}
                      </span>
                    </p>
                    <p>
                      {t.diet}:{" "}
                      <span
                        className={
                          student.diet ? "text-emerald-500" : "text-amber-500"
                        }
                      >
                        {student.diet ? t.yes : t.no}
                      </span>
                    </p>
                  </td>
                  <td className="p-3 tabular-nums">
                    {number(student.pending_exams)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!report.students.length && (
          <p className="py-8 text-center text-text-secondary">{t.empty}</p>
        )}
        <nav
          className="flex flex-wrap justify-between gap-3 items-center text-sm mt-4"
          aria-label={t.page}
        >
          <span>
            {number(report.details.total)} {t.students.toLowerCase()} · {t.page}{" "}
            {report.details.page} {t.of}{" "}
            {Math.max(1, Math.ceil(report.details.total / report.details.size))}
          </span>
          <div className="flex gap-4 print-hide">
            {report.details.page > 1 && (
              <Link
                className="underline"
                href={
                  pathname +
                  "?" +
                  analyticsQuery({ ...filters, page: report.details.page - 1 })
                }
              >
                {t.back}
              </Link>
            )}
            {report.details.page * report.details.size <
              report.details.total && (
              <Link
                className="underline"
                href={
                  pathname +
                  "?" +
                  analyticsQuery({ ...filters, page: report.details.page + 1 })
                }
              >
                {t.next}
              </Link>
            )}
          </div>
        </nav>
      </section>
      <section className={panel + " text-xs text-text-secondary space-y-2"}>
        <h2 className="text-sm font-semibold text-text">{t.definitions}</h2>
        <p>{t.periodNote}</p>
        <p>{t.coverageNote}</p>
        <p>{t.completionNote}</p>
        {f && <p>{t.financeNote}</p>}
      </section>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body * {
            visibility: hidden;
          }
          #analytics-report,
          #analytics-report * {
            visibility: visible;
          }
          #analytics-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            color: #111 !important;
            background: white !important;
            --text: 222 47% 11%;
            --text-secondary: 215 16% 35%;
            --surface: 0 0% 100%;
            --surface-secondary: 210 40% 96%;
            --border: 214 32% 85%;
          }
          #analytics-report .print-hide,
          #analytics-report .recharts-tooltip-wrapper {
            display: none !important;
          }
          #analytics-report .report-panel {
            background: white !important;
            box-shadow: none;
            break-inside: avoid;
          }
          #analytics-report svg text {
            fill: #334155 !important;
          }
          #analytics-report .report-chart {
            height: 220px !important;
          }
          #analytics-report .report-table {
            overflow: visible;
          }
          #analytics-report table {
            font-size: 9px;
            table-layout: fixed;
          }
          #analytics-report th,
          #analytics-report td {
            min-width: 0 !important;
            white-space: normal !important;
            padding: 5px !important;
            overflow-wrap: anywhere;
          }
          #analytics-report a {
            text-decoration: none;
          }
          #analytics-report h1 {
            font-size: 23px;
          }
        }
      `}</style>
    </div>
  );
}
function Metric({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={panel}>
      <div className="flex justify-between gap-2 text-sm text-text-secondary">
        <p>{title}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <strong className="block text-2xl sm:text-3xl font-bold tracking-tight mt-3 break-words tabular-nums">
        {value}
      </strong>
      <p className="text-xs text-text-secondary mt-2 leading-relaxed">{note}</p>
    </div>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
