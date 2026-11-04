import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { productImageSchema, PRODUCT_IMAGE_MAX_BYTES } from "@/lib/uploads/product-image";

const bucket = "product-images";
export class ProductImageUploadService {
  static async prepare(userId: string, input: unknown) {
    const file = productImageSchema.parse(input);
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${userId}/${randomUUID()}.${extension}`;
    const db = await createServiceClientSSR();
    const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
    if (error || !data) throw new Error("Não foi possível autorizar o envio.");
    return { bucket, path, token: data.token };
  }

  static async complete(userId: string, path: string) {
    // Never accept another account's object or a client-provided bucket/URL.
    const suffix = path.startsWith(`${userId}/`) ? path.slice(userId.length + 1) : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/.test(suffix))
      throw new Error("Imagem indisponível para esta conta.");
    const db = await createServiceClientSSR();
    const storage = db.storage.from(bucket);
    const { data: info, error: infoError } = await storage.info(path);
    if (infoError || !info) throw new Error("Não foi possível conferir a imagem.");
    const size = Number(info.size ?? info.metadata?.size);
    const type = info.contentType ?? info.metadata?.mimetype;
    productImageSchema.parse({ size, type });
    const { data: blob, error } = await storage.download(path);
    if (error || !blob || blob.size !== size || blob.size > PRODUCT_IMAGE_MAX_BYTES)
      throw new Error("A imagem enviada é inválida.");
    try {
      const image = sharp(Buffer.from(await blob.arrayBuffer()), { limitInputPixels: 40000000 });
      const metadata = await image.metadata();
      const expected = path.endsWith(".jpg") ? "jpeg" : path.split(".").pop();
      if (metadata.format !== expected || type !== `image/${expected}`) throw new Error("format");
      // Decode to reject truncated or otherwise corrupt image content.
      await image.resize(1, 1).raw().toBuffer();
    } catch {
      await storage.remove([path]);
      throw new Error("Arquivo inválido. Use uma imagem PNG, JPG ou WEBP.");
    }
    const { data } = storage.getPublicUrl(path);
    return data.publicUrl;
  }
}
