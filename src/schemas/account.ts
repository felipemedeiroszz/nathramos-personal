import { z } from "zod";
import { locales } from "@/i18n/config";

export const accountProfileSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(50),
  birth_date: z.union([z.iso.date(), z.literal("")]),
  gender: z.enum(["male", "female", "other", ""]),
  height_cm: z.union([z.literal(""), z.coerce.number().int().min(50).max(260)]),
  weight_kg: z.union([z.literal(""), z.coerce.number().min(20).max(400)]),
  country: z.string().trim().max(100),
  language: z.enum(locales),
}).partial();

export function normalizeAccountProfile(profile: z.infer<typeof accountProfileSchema>) {
  return Object.fromEntries(
    Object.entries(profile).map(([key, value]) => [key, value === "" ? null : value]),
  );
}
