import "server-only";
import { optimizeFitnessImage } from "@/lib/media/fitness-image";
import { randomUUID } from "node:crypto";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { AccessError, requirePlatformUser } from "@/lib/auth/platform";
import { communityFilterSchema } from "@/lib/community";
import { DatabaseOperationError } from "@/lib/supabase/errors";

export async function communityActor() {
  const actor = await requirePlatformUser();
  if (actor.role !== "student" && actor.role !== "admin")
    throw new AccessError("Acesso exclusivo da comunidade.", 403);
  return actor;
}

export async function readCommunity(userId: string, filter: unknown) {
  const parsed = communityFilterSchema.parse(filter);
  const db = await createServiceClientSSR();
  const { data, error, status } = await (db.rpc as any)("community_read", {
    p_actor: userId,
    p_filter: parsed,
  });
  if (error) {
    if (error.code === "P0001")
      throw new AccessError("Consulta indisponível para esta conta.", 403);
    throw new DatabaseOperationError("community_read", { ...error, status });
  }
  return data;
}

export async function uploadCommunityImage(userId: string, file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size < 1 ||
    file.size > 4 * 1024 * 1024
  )
    throw new AccessError(
      "Envie uma imagem JPG, PNG ou WebP com até 4 MB.",
      400,
    );
  const db: any = await createServiceClientSSR();
  const permission = await db.rpc("community_actor", {
    p_actor: userId,
    p_writing: true,
  });
  if (permission.error)
    throw new AccessError("Publicações temporariamente indisponíveis.", 403);
  const path = `${userId}/${randomUUID()}.webp`;
  const reserved = await db.rpc("community_reserve_upload", {
    p_actor: userId,
    p_path: path,
  });
  if (reserved.error)
    throw new AccessError(
      "Não foi possível enviar a imagem. Confira o limite de 30 imagens por hora.",
      429,
    );
  // Decoding validates file contents. Re-encoding removes EXIF and active metadata.
  let bytes: Buffer;
  try {
    bytes = await optimizeFitnessImage(file);
  } catch {
    throw new AccessError(
      "A imagem está inválida ou excede o tamanho permitido.",
      400,
    );
  }
  const uploaded = await db.storage
    .from("community-images")
    .upload(path, bytes, { contentType: "image/webp", upsert: false });
  if (uploaded.error) {
    // Keep the reservation so cleanup also recovers provider timeouts.
    throw new Error("Não foi possível enviar a imagem.");
  }
  return path;
}

export async function cleanCommunityUploads() {
  const db: any = await createServiceClientSSR();
  const { data, error } = await db.rpc("community_unused_uploads");
  if (error) throw error;
  let failed = 0;
  for (const row of data || []) {
    const removed = await db.storage
      .from("community-images")
      .remove([row.path]);
    if (removed.error) {
      failed++;
      continue;
    }
    const deleted = await db
      .from("community_uploads")
      .delete()
      .eq("path", row.path);
    if (deleted.error) failed++;
  }
  return { failed, processed: data?.length || 0 };
}
