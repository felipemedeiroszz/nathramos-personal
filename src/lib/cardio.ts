import { z } from "zod";
export const cardioActivitySchema = z.object({
  id: z.string().uuid().optional(),
  name_pt: z.string().trim().min(1).max(100),
  name_en: z.string().trim().min(1).max(100),
  is_active: z.boolean().default(true),
});
export const cardioPlanSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  activity_id: z.string().uuid(),
  target_minutes: z.number().int().min(1).max(1440),
  remove: z.boolean().optional(),
});
export const cardioLogSchema = z
  .object({
    status: z.enum(["done", "skipped"]),
    activity_id: z.string().uuid().nullable().default(null),
    duration_min: z.number().int().min(1).max(1440).nullable().default(null),
    notes: z.string().trim().max(1000).default(""),
  })
  .superRefine((v, ctx) => {
    if (v.status === "done" && (!v.activity_id || v.duration_min === null))
      ctx.addIssue({
        code: "custom",
        message: "Escolha o cardio e informe a duração.",
      });
  });
export interface CardioActivity {
  id: string;
  name_pt: string;
  name_en: string;
  is_active: boolean;
}
export interface CardioPlan {
  weekday: number;
  activity_id: string;
  target_minutes: number;
}
export interface CardioLog {
  performed_on: string;
  status: "done" | "skipped";
  activity_id: string | null;
  duration_min: number | null;
  notes: string;
}
export interface CardioData {
  activities: CardioActivity[];
  plans: CardioPlan[];
  logs: CardioLog[];
  today: string;
  weekday: number;
  unavailable?: boolean;
}
