import "server-only";
import { randomUUID } from "node:crypto";
import { requirePlatformUser, AccessError } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { DatabaseOperationError } from "@/lib/supabase/errors";
import { optimizeFitnessImage } from "@/lib/media/fitness-image";
import {
  monthlyProgressSchema,
  progressMonth,
  progressAngles,
  type ProgressAngle,
} from "@/lib/monthly-progress";
export async function monthlyProgressActor() {
  const actor = await requirePlatformUser();
  if (actor.role !== "student")
    throw new AccessError("Acesso exclusivo do aluno.", 403);
  return actor;
}
function check(result: any, operation: string) {
  if (result.error) {
    const messages: Record<string, string> = {
      VERSION_CONFLICT:
        "O registro foi atualizado em outra aba. Recarregue antes de salvar.",
      FOUR_PHOTOS_REQUIRED: "Envie as quatro fotos para concluir.",
      DISTINCT_PHOTOS_REQUIRED: "Envie uma foto para cada ângulo.",
      INVALID_PHOTO: "Confira as quatro fotos e tente novamente.",
      INVALID_MONTH_OR_WEIGHT:
        "Somente o mês atual pode ser registrado. Confira o peso.",
      INVALID_MONTH_OR_ANGLE: "Mês ou ângulo inválido.",
      UPLOAD_LIMIT: "Limite de 20 envios por hora atingido.",
    };
    if (result.error.code === "P0001")
      throw new AccessError(
        messages[result.error.message] ||
          "Registro indisponível para esta conta.",
        409,
      );
    throw new DatabaseOperationError(operation, {
      ...result.error,
      status: result.status,
    });
  }
  return result.data;
}
export async function readMonthlyProgress(userId: string) {
  const db: any = await createServiceClientSSR();
  return check(
    await db.rpc("monthly_progress_read", { p_actor: userId }),
    "monthly_progress_read",
  );
}
export async function saveMonthlyProgress(userId: string, input: unknown) {
  const value = monthlyProgressSchema.parse(input);
  const db: any = await createServiceClientSSR();
  return check(
    await db.rpc("monthly_progress_save", {
      p_actor: userId,
      p_month: value.month,
      p_weight: value.weight_kg,
      p_photos: value.photos,
      p_version: value.version,
    }),
    "monthly_progress_save",
  );
}
export async function uploadMonthlyPhoto(
  userId: string,
  month: unknown,
  angle: unknown,
  file: File,
) {
  const period = progressMonth.parse(month);
  if (!progressAngles.includes(angle as ProgressAngle))
    throw new AccessError("Ângulo inválido.", 400);
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size < 1 ||
    file.size > 4 * 1024 * 1024
  )
    throw new AccessError("Use JPG, PNG ou WebP de até 4 MB.", 400);
  const path = `${userId}/${period}/${angle}/${randomUUID()}.webp`;
  const db: any = await createServiceClientSSR();
  check(
    await db.rpc("monthly_progress_reserve", {
      p_actor: userId,
      p_month: period,
      p_angle: angle,
      p_path: path,
    }),
    "monthly_progress_reserve",
  );
  let bytes: Buffer;
  try {
    bytes = await optimizeFitnessImage(file);
  } catch {
    throw new AccessError("Imagem inválida. Escolha outra foto.", 400);
  }
  check(
    await db.storage
      .from("monthly-progress")
      .upload(path, bytes, { contentType: "image/webp", upsert: false }),
    "upload monthly photo",
  );
  check(
    await db
      .from("monthly_progress_uploads")
      .update({ ready: true })
      .eq("path", path)
      .eq("user_id", userId)
      .select("path")
      .single(),
    "complete monthly photo",
  );
  return path;
}
export async function processMonthlyProgress() {
  const db: any = await createServiceClientSSR();
  return check(
    await db.rpc("monthly_progress_remind"),
    "monthly_progress_remind",
  );
}
export async function cleanMonthlyProgressUploads() {
  const db: any = await createServiceClientSSR();
  const rows = check(
    await db.rpc("monthly_progress_unused_uploads"),
    "monthly_progress_unused_uploads",
  );
  let failed = 0,
    removed = 0;
  for (const row of rows || []) {
    const result = await db.storage.from("monthly-progress").remove([row.path]);
    if (result.error) {
      failed++;
      continue;
    }
    const resultRow = await db
      .from("monthly_progress_uploads")
      .delete()
      .eq("path", row.path)
      .eq("deleting", true);
    if (resultRow.error) failed++;
    else removed++;
  }
  return { removed, failed };
}
