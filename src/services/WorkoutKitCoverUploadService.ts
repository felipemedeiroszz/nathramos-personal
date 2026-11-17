import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { productImageSchema } from "@/lib/uploads/product-image";
export async function uploadWorkoutKitCover(userId: string, file: File) {
  productImageSchema.parse({ size: file.size, type: file.type });
  let bytes: Buffer;
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40_000_000,
    });
    const metadata = await source.metadata();
    if (
      !metadata.format ||
      !["jpeg", "png", "webp"].includes(metadata.format) ||
      file.type !== `image/${metadata.format}` ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("Invalid image");
    bytes = await source
      .rotate()
      .resize({
        width: 1600,
        height: 1000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new Error("Arquivo inválido. Use uma foto PNG, JPG ou WEBP.");
  }
  const db = await createServiceClientSSR();
  const bucket = db.storage.from("product-images");
  const path = `${userId}/${randomUUID()}.webp`;
  const { error } = await bucket.upload(path, bytes, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error)
    throw new Error("Não foi possível enviar a capa. Tente novamente.");
  return bucket.getPublicUrl(path).data.publicUrl;
}
