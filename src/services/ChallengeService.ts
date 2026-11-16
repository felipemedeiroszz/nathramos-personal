import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { communityActor } from "@/services/CommunityService";
import { AccessError } from "@/lib/auth/platform";
import { challengeFilterSchema } from "@/lib/challenges";
import { optimizeFitnessImage } from "@/lib/media/fitness-image";

export const challengeActor = communityActor;
export async function readChallenges(userId: string, filter: unknown) {
  const db = await createServiceClientSSR();
  const result = await (db.rpc as any)("challenge_read", {
    p_actor: userId,
    p_filter: challengeFilterSchema.parse(filter),
  });
  if (result.error)
    throw new AccessError(
      "Não foi possível consultar os desafios desta conta.",
      403,
    );
  return result.data;
}
export async function uploadChallengeAsset(
  userId: string,
  challengeId: string,
  kind: string,
  file: File,
) {
  if (!file.size || file.size > 4 * 1024 * 1024)
    throw new AccessError("Envie um arquivo de até 4 MB.", 400);
  const pdf = kind === "proof" && file.type === "application/pdf";
  if (!pdf && !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new AccessError("Envie JPG, PNG, WebP ou um comprovante PDF.", 400);
  const path = `${challengeId}/${randomUUID()}.${pdf ? "pdf" : "webp"}`;
  const contentType = pdf ? "application/pdf" : "image/webp";
  const db: any = await createServiceClientSSR();
  const reserved = await db.rpc("challenge_reserve_upload", {
    p_actor: userId,
    p_challenge: challengeId,
    p_path: path,
    p_kind: kind,
    p_type: contentType,
  });
  if (reserved.error)
    throw new AccessError(
      "Envio indisponível. Confira a participação e os limites de envio.",
      403,
    );
  let bytes: Buffer;
  try {
    if (pdf) {
      bytes = Buffer.from(await file.arrayBuffer());
      if (
        bytes.subarray(0, 5).toString() !== "%PDF-" ||
        !bytes.subarray(-2048).toString().includes("%%EOF")
      )
        throw new Error("Invalid PDF");
    } else bytes = await optimizeFitnessImage(file);
  } catch {
    throw new AccessError(
      "O arquivo está inválido ou excede as dimensões permitidas.",
      400,
    );
  }
  const uploaded = await db.storage
    .from("challenge-assets")
    .upload(path, bytes, { contentType, upsert: false });
  if (uploaded.error) throw new Error("Não foi possível enviar o arquivo.");
  return path;
}
export async function processChallenges() {
  const db = await createServiceClientSSR();
  const result = await (db.rpc as any)("challenge_process");
  if (result.error) throw result.error;
  return result.data as { processed: number; failed: number };
}
export async function cloneChallengeAssets(
  userId: string,
  sourceId: string,
  targetId: string,
) {
  const source = await readChallenges(userId, { id: sourceId });
  const target = await readChallenges(userId, { id: targetId });
  const db: any = await createServiceClientSSR();
  const assets: { source: string; kind: string; placement: number | null }[] =
    [];
  if (source.challenge.cover_image && !target.challenge.cover_image)
    assets.push({
      source: source.challenge.cover_image,
      kind: "cover",
      placement: null,
    });
  for (const prize of source.prizes) {
    if (
      prize.image &&
      !target.prizes.find(
        (p: { placement: number; image: string | null }) =>
          p.placement === prize.placement,
      )?.image
    )
      assets.push({
        source: prize.image,
        kind: "prize",
        placement: prize.placement,
      });
  }
  for (const asset of assets) {
    const path = `${targetId}/${randomUUID()}.webp`;
    const reserved = await db.rpc("challenge_reserve_upload", {
      p_actor: userId,
      p_challenge: targetId,
      p_path: path,
      p_kind: asset.kind,
      p_type: "image/webp",
    });
    if (reserved.error) throw new Error("Não foi possível copiar as imagens.");
    const copied = await db.storage
      .from("challenge-assets")
      .copy(asset.source, path);
    if (copied.error) throw new Error("Não foi possível copiar as imagens.");
    const attached = await db.rpc("challenge_attach_asset", {
      p_actor: userId,
      p_challenge: targetId,
      p_path: path,
      p_placement: asset.placement,
    });
    if (attached.error)
      throw new Error("Não foi possível vincular a imagem copiada.");
  }
}
export async function cleanChallengeUploads() {
  const db: any = await createServiceClientSSR();
  const result = await db.rpc("challenge_unused_uploads");
  if (result.error) throw result.error;
  let failed = 0;
  for (const row of result.data || []) {
    const removed = await db.storage
      .from("challenge-assets")
      .remove([row.path]);
    if (removed.error) {
      failed++;
      continue;
    }
    const deleted = await db
      .from("challenge_uploads")
      .delete()
      .eq("path", row.path);
    if (deleted.error) failed++;
  }
  return { processed: result.data?.length || 0, failed };
}
