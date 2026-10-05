"use server"

import { redirect } from "next/navigation"
import { createClientSSR } from "@/lib/supabase/server"
import {
  loginSchema,
  signUpSchema,
  forgotPasswordSchema,
} from "@/schemas/auth"
import { headers } from "next/headers"
import { defaultLocale } from "@/i18n/config"

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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false as const,
      errors: {},
      message: error.message || "Credenciais inválidas",
    }
  }

  const locale = detectLocale()
  redirect(`/${locale}/dashboard`)
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

  const { error } = await supabase.auth.signUp({
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

  redirect(`/${locale}/login`)
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
