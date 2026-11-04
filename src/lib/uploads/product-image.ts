import { z } from "zod";
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const productImageSchema = z.object({
  size: z.number().int().positive().max(PRODUCT_IMAGE_MAX_BYTES),
  type: z.enum(["image/png", "image/jpeg", "image/webp"]),
});
