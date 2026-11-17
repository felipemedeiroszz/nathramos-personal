import { z } from "zod";
const date = z.iso.date();
export const workoutPeriodSchema = z
  .object({ kit_id: z.guid(), start_date: date, end_date: date })
  .refine((value) => value.end_date >= value.start_date, {
    message: "A data final deve ser igual ou posterior à inicial.",
    path: ["end_date"],
  });
export const workoutScheduleSchema = z
  .object({
    student_id: z.guid(),
    assignment_id: z.guid().optional(),
    entries: z.array(workoutPeriodSchema).min(1).max(6),
  })
  .superRefine((value, context) => {
    for (let i = 1; i < value.entries.length; i++)
      if (value.entries[i].start_date <= value.entries[i - 1].end_date)
        context.addIssue({
          code: "custom",
          path: ["entries", i, "start_date"],
          message: "Cada kit deve começar depois do término do anterior.",
        });
    if (value.assignment_id && value.entries.length !== 1)
      context.addIssue({
        code: "custom",
        path: ["entries"],
        message: "Edite um período por vez.",
      });
  });
export function followingDate(value: string) {
  if (!date.safeParse(value).success) return "";
  const day = new Date(value + "T12:00:00Z");
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}
export function assignmentPhase(
  assignment: {
    status: string;
    start_date?: string | null;
    end_date?: string | null;
  },
  today: string,
) {
  if (assignment.status !== "active") return "inactive";
  if (assignment.end_date && assignment.end_date < today) return "ended";
  return assignment.start_date && assignment.start_date > today
    ? "scheduled"
    : "current";
}
