import "server-only";
import { randomUUID } from "crypto";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { checked } from "./StudentRoutineService";
import { examFileSchema, hasExamSignature } from "@/lib/exams/upload";
import { studentExamUploadSchema } from "@/schemas/exams";
const bucket = "exam-files";
export class ExamUploadService {
  static async prepare(userId: string, input: unknown) {
    const file = examFileSchema.parse(input),
      db: any = await createServiceClientSSR();
    const ext =
      file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    const id = randomUUID(),
      path = `${userId}/${id}.${ext}`;
    const intent = checked<any>(
      await db
        .from("exam_upload_intents")
        .insert({
          id,
          user_id: userId,
          object_path: path,
          file_name: file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120),
          file_size: file.size,
          mime_type: file.type,
        })
        .select("id")
        .single(),
      "prepare exam intent",
    );
    const signed = checked<any>(
      await db.storage
        .from(bucket)
        .createSignedUploadUrl(path, { upsert: false }),
      "sign exam upload",
    );
    return { uploadId: intent.id, path, token: signed.token, bucket };
  }
  static async complete(userId: string, uploadId: string, metadata: unknown) {
    const parsed = studentExamUploadSchema.parse(metadata),
      db: any = await createServiceClientSSR();
    const intent = checked<any>(
      await db
        .from("exam_upload_intents")
        .select("*")
        .eq("id", uploadId)
        .eq("user_id", userId)
        .maybeSingle(),
      "read exam intent",
    );
    if (!intent) throw new Error("Upload indisponível para esta conta.");
    if (intent.exam_id) return intent.exam_id;
    if (Date.parse(intent.expires_at) < Date.now())
      throw new Error("Upload expirado. Envie o arquivo novamente.");
    const storage = db.storage.from(bucket);
    const info = checked<any>(
      await storage.info(intent.object_path),
      "verify exam upload",
    );
    if (
      Number(info.size ?? info.metadata?.size) !== intent.file_size ||
      (info.contentType ?? info.metadata?.mimetype) !== intent.mime_type
    )
      throw new Error(
        "O arquivo enviado não corresponde ao arquivo autorizado.",
      );
    const signed = checked<any>(
      await storage.createSignedUrl(intent.object_path, 30),
      "verify exam content",
    );
    const response = await fetch(signed.signedUrl, {
      cache: "no-store",
      headers: { Range: "bytes=0-15" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok || !response.body)
      throw new Error("Não foi possível conferir o arquivo enviado.");
    const reader = response.body.getReader();
    const bytes = new Uint8Array(16);
    let count = 0;
    try {
      while (count < 16) {
        const part = await reader.read();
        if (part.done) break;
        const take = part.value.subarray(0, 16 - count);
        bytes.set(take, count);
        count += take.length;
      }
    } finally {
      await reader.cancel();
    }
    if (!hasExamSignature(bytes.subarray(0, count), intent.mime_type))
      throw new Error(
        "O conteúdo do arquivo não corresponde ao formato informado.",
      );
    return checked<string>(
      await db.rpc("finalize_exam_upload", {
        p_user: userId,
        p_intent: uploadId,
        p_metadata: parsed,
      }),
      "finalize exam upload",
    );
  }
  static async cleanExpired() {
    const db: any = await createServiceClientSSR();
    // A signed upload token can live for two hours; wait beyond its lifetime.
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const rows = checked<any[]>(
      await db
        .from("exam_upload_intents")
        .select("id,object_path")
        .is("exam_id", null)
        .lt("expires_at", cutoff)
        .order("id")
        .limit(100),
      "expired exam uploads",
    );
    if (!rows.length) return { removed: 0 };
    checked(
      await db.storage.from(bucket).remove(rows.map((r) => r.object_path)),
      "remove expired uploads",
    );
    checked(
      await db
        .from("exam_upload_intents")
        .delete()
        .in(
          "id",
          rows.map((r) => r.id),
        )
        .is("exam_id", null),
      "remove expired intents",
    );
    return { removed: rows.length };
  }
}
