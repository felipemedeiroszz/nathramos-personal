import { z } from "zod";
export const progressAngles = ["front", "back", "left", "right"] as const;
export type ProgressAngle = (typeof progressAngles)[number];
export const progressMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/);
export const progressPath = z
  .string()
  .regex(
    /^[0-9a-f-]{36}\/\d{4}-(0[1-9]|1[0-2])-01\/(front|back|left|right)\/[0-9a-f-]{36}\.webp$/,
  );
export const monthlyProgressSchema = z.object({
  month: progressMonth,
  weight_kg: z
    .number()
    .min(20)
    .max(500)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-8),
  photos: z
    .object({
      front: progressPath,
      back: progressPath,
      left: progressPath,
      right: progressPath,
    })
    .strict(),
  version: z.number().int().min(0),
});
export type MonthlyRecord = {
  month: string;
  weight_kg: number;
  photos: Record<ProgressAngle, string>;
  version: number;
  created_at: string;
  updated_at: string;
};
export type MonthlySnapshot = {
  month: string;
  today: string;
  next_due: string;
  records: MonthlyRecord[];
};
export const progressPhotoUrl = (path: string) =>
  "/api/student/monthly-progress/image?path=" + encodeURIComponent(path);
