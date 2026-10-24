"use server"

import { createClientSSR, createServiceClientSSR } from "@/lib/supabase/server"
import {
  loginSchema,
  signUpSchema,
  forgotPasswordSchema,
} from "@/schemas/auth"
import { headers } from "next/headers"
import { defaultLocale } from "@/i18n/config"
import { isSignupOpen } from "@/services/PlatformSettingsService"
import type { UserRole } from "@/types"

function detectLocale(): string {
  const headersList = headers()
  const acceptLanguage = headersList.get("accept-language") ?? ""
  if (acceptLanguage.toLowerCase().startsWith("en")) return "en-US"
  return defaultLocale
}

export async function loginAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors,
      message: "Erro de validação",
    }
  }

  const { email, password } = parsed.data

  const supabase = await createClientSSR()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  const locale = detectLocale()

  if (error) {
    const isInvalidCredentials = /invalid login credentials/i.test(error.message ?? "")
    return {
      success: false as const,
      errors: {},
      message: isInvalidCredentials
        ? locale === "en-US"
          ? "Incorrect email or password"
          : "Email ou senha incorretos"
        : error.message || (locale === "en-US" ? "Unable to sign in" : "Não foi possível entrar"),
    }
  }

  // Check user role from database using service role (bypasses RLS)
  let role: UserRole = "student"
  let usedMethod = "none"

  try {
    const serviceSupabase = await createServiceClientSSR()
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select<string, { role: UserRole }>("role")
      .eq("id", data.user.id)
      .limit(1)
      .maybeSingle()

    console.log("=== LOGIN DEBUG (Service Role) ===")
    console.log("User ID:", data.user.id)
    console.log("Profile from DB:", profile)
    console.log("===================================")

    role = profile?.role ?? "student"
    usedMethod = "service_role"
  } catch (error) {
    console.error("Service role failed:", error)
    // If service role fails, fallback to checking user_metadata
    role = (data.user.user_metadata?.role as UserRole) ?? "student"
    usedMethod = "user_metadata"
  }

  console.log("=== LOGIN REDIRECT ===")
  console.log("Method used:", usedMethod)
  console.log("Role:", role)
  console.log("Should redirect to admin?", role === "admin" || role === "coach")
  console.log("======================")

  const redirectTo =
    role === "admin" || role === "coach"
      ? `/${locale}/admin/dashboard`
      : `/${locale}/treinos`

  return {
    success: true as const,
    message: "Login realizado com sucesso",
    redirectTo,
  }
}

export async function signUpAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())

  const parsed = signUpSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors,
      message: "Erro de validação",
    }
  }

  // Cadastros fechados: bloqueia a criação de novas contas.
  const signupOpen = await isSignupOpen()
  if (!signupOpen) {
    const isEnglish = parsed.data.language === "en-US"
    return {
      success: false as const,
      errors: {},
      message: isEnglish
        ? "Sign-ups are temporarily closed. Please try again later."
        : "Os cadastros estão temporariamente fechados. Tente novamente mais tarde.",
    }
  }

  const {
    email,
    password,
    first_name,
    last_name,
    phone,
    birth_date,
    gender,
    height_cm,
    weight_kg,
    country,
    language,
  } = parsed.data

  const supabase = await createClientSSR()

  const origin = headers().get("origin") ?? "http://localhost:3000"
  const locale = language ?? detectLocale()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`,
        phone,
        birth_date,
        gender,
        height_cm,
        weight_kg,
        country,
        language: locale,
      },
      emailRedirectTo: `${origin}/${locale}/auth/callback`,
    },
  })

  if (error) {
    return {
      success: false as const,
      errors: {},
      message: error.message || "Erro ao criar conta",
    }
  }

  const sessionCreated = !!data?.session
  let redirectTo = sessionCreated ? `/${locale}/treinos` : `/${locale}/login?registered=true`

  // Check user role for admin redirect after signup
  if (sessionCreated && data?.user) {
    let role: UserRole = "student"
    try {
      const serviceSupabase = await createServiceClientSSR()
      const { data: profile } = await serviceSupabase
        .from("profiles")
        .select<string, { role: UserRole }>("role")
        .eq("id", data.user.id)
        .limit(1)
        .maybeSingle()

      role = profile?.role ?? "student"
    } catch {
      role = (data.user.user_metadata?.role as UserRole) ?? "student"
    }

    if (role === "admin" || role === "coach") {
      redirectTo = `/${locale}/admin/dashboard`
    }
  }

  const finalMessage = sessionCreated
    ? language === "en-US"
      ? "Account created! Redirecting..."
      : "Conta criada! Redirecionando..."
    : language === "en-US"
      ? "Account created! Please sign in."
      : "Conta criada! Faça login."

  return {
    success: true as const,
    message: finalMessage,
    redirectTo,
  }
}

export async function forgotPasswordAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())

  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors,
      message: "Erro de validação",
    }
  }

  const { email } = parsed.data

  const origin = headers().get("origin") ?? "http://localhost:3000"
  const locale = detectLocale()

  const supabase = await createClientSSR()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/${locale}/auth/callback?next=/${locale}/reset-password`,
  })

  if (error) {
    return {
      success: false as const,
      errors: {},
      message: error.message || "Erro ao enviar e-mail",
    }
  }

  return {
    success: true as const,
    message: "Enviamos instruções para redefinir sua senha. Verifique seu e-mail.",
  }
}
