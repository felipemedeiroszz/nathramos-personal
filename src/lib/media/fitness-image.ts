import sharp from "sharp";

export async function optimizeFitnessImage(file: File): Promise<Buffer> {
  const input = sharp(Buffer.from(await file.arrayBuffer()), {
    limitInputPixels: 25000000,
    animated: false,
  });
  const metadata = await input.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format || "") ||
    (metadata.pages ?? 1) > 1
  )
    throw new Error("Invalid image format");
  return input
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
