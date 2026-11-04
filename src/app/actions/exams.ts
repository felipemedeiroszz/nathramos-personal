"use server";

import {
  requireManagedStudent,
  requirePlatformUser,
} from "@/lib/auth/platform";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ExamUploadService } from "@/services/ExamUploadService";
import { getCurrentRole, requireAuthenticated } from "@/lib/auth/access";
import { ExamService } from "@/services/ExamService";

export async function prepareExamUploadAction(input: unknown) {
  try {
    const { userId } = await requirePlatformUser();
    return {
      success: true as const,
      upload: await ExamUploadService.prepare(userId, input),
    };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof z.ZodError
          ? "Envie PDF, PNG, JPEG ou WebP de até 20 MB."
          : "Não foi possível preparar o envio.",
    };
  }
}
export async function completeExamUploadAction(
  uploadId: string,
  metadata: unknown,
) {
  try {
    const { userId } = await requirePlatformUser();
    z.string().uuid().parse(uploadId);
    const id = await ExamUploadService.complete(userId, uploadId, metadata);
    revalidatePath("/[locale]/exames", "page");
    revalidatePath("/[locale]/admin/exames", "page");
    return { success: true as const, id };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof z.ZodError
          ? "Preencha título e data do exame."
          : error instanceof Error
            ? error.message
            : "Não foi possível concluir o envio.",
    };
  }
}

export async function deleteMyExamAction(id: string) {
  const { userId } = await requirePlatformUser();

  const exam = await ExamService.getExam(id);
  if (!exam || exam.user_id !== userId) {
    return { success: false as const, message: "Exame não encontrado." };
  }

  const ok = await ExamService.deleteExam(id, userId);
  if (!ok) {
    return { success: false as const, message: "Falha ao excluir o exame." };
  }
  if (exam.file_bucket_path) {
    await ExamService.removeFile(exam.file_bucket_path);
  }

  revalidatePath("/[locale]/exames", "page");
  revalidatePath("/[locale]/admin/exames", "page");
  return { success: true as const };
}

export async function getExamFileUrlAction(id: string) {
  const { userId } = await requirePlatformUser();

  const exam = await ExamService.getExam(id);
  if (!exam) {
    return { success: false as const, message: "Exame não encontrado." };
  }

  const role = await getCurrentRole();
  const isStaff = role === "admin" || role === "coach";
  if (exam.user_id !== userId && !isStaff) {
    return { success: false as const, message: "Acesso negado." };
  }
  if (role === "coach") await requireManagedStudent(exam.user_id);
  if (!exam.file_bucket_path) {
    return { success: false as const, message: "Exame sem arquivo anexado." };
  }

  const url = await ExamService.getSignedUrl(exam.file_bucket_path);
  if (!url) {
    return {
      success: false as const,
      message: "Não foi possível gerar o link do arquivo.",
    };
  }
  return { success: true as const, url };
}
