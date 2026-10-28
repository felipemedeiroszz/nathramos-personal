import { z } from "zod";
export type AnalyticsParams = Record<string, string | undefined>;
export function analyticsFilters(params: AnalyticsParams, now = new Date()) {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const end = params.to || today;
  const fallback = new Date(`${end}T12:00:00Z`);
  fallback.setUTCDate(fallback.getUTCDate() - 89);
  const input = z
    .object({
      from: z.string().date(),
      to: z.string().date(),
      grain: z.enum(["day", "week", "month"]),
      currency: z.enum(["BRL", "USD"]),
      coach: z.string().uuid().optional(),
      plan: z.string().uuid().optional(),
      provider: z.enum(["stripe", "asaas"]).optional(),
      q: z.string().trim().max(200),
      page: z.coerce.number().int().min(1).max(100000),
    })
    .parse({
      from:
        params.from ||
        (Number.isNaN(fallback.getTime())
          ? today
          : fallback.toISOString().slice(0, 10)),
      to: end,
      grain: params.grain || "week",
      currency: params.currency || "BRL",
      coach: params.coach || undefined,
      plan: params.plan || undefined,
      provider: params.provider || undefined,
      q: params.q || "",
      page: params.page || 1,
    });
  const days =
    (Date.parse(input.to + "T12:00:00Z") -
      Date.parse(input.from + "T12:00:00Z")) /
    86400000;
  if (days < 0 || days > 730)
    throw new Error(
      "Selecione um período de até 731 dias, com início anterior ao fim.",
    );
  if (input.grain === "day" && days > 92)
    throw new Error(
      "Agrupamento diário aceita até 93 dias. Use semanas ou meses.",
    );
  return input;
}
export type AnalyticsFilters = ReturnType<typeof analyticsFilters>;
export interface AnalyticsStudent {
  id: string;
  name: string;
  coach_name: string | null;
  completed: number;
  minutes: number;
  last_workout: string | null;
  workout: boolean;
  diet: boolean;
  pending_exams: number;
  unread: number;
}
export interface AnalyticsReport {
  meta: {
    from: string;
    to: string;
    previous_from: string;
    previous_to: string;
    grain: string;
    currency: string;
    role: string;
    generated_at: string;
    timezone: string;
    coach_id: string | null;
    plan_id: string | null;
    provider: string | null;
    search: string;
  };
  summary: {
    students: number;
    new_students: number;
    previous_new_students: number;
    completed_sessions: number;
    previous_completed_sessions: number;
    started_sessions: number;
    cohort_completed: number;
    active_students: number;
    minutes: number;
    workout_coverage: number;
    diet_coverage: number;
    exams_pending: number;
    unread_conversations: number;
    upcoming_meetings: number;
  };
  financial: null | {
    paid_cents: number;
    previous_paid_cents: number;
    paid_count: number;
    pending_count: number;
    failed_count: number;
    refund_count: number;
    refunded_cents?: number;
    mrr_cents: number;
    subscriptions: number;
    statuses: { name: string; value: number }[];
    methods: { name: string; value: number; cents: number }[];
    plans: {
      name_pt: string;
      name_en: string;
      payments: number;
      cents: number;
    }[];
  };
  trend: {
    key: string;
    completed: number;
    new_students: number;
    revenue_cents: number | null;
  }[];
  students: AnalyticsStudent[];
  details: { total: number; page: number; size: number };
  options: {
    coaches: { id: string; name: string }[];
    plans: { id: string; name_pt: string; name_en: string }[];
  };
}
export function changePercent(
  current: number,
  previous: number,
): number | null {
  return previous > 0
    ? Math.round(((current - previous) * 1000) / previous) / 10
    : null;
}
export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0
    ? Math.round((numerator * 1000) / denominator) / 10
    : null;
}
export function analyticsQuery(filters: AnalyticsFilters) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value !== undefined && value !== "") query.set(key, String(value));
  return query;
}
