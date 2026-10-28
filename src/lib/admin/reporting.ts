import { getZonedParts, zonedTimeToUtc } from "@/lib/notifications/time";
export type AdminCurrency = "BRL" | "USD";
export const adminCurrency = (value?: string): AdminCurrency =>
  value === "USD" ? "USD" : "BRL";
export function monthKeys(now: Date, length = 12) {
  const local = getZonedParts(now, "America/Sao_Paulo");
  return Array.from({ length }, (_, i) => {
    const date = new Date(
      Date.UTC(local.year, local.month - 1 - (length - 1 - i), 1),
    );
    return date.toISOString().slice(0, 7);
  });
}
export function periodBounds(now: Date) {
  const months = monthKeys(now);
  const current = months[months.length - 1];
  const date = new Date(`${current}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return {
    months,
    start: zonedTimeToUtc(
      `${months[0]}-01`,
      "00:00",
      "America/Sao_Paulo",
    ).toISOString(),
    monthStart: zonedTimeToUtc(
      `${current}-01`,
      "00:00",
      "America/Sao_Paulo",
    ).toISOString(),
    monthEnd: zonedTimeToUtc(
      `${date.toISOString().slice(0, 7)}-01`,
      "00:00",
      "America/Sao_Paulo",
    ).toISOString(),
    yearStart: zonedTimeToUtc(
      `${current.slice(0, 4)}-01-01`,
      "00:00",
      "America/Sao_Paulo",
    ).toISOString(),
  };
}
export function effectiveSubscriptionStatus(
  sub: any,
  graceDays: number,
  now: Date,
): string {
  const end = Date.parse(sub.current_period_end || "");
  if (sub.ended_at && Date.parse(sub.ended_at) <= now.getTime()) return "canceled";
  if (sub.provider === "asaas" && (sub.source === "asaas_pix" || sub.external_id?.startsWith("pay_")) && end <= now.getTime()) return "blocked";
  if (sub.status === "trialing")
    return Date.parse(sub.trial_ends_at || "") > now.getTime()
      ? "trialing"
      : "inactive";
  if (sub.status === "active" && end <= now.getTime())
    return end + graceDays * 86400000 > now.getTime() ? "past_due" : "blocked";
  if (sub.status === "past_due") {
    const grace = end + graceDays * 86400000;
    return grace > now.getTime() ? "past_due" : "blocked";
  }
  return sub.status;
}
export function aggregateAdminReport(
  profiles: any[],
  subscriptions: any[],
  payments: any[],
  plans: any[],
  currency: AdminCurrency,
  now: Date,
  refunds: any[] = [],
) {
  payments = payments.filter(p => !p.is_duplicate);
  const bounds = periodBounds(now);
  const names = new Map(
    profiles.map((p) => [p.id, p.full_name || p.display_name || "Aluno"]),
  );
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const students = profiles.filter(
    (p) => p.role === "student" && !p.is_deleted,
  );
  const studentIds = new Set(students.map((p) => p.id));
  const priority = [
    "active",
    "trialing",
    "past_due",
    "canceled",
    "expired",
    "blocked",
    "inactive",
  ];
  const sorted = [...subscriptions].sort(
    (a, b) =>
      priority.indexOf(a.status) - priority.indexOf(b.status) ||
      String(b.created_at).localeCompare(String(a.created_at)) ||
      String(b.id).localeCompare(String(a.id)),
  );
  const current = new Map<string, any>();
  for (const sub of sorted)
    if (studentIds.has(sub.user_id) && !current.has(sub.user_id))
      current.set(sub.user_id, sub);
  const status = (s: any) =>
    effectiveSubscriptionStatus(
      s,
      Number(planMap.get(s.plan_id)?.grace_days ?? 3),
      now,
    );
  const states = students.map((p) =>
    current.has(p.id) ? status(current.get(p.id)) : "inactive",
  );
  const moneySubs = [...current.values()].filter(
    (s) => s.currency === currency && studentIds.has(s.user_id),
  );
  const paid = payments.filter(
    (p) =>
      p.currency === currency &&
      ["paid", "refunded", "partially_refunded"].includes(p.status) &&
      p.paid_at &&
      Date.parse(p.paid_at) <= now.getTime(),
  );
  const inMonth = (value: string) =>
    !!value &&
    Date.parse(value) >= Date.parse(bounds.monthStart) &&
    Date.parse(value) < Date.parse(bounds.monthEnd);
  const monthPaid = paid.filter((p) => inMonth(p.paid_at));
  const sum = (rows: any[]) =>
    rows.reduce((n, p) => n + Number(p.amount_cents || 0), 0);
  const metric = {
    totalStudents: students.length,
    activeStudents: states.filter((s) => s === "active" || s === "trialing")
      .length,
    pendingStudents: states.filter((s) => s === "inactive").length,
    pastDueStudents: states.filter((s) => s === "past_due").length,
    blockedStudents: states.filter((s) => s === "blocked" || s === "expired")
      .length,
    monthlyRevenue: sum(monthPaid),
    currency,
    activeSubscriptions: moneySubs.filter((s) =>
      ["active", "trialing"].includes(status(s)),
    ).length,
    monthlyCancellations: moneySubs.filter(
      (s) => s.canceled_at && inMonth(s.canceled_at),
    ).length,
  };
  const revenue = bounds.months.map((month) => ({
    name: month,
    value:
      sum(
        paid.filter((p) =>
          getZonedParts(
            new Date(p.paid_at),
            "America/Sao_Paulo",
          ).dateKey.startsWith(month),
        ),
      ) / 100,
  }));
  const growth = bounds.months.slice(-6).map((month) => ({
    name: month,
    students: students.filter((p) =>
      getZonedParts(
        new Date(p.created_at),
        "America/Sao_Paulo",
      ).dateKey.startsWith(month),
    ).length,
    cancellations: subscriptions.filter(
      (s) =>
        s.canceled_at &&
        getZonedParts(
          new Date(s.canceled_at),
          "America/Sao_Paulo",
        ).dateKey.startsWith(month),
    ).length,
  }));
  const counts = new Map<string, number>();
  for (const sub of moneySubs)
    counts.set(status(sub), (counts.get(status(sub)) || 0) + 1);
  const top = new Map<string, number>();
  for (const sub of moneySubs.filter((s) =>
    ["active", "trialing", "past_due"].includes(status(s)),
  ))
    top.set(sub.plan_id, (top.get(sub.plan_id) || 0) + 1);
  const topPlans = Array.from(top, ([plan_id, count]) => ({
    plan_id,
    name: planMap.get(plan_id)?.name_pt || "Sem plano",
    count,
  })).sort((a, b) => b.count - a.count);
  const yearPaid = paid.filter(
    (p) => Date.parse(p.paid_at) >= Date.parse(bounds.yearStart),
  );
  const monthPayments = payments.filter(
    (p) => p.currency === currency && inMonth(p.created_at),
  );
  const provider = new Map<
    string,
    { provider: string; revenue_cents: number; count: number }
  >();
  for (const p of paid.filter(
    (p) => Date.parse(p.paid_at) >= Date.parse(bounds.start),
  )) {
    const row = provider.get(p.provider) || {
      provider: p.provider,
      revenue_cents: 0,
      count: 0,
    };
    row.revenue_cents += Number(p.amount_cents);
    row.count++;
    provider.set(p.provider, row);
  }
  const monthRefunds = refunds.filter(r => r.status === "succeeded" && r.currency === currency && inMonth(r.occurred_at) && Date.parse(r.occurred_at) <= now.getTime());
  const refundCents = monthRefunds.reduce((n,r) => n + Number(r.amount_cents || 0), 0);
  const overview = {
    month_refunded_cents: refundCents,
    month_after_refunds_cents: sum(monthPaid) - refundCents,
    currency,
    mrr_cents: moneySubs
      .filter((s) => status(s) === "active" && !s.cancel_at_period_end && s.source !== "asaas_pix")
      .reduce(
        (n, s) =>
          n +
          Math.round(
            (Number(s.unit_amount_cents) * 30) /
              Math.max(1, Number(s.billing_cycle_days) || 30),
          ),
        0,
      ),
    month_revenue_cents: sum(monthPaid),
    year_revenue_cents: sum(yearPaid),
    last12_revenue_cents: Math.round(
      revenue.reduce((n, p) => n + p.value * 100, 0),
    ),
    avg_ticket_cents: yearPaid.length
      ? Math.round(sum(yearPaid) / yearPaid.length)
      : 0,
    total_subscriptions: moneySubs.length,
    active_subscriptions: counts.get("active") || 0,
    trialing_subscriptions: counts.get("trialing") || 0,
    past_due_subscriptions: counts.get("past_due") || 0,
    blocked_subscriptions: counts.get("blocked") || 0,
    canceled_subscriptions: counts.get("canceled") || 0,
    payments_this_month: monthPayments.length,
    failed_this_month: monthPayments.filter((p) => p.status === "failed")
      .length,
    refunded_this_month: new Set(monthRefunds.map(r => r.payment_id)).size,
  };
  const recentPayments = [...payments]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((p) => ({
      ...p,
      student_name: names.get(p.user_id) || "Conta indisponível",
    }));
  return {
    metric,
    revenue,
    growth,
    overview,
    statusCounts: Array.from(counts, ([status, count]) => ({ status, count })),
    topPlans,
    providerRevenue: Array.from(provider.values()),
    recentPayments,
  };
}
