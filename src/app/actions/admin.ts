"use server";
import { z } from "zod";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/access";
import { AuditLogService } from "@/services/AuditLogService";
import { revalidatePath } from "next/cache";
const schema = z
  .object({
    studentId: z.string().uuid(),
    newPassword: z.string().min(12).max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas devem ser iguais.",
  });
export async function resetStudentPasswordAction(
  _prev: unknown,
  formData: FormData,
) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success)
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors,
      message:
        "Informe uma senha de 12 a 128 caracteres e confirme corretamente.",
    };
  const db = await createServiceClientSSR();
  const target = await db
    .from("profiles")
    .select("id, role, is_deleted")
    .eq("id", parsed.data.studentId)
    .maybeSingle();
  const profile = target.data as { role: string; is_deleted: boolean } | null;
  if (
    target.error ||
    !profile ||
    profile.role !== "student" ||
    profile.is_deleted
  )
    return {
      success: false as const,
      errors: {},
      message:
        "Somente contas de alunos ativos podem ter a senha redefinida aqui.",
    };
  const { error } = await db.auth.admin.updateUserById(parsed.data.studentId, {
    password: parsed.data.newPassword,
  });
  if (error)
    return {
      success: false as const,
      errors: {},
      message: "Não foi possível alterar a senha. Tente novamente.",
    };
  const logged = await AuditLogService.log({
    adminId: userId,
    userId: parsed.data.studentId,
    action: "student.password_reset",
    entity_type: "profiles",
    entity_id: parsed.data.studentId,
  });
  if (!logged)
    console.error("[admin] Password reset audit failed", {
      actor: userId,
      target: parsed.data.studentId,
    });
  revalidatePath("/[locale]/admin/alunos/[id]", "page");
  return { success: true as const, message: "Senha alterada com sucesso." };
}

export async function assignStudentCoachAction(
  _previous: unknown,
  formData: FormData,
) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  const parsed = z
    .object({ studentId: z.string().uuid(), coachId: z.string().uuid() })
    .safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success)
    return { success: false, message: "Selecione um responsável válido." };
  const db = await createServiceClientSSR();
  const { error } = await (db.rpc as any)("admin_assign_coach", {
    p_actor: userId,
    p_student: parsed.data.studentId,
    p_coach: parsed.data.coachId,
  });
  if (error)
    return {
      success: false,
      message: "Não foi possível alterar o responsável.",
    };
  revalidatePath("/[locale]/admin", "layout");
  return { success: true, message: "Responsável atualizado." };
}
