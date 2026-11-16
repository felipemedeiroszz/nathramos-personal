import "server-only";
import sharp from "sharp";
export async function optimizeAvatar(file: File) {
  const image = sharp(Buffer.from(await file.arrayBuffer()), {
    limitInputPixels: 25_000_000,
    animated: false,
  });
  const metadata = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format || "") ||
    (metadata.pages ?? 1) > 1
  )
    throw Error("Invalid avatar");
  return image
    .rotate()
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
