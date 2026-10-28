"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClientSSR, createServiceClientSSR } from "@/lib/supabase/server";
import { requireAuthenticated } from "@/lib/auth/access";
import { headers } from "next/headers";
import { defaultLocale, locales } from "@/i18n/config";

function detectLocale(): string {
  const h = headers();
  const accept = h.get("accept-language") ?? "";
  if (accept.toLowerCase().startsWith("en")) return "en-US";
  return defaultLocale;
}

export async function logoutAction() {
  const supabase = await createClientSSR();
  try {
    await supabase.auth.signOut().catch(() => {});
  } catch {}
  const locale = detectLocale();
  redirect(`/${locale}/login`);
}

const updateProfileSchema = z
  .object({
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    phone: z.string().max(50).optional().or(z.literal("")),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    gender: z.enum(["male", "female", "other", ""]).optional(),
    height_cm: z.coerce
      .number()
      .int()
      .min(50)
      .max(260)
      .optional()
      .or(z.literal("")),
    weight_kg: z.coerce.number().min(20).max(400).optional().or(z.literal("")),
    country: z.string().max(100).optional().or(z.literal("")),
    language: z.string().optional(),
  })
  .partial();

export async function updateProfileAction(_prev: any, formData: FormData) {
  const userId = await requireAuthenticated();
  const raw = Object.fromEntries(formData.entries());

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors,
      message: "validation",
    };
  }

  const data: Record<string, any> = {};
  if (parsed.data.first_name) data.first_name = parsed.data.first_name;
  if (parsed.data.last_name) data.last_name = parsed.data.last_name;
  if (parsed.data.first_name || parsed.data.last_name) {
    const fn = data.first_name ?? "";
    const ln = data.last_name ?? "";
    data.full_name = `${fn} ${ln}`.trim();
  }
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone || null;
  if (parsed.data.birth_date !== undefined)
    data.birth_date = parsed.data.birth_date || null;
  if (parsed.data.gender !== undefined)
    data.gender = parsed.data.gender || null;
  if (parsed.data.height_cm !== undefined)
    data.height_cm = (parsed.data.height_cm || null) as any;
  if (parsed.data.weight_kg !== undefined)
    data.weight_kg = (parsed.data.weight_kg || null) as any;
  if (parsed.data.country !== undefined)
    data.country = parsed.data.country || null;
  if (parsed.data.language) {
    data.language = parsed.data.language;
    const locale = parsed.data.language;
    const origin = headers().get("origin") ?? "";
    if (origin) revalidatePath(`${origin}/${locale}/account`);
  }

  const supabase = await createClientSSR();
  const previous = await supabase
    .from("profiles")
    .select("weight_kg, first_name, last_name, timezone")
    .eq("id", userId)
    .single();
  if (previous.error)
    return {
      success: false as const,
      errors: {},
      message: "Não foi possível carregar seu perfil.",
    };
  if (data.first_name || data.last_name) {
    data.full_name =
      `${data.first_name ?? (previous.data as any).first_name ?? ""} ${data.last_name ?? (previous.data as any).last_name ?? ""}`.trim();
  }
  const { error } = await (supabase.from("profiles") as any)
    .update(data)
    .eq("id", userId);
  if (error) {
    return {
      success: false as const,
      errors: {},
      message: error.message || "update_failed",
    };
  }

  if (
    typeof data.weight_kg === "number" &&
    Number((previous.data as any)?.weight_kg) !== data.weight_kg
  ) {
    const db = await createServiceClientSSR();
    const { getZonedParts } = await import("@/lib/notifications/time");
    const date = getZonedParts(
      new Date(),
      (previous.data as any)?.timezone || "America/Sao_Paulo",
    ).dateKey;
    const result = await (db.rpc as any)("record_student_health", {
      p_user_id: userId,
      p_date: date,
      p_weight: data.weight_kg,
      p_sleep: null,
    });
    if (result.error)
      return {
        success: false as const,
        errors: {},
        message:
          "Perfil salvo, mas não foi possível atualizar o histórico de peso.",
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
  if (emailErr || !emailData.user?.email) {
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

  const locale = detectLocale();
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

  await (supabase.from("profiles") as any)
    .update({ avatar_url: photoUrl })
    .eq("id", userId);

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
