import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export const PREVIEW_COOKIE = "nr-support-preview";
export const PREVIEW_MARKER = "nr-support-mode";
export type PreviewContext = {
  adminId: string;
  studentId: string;
  locale: string;
  expires: number;
  token: string;
};
function key() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Support preview is unavailable");
  return createHash("sha256")
    .update("student-support-preview-v1:" + secret)
    .digest();
}
export function sealPreview(value: PreviewContext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}
export function openPreview(value: string): PreviewContext | null {
  try {
    const data = Buffer.from(value, "base64url");
    const cipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
    cipher.setAuthTag(data.subarray(12, 28));
    const result = JSON.parse(
      Buffer.concat([
        cipher.update(data.subarray(28)),
        cipher.final(),
      ]).toString("utf8"),
    );
    if (
      !result.adminId ||
      !result.studentId ||
      !result.token ||
      !["pt-BR", "en-US"].includes(result.locale) ||
      !Number.isFinite(result.expires)
    )
      return null;
    return result;
  } catch {
    return null;
  }
}
