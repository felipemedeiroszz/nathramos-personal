"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { AuditLogService } from "@/services/AuditLogService";

const schema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(12).max(128),
  confirmPassword: z.string(),
  locale: z.enum(["pt-BR", "en-US"]),
}).refine(value => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Confirme a senha." });

export async function createStudentAction(_previous: unknown, formData: FormData) {
  const actor = await requireRole(["admin"], "/dashboard");
  const en = formData.get("locale") === "en-US";
  const message = (pt: string, english: string) => en ? english : pt;
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { success: false, message: message(
    "Confira nome, e-mail e confirmação da senha. Use uma senha de 12 a 128 caracteres.",
    "Check the name, email and password confirmation. Use a password with 12–128 characters.",
  ) };

  let createdId: string | undefined;
  const db = await createServiceClientSSR();
  try {
    const { name, email, password, locale, phone } = parsed.data;
    const [firstName, ...lastNames] = name.split(/\s+/);
    const result = await db.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: name, first_name: firstName, last_name: lastNames.join(" ") },
    });
    if (result.error || !result.data.user) return { success: false, message: message(
      "Não foi possível criar a conta. Verifique se o e-mail já está cadastrado ou se a senha atende às regras de acesso.",
      "Could not create the account. Check whether the email is already registered or the password meets the access requirements.",
    ) };
    createdId = result.data.user.id;
    // Keep the account a student regardless of any submitted role.
    const profile = await (db.from("profiles") as any).update({
      role: "student", phone: phone || null, full_name: name, first_name: firstName, last_name: lastNames.join(" "), language: locale,
    }).eq("id", createdId).eq("role", "student").eq("is_deleted", false).select("id").single();
    if (profile.error || !profile.data) throw new Error("student_profile_failed");
  } catch {
    if (createdId) {
      // Compensate only the Auth account created by this request, never an existing account.
      try {
        const rollback = await db.auth.admin.deleteUser(createdId);
        if (rollback.error) throw rollback.error;
      } catch {
        console.error("[students] account_cleanup_failed", { id: createdId });
        return { success: false, message: message(
          "O cadastro ficou incompleto. A conta precisa ser revisada pelo administrador antes de tentar novamente.",
          "Registration is incomplete. An administrator must review the account before trying again.",
        ) };
      }
    }
    return { success: false, message: message("Não foi possível concluir o cadastro. Tente novamente.", "Could not complete registration. Please try again.") };
  }
  const logged = await AuditLogService.log({
    adminId: actor.userId, userId: createdId, action: "student.create", entity_type: "profiles", entity_id: createdId,
    details: { role: "student" },
  });
  if (!logged) console.error("[students] creation_audit_failed", { id: createdId });
  revalidatePath("/[locale]/admin/alunos", "page");
  revalidatePath("/[locale]/admin/alunos/[id]", "page");
  return { success: true, studentId: createdId, message: message("Aluno cadastrado. A conta já pode acessar com o e-mail e a senha definidos.", "Student created. The account can sign in with the email and password you set.") };
}
