"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClientSSR, createServiceClientSSR } from "@/lib/supabase/server";
import { requireAuthenticated } from "@/lib/auth/access";
import { headers } from "next/headers";
import { defaultLocale } from "@/i18n/config";
import { accountProfileSchema, normalizeAccountProfile } from "@/schemas/account";

async function detectLocale(): Promise<string> {
  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  if (accept.toLowerCase().startsWith("en")) return "en-US";
  return defaultLocale;
}

export async function logoutAction() {
  const supabase = await createClientSSR();
  try {
    await supabase.auth.signOut().catch(() => {});
  } catch {}
  const locale = await detectLocale();
  redirect(`/${locale}/login`);
}

export async function updateProfileAction(_prev: any, formData: FormData) {
  const userId = await requireAuthenticated();
  const parsed = accountProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors,
      message: "validation",
    };
  }

  const db = await createServiceClientSSR();
  const { error } = await (db.rpc as any)("update_account_profile", {
    p_actor: userId,
    p_target: userId,
    p_changes: normalizeAccountProfile(parsed.data),
  });
  if (error) {
    return {
      success: false as const,
      errors: {},
      message: "Não foi possível salvar seu perfil.",
    };
  }
  revalidatePath("/[locale]/admin/alunos/[id]", "page");
  revalidatePath("/[locale]/(student)/progresso", "page");
  revalidatePath("/[locale]/(student)/account", "layout");
  revalidatePath("/[locale]/(student)/dashboard", "layout");
  return { success: true as const };
}

const changePasswordSchema = z
  .object({
    current_password: z.string().min(6),
    new_password: z.string().min(8).max(128),
    confirm_password: z.string().min(8).max(128),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ["confirm_password"],
    message: "passwords_must_match",
  });

export async function changePasswordAction(_prev: any, formData: FormData) {
  const userId = await requireAuthenticated();
  const raw = Object.fromEntries(formData.entries());

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors,
      message: "validation",
    };
  }

  const supabase = await createClientSSR();

  const { data: emailData, error: emailErr } = await supabase.auth.getUser();
  if (emailErr || emailData.user?.id !== userId || !emailData.user.email) {
    return { success: false as const, errors: {}, message: "unexpected" };
  }

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: emailData.user.email,
    password: parsed.data.current_password,
  });
  if (signInErr) {
    return {
      success: false as const,
      errors: { current_password: ["wrong_password"] } as any,
      message: "wrong_password",
    };
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
    current_password: parsed.data.current_password,
  });
  if (updateErr) {
    return {
      success: false as const,
      errors: {},
      message: updateErr.message || "password_update_failed",
    };
  }

  return { success: true as const };
}

export async function changeEmailAction(_prev: unknown, formData: FormData) {
  const userId = await requireAuthenticated();
  const en = formData.get("locale") === "en-US";
  const locale = en ? "en-US" : "pt-BR";
  const label = (pt: string, english: string) => en ? english : pt;
  const fail = (message: string) => ({ success: false, message });
  const email = z.email().max(254).safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  const password = formData.get("current_password");
  if (!email.success || typeof password !== "string" || password.length < 6)
    return fail(label("Informe o novo e-mail e a senha atual.", "Enter your new email and current password."));

  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  const appUrl = URL.canParse(configuredUrl) ? new URL(configuredUrl) : null;
  if (!appUrl || (appUrl.protocol !== "https:" &&
      !(process.env.NODE_ENV === "development" && appUrl.origin === "http://localhost:3000"))) {
    return fail(label("A troca de e-mail está indisponível.", "Email changes are unavailable."));
  }

  const supabase = await createClientSSR();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || user?.id !== userId || !user.email)
    return fail(label("Entre novamente na sua conta.", "Sign in to your account again."));
  if (user.email.toLowerCase() === email.data)
    return fail(label("Informe um e-mail diferente do atual.", "Enter a different email address."));

  const verified = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (verified.error || verified.data.user?.id !== userId)
    return fail(label("Não foi possível verificar a senha atual.", "Could not verify your current password."));

  const callback = new URL(`/${locale}/auth/callback`, appUrl);
  callback.searchParams.set("next", `/${locale}/account`);
  const { error } = await supabase.auth.updateUser({ email: email.data }, {
    emailRedirectTo: callback.toString(),
  });
  if (error)
    return fail(label("Não foi possível solicitar a alteração de e-mail.", "Could not request the email change."));

  return {
    success: true,
    message: label("Confira as caixas de entrada e siga as instruções de confirmação.", "Check your inboxes and follow the confirmation instructions."),
  };
}

const deleteAccountSchema = z.object({
  password: z.string().min(6),
});

export async function deleteAccountAction(_prev: any, formData: FormData) {
  const userId = await requireAuthenticated();
  const parsed = deleteAccountSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors,
      message: "validation",
    };
  }

  const supabase = await createClientSSR();
  const serviceSupabase = await createServiceClientSSR();

  const { data: userData, error: ue } = await supabase.auth.getUser();
  if (ue || !userData.user?.email) {
    return { success: false as const, errors: {}, message: "unexpected" };
  }

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: parsed.data.password,
  });
  if (signInErr) {
    return {
      success: false as const,
      errors: { password: ["wrong_password"] } as any,
      message: "wrong_password",
    };
  }

  const { error: authDeleteErr } =
    await serviceSupabase.auth.admin.deleteUser(userId);
  if (authDeleteErr) {
    return {
      success: false as const,
      errors: {},
      message: authDeleteErr.message || "delete_failed",
    };
  }

  try {
    await supabase.auth.signOut().catch(() => {});
  } catch {}

  const locale = await detectLocale();
  redirect(`/${locale}?deleted=1`);
}

export async function uploadPhotoAction(_prev: any, formData: FormData) {
  const userId = await requireAuthenticated();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return {
      success: false as const,
      errors: { file: ["required"] } as any,
      message: "file_required",
    };
  }
  if (file.size > 5_000_000) {
    return {
      success: false as const,
      errors: { file: ["too_large"] } as any,
      message: "file_too_large",
    };
  }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return {
      success: false as const,
      errors: { file: ["invalid_type"] } as any,
      message: "invalid_file_type",
    };
  }

  const supabase = await createClientSSR();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_AVATARS_BUCKET || "avatars";
  const key = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(key, file, {
      cacheControl: "3600",
      upsert: true,
    });
  if (uploadErr) {
    return {
      success: false as const,
      errors: {},
      message: uploadErr.message || "upload_failed",
    };
  }

  const { data: urlData } = await supabase.storage
    .from(bucket)
    .getPublicUrl(key);
  const photoUrl = urlData?.publicUrl ?? null;

  const { data: updated, error: profileError } = await (supabase.from("profiles") as any)
    .update({ avatar_url: photoUrl })
    .eq("id", userId)
    .select("id")
    .single();
  if (profileError || !updated) {
    await supabase.storage.from(bucket).remove([key]);
    return { success: false as const, errors: {}, message: "upload_failed" };
  }

  revalidatePath("/[locale]/(student)/account", "layout");
  return { success: true as const, photoUrl };
}

export async function removePhotoAction() {
  const userId = await requireAuthenticated();
  const supabase = await createClientSSR();
  const { error } = await (supabase.from("profiles") as any)
    .update({ avatar_url: null })
    .eq("id", userId);
  if (error) {
    return {
      success: false as const,
      errors: {},
      message: error.message || "remove_failed",
    };
  }
  revalidatePath("/[locale]/(student)/account", "layout");
  return { success: true as const };
}
