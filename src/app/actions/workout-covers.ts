"use server";
import { requireRole } from "@/lib/auth/access";
import { uploadWorkoutKitCover } from "@/services/WorkoutKitCoverUploadService";
import { productImageSchema } from "@/lib/uploads/product-image";
export async function uploadWorkoutKitCoverAction(form: FormData) {
  try {
    const { userId } = await requireRole(["admin", "coach"], "/dashboard");
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      !productImageSchema.safeParse({ size: file.size, type: file.type })
        .success
    )
      return {
        success: false as const,
        message: "Use PNG, JPG ou WEBP de até 5 MiB.",
      };
    const url = await uploadWorkoutKitCover(userId, file);
    return { success: true as const, url };
  } catch {
    return {
      success: false as const,
      message:
        "Não foi possível enviar a capa. Confira se o arquivo é uma foto PNG, JPG ou WEBP válida e tente novamente.",
    };
  }
}
