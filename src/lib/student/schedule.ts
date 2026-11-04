import { z } from "zod";
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) &&
      new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v,
    "Data inválida",
  );
const slotSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const dailyRuleSchema = z.object({
  weekdays: z
    .array(z.number().int().min(1).max(7))
    .min(1)
    .max(7)
    .refine((a) => new Set(a).size === a.length)
    .default([1, 2, 3, 4, 5, 6, 7]),
  on_date: dateKeySchema.nullable().default(null),
  condition: z.enum(["all", "training", "rest"]).default("all"),
  alternative_group: z.string().trim().min(1).max(60).nullable().default(null),
  priority: z.number().int().min(0).max(999).default(0),
  notes: z.string().max(4000).default(""),
  workout_time: slotSchema.nullable().default("07:00"),
  repeat_cycle: z.boolean().default(false),
  fallback_week_one: z.boolean().default(false),
  rest_weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  items: z
    .record(
      z.string().uuid(),
      z.object({
        quantity: z.number().positive().max(100000).optional(),
        unit: z.string().trim().min(1).max(40).optional(),
        slots: z
          .array(slotSchema)
          .min(1)
          .max(24)
          .refine((a) => new Set(a).size === a.length)
          .optional(),
        notes: z.string().max(4000).optional(),
      }),
    )
    .default({}),
});
export type DailyRule = z.infer<typeof dailyRuleSchema>;
export type WorkoutState = "training" | "rest" | "unassigned";
export function defaultRule(kind: string): DailyRule {
  return dailyRuleSchema.parse({
    alternative_group: kind === "diet" ? "dieta-principal" : null,
  });
}
export function weekdayOf(date: string) {
  return ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
}
export function matchesRule(
  rule: DailyRule,
  date: string,
  state: WorkoutState,
) {
  return (
    (rule.on_date
      ? rule.on_date === date
      : rule.weekdays.includes(weekdayOf(date))) &&
    (rule.condition === "all" ||
      (rule.condition === "training" && state === "training") ||
      (rule.condition === "rest" && state === "rest"))
  );
}
export function rulesForDate(
  rows: any[],
  date: string,
): Map<string, DailyRule> {
  const map = new Map<string, DailyRule>();
  for (const row of [...rows]
    .filter(
      (r) =>
        r.effective_from <= date &&
        (!r.rule.on_date || r.rule.on_date === date),
    )
    .sort(
      (a, b) =>
        Number(!!a.rule.on_date) - Number(!!b.rule.on_date) ||
        a.effective_from.localeCompare(b.effective_from),
    )) {
    map.set(
      `${row.kind}:${row.assignment_id}`,
      dailyRuleSchema.parse(row.rule),
    );
  }
  return map;
}
export function selectDailyAssignments<
  T extends { id: string; assigned_at?: string; start_date: string },
>(
  assignments: T[],
  kind: string,
  rules: Map<string, DailyRule>,
  date: string,
  state: WorkoutState,
): T[] {
  const eligible = assignments.filter((a) =>
    matchesRule(rules.get(`${kind}:${a.id}`) || defaultRule(kind), date, state),
  );
  const winners = new Map<string, T>();
  const additive: T[] = [];
  const ruleOf = (a: T) => rules.get(`${kind}:${a.id}`) || defaultRule(kind);
  for (const a of eligible.sort(
    (a, b) =>
      ruleOf(b).priority - ruleOf(a).priority ||
      (b.assigned_at || b.start_date).localeCompare(
        a.assigned_at || a.start_date,
      ) ||
      a.id.localeCompare(b.id),
  )) {
    const group = ruleOf(a).alternative_group;
    if (!group) additive.push(a);
    else if (!winners.has(group)) winners.set(group, a);
  }
  return [...additive, ...winners.values()];
}
export function sortRoutineItems<T extends { slot: string; key: string }>(
  items: T[],
): T[] {
  const time = (s: string) =>
    /^\d{2}:\d{2}/.test(s) ? s.slice(0, 5) : "99:99";
  return [...items].sort(
    (a, b) =>
      time(a.slot).localeCompare(time(b.slot)) || a.key.localeCompare(b.key),
  );
}
export function nextPending<
  T extends { slot: string; key: string; done: boolean },
>(items: T[]): T | undefined {
  return sortRoutineItems(items).find((i) => !i.done);
}
