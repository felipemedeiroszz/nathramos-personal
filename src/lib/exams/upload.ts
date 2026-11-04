import { z } from "zod";
export const MAX_EXAM_BYTES = 20 * 1024 * 1024;
export const examFileSchema = z.object({
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(MAX_EXAM_BYTES),
  type: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
});
export function hasExamSignature(bytes: Uint8Array, mime: string) {
  const text = new TextDecoder().decode(bytes);
  return mime === "application/pdf"
    ? text.startsWith("%PDF-")
    : mime === "image/png"
      ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
      : mime === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === "image/webp"
          ? text.startsWith("RIFF") && text.slice(8, 12) === "WEBP"
          : false;
}
