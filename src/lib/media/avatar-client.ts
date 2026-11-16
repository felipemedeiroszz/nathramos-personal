"use client";
/** Keep avatar actions below transport limits and remove original image metadata. */
export async function prepareAvatar(file: File): Promise<File> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size === 0
  )
    throw Error("invalid_file_type");
  if (file.size > 5_000_000) throw Error("file_too_large");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 25_000_000
    )
      throw Error("invalid_file_type");
    const ratio = Math.min(
      1,
      512 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw Error("invalid_file_type");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    let blob = await encode("image/webp");
    if (blob?.type !== "image/webp") blob = await encode("image/jpeg");
    if (!blob || blob.size > 750000) throw Error("file_too_large");
    return new File(
      [blob],
      blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg",
      { type: blob.type },
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
