"use server";

import { z } from "zod";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/access";
import { revalidatePath } from "next/cache";

const DEFAULT_STUDENT_PASSWORD = "Alunonathramos";

const resetPasswordSchema = z.object({
  studentId: z.string().uuid(),
  newPassword: z.string().min(8).max(128).optional().or(z.literal("")),
});

export async function resetStudentPasswordAction(
  _prev: any,
  formData: FormData
) {
  await requireRole(["admin", "coach"], "/dashboard");

  const raw = Object.fromEntries(formData.entries());
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors,
      message: "validation",
    };
  }

  const password = parsed.data.newPassword || DEFAULT_STUDENT_PASSWORD;

  const supabase = await createServiceClientSSR();
  const { error } = await supabase.auth.admin.updateUserById(
    parsed.data.studentId,
    { password }
  );

  if (error) {
    return {
      success: false as const,
      errors: {},
      message: error.message || "password_reset_failed",
    };
  }

  revalidatePath(`/admin/alunos/${parsed.data.studentId}`, "page");

  return {
    success: true as const,
    defaultUsed: !parsed.data.newPassword,
  };
}
