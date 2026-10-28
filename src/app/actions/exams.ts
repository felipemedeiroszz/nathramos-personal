"use server";

import {
  requireManagedStudent,
  requirePlatformUser,
} from "@/lib/auth/platform";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getCurrentRole, requireAuthenticated } from "@/lib/auth/access";
import { ExamService } from "@/services/ExamService";
import { studentExamUploadSchema } from "@/schemas/exams";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

export async function uploadExamAction(formData: FormData) {
  const { userId } = await requirePlatformUser();

  const parsed = studentExamUploadSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    exam_date: String(formData.get("exam_date") ?? "").trim(),
    category_id: (formData.get("category_id") as string) || null,
    lab_name: (formData.get("lab_name") as string) || null,
    description: (formData.get("description") as string) || null,
  });

  if (!parsed.success) {
    return { success: false as const, message: "validation" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      success: false as const,
      message: "Selecione um arquivo para envio.",
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { success: false as const, message: "Arquivo maior que 20MB." };
  }
  const mime = file.type || "application/pdf";
  if (!ALLOWED_MIME.includes(mime)) {
    return {
      success: false as const,
      message: "Formato de arquivo não suportado.",
    };
  }

  const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1];
  const path = `${userId}/${randomUUID()}.${ext}`;

  const uploaded = await ExamService.uploadFile(path, file);
  if (!uploaded) {
    return { success: false as const, message: "Falha ao enviar o arquivo." };
  }

  const saved = await ExamService.upsertExam(
    {
      user_id: userId,
      category_id: parsed.data.category_id ?? null,
      title: parsed.data.title,
      exam_date: parsed.data.exam_date,
      lab_name: parsed.data.lab_name ?? null,
      description: parsed.data.description ?? null,
      file_bucket_path: uploaded.path,
      file_name: safeFileName(file.name),
      file_size_bytes: file.size,
      file_mime_type: mime,
      results_summary: {},
    },
    userId,
  );

  if (!saved) {
    await ExamService.removeFile(uploaded.path);
    return { success: false as const, message: "Falha ao registrar o exame." };
  }

  revalidatePath("/[locale]/exames", "page");
  revalidatePath("/[locale]/admin/exames", "page");
  return { success: true as const, data: saved };
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
