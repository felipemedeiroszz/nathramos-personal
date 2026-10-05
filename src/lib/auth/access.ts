"use server"

import { redirect } from "next/navigation"
import { createClientSSR, createServiceClientSSR } from "@/lib/supabase/server"
import type { UserRole, SubscriptionStatus } from "@/types"
import { headers } from "next/headers"
import { defaultLocale, locales } from "@/i18n/config"

export interface CanAccessResult {
  allowed: boolean
  status: SubscriptionStatus
  reason: string
}

const defaultBlocked: CanAccessResult = {
  allowed: false,
  status: "inactive",
  reason: "auth_missing",
}

function localeFromHeaders(): string {
  try {
    const h = headers()
    const pathname = h.get("x-next-pathname") ?? h.get("x-pathname") ?? ""
    const segment = pathname.split("/")[1]
    if (segment && locales.includes(segment as any)) return segment
    const accept = h.get("accept-language") ?? ""
    if (accept.toLowerCase().startsWith("en")) return "en-US"
  } catch {}
  return defaultLocale
}

export async function canAccessPlatform(
  userId: string,
  useServiceRole = false
): Promise<CanAccessResult> {
  try {
    const supabase = useServiceRole ? await createServiceClientSSR() : await createClientSSR()
    const { data } = await (supabase.rpc as any)(
      "can_access_platform",
      { p_user_id: userId } as never
    )
    if (Array.isArray(data) && data[0]) {
      return data[0] as CanAccessResult
    }
    return { ...defaultBlocked, reason: "rpc_empty" }
  } catch {
    return { ...defaultBlocked, reason: "rpc_error" }
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClientSSR()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function getCurrentRole(): Promise<UserRole | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null
  try {
    const supabase = await createClientSSR()
    const { data } = await supabase
      .from("profiles")
      .select<string, { role: UserRole }>("role")
      .eq("id", userId)
      .limit(1)
      .maybeSingle()
    return (data?.role ?? null) as UserRole | null
  } catch {
    return null
  }
}

export async function requireAuthenticated(): Promise<string> {
  const userId = await getCurrentUserId()
  if (!userId) {
    const locale = localeFromHeaders()
    redirect(`/${locale}/login`)
  }
  return userId
}

export async function requireRole(
  allowed: UserRole[],
  redirectTo = "/login"
): Promise<{ userId: string; role: UserRole; access: CanAccessResult }> {
  const userId = await requireAuthenticated()
  const role = (await getCurrentRole()) ?? "student"
  const access = await canAccessPlatform(userId)
  if (!allowed.includes(role)) {
    const locale = localeFromHeaders()
    redirect(`/${locale}${redirectTo.startsWith("/") ? redirectTo : "/" + redirectTo}`)
  }
  return { userId, role, access }
}

export async function requireAdmin(
  redirectTo = "/dashboard"
): Promise<{ userId: string }> {
  const { userId } = await requireRole(["admin"], redirectTo)
  return { userId }
}

export async function ensurePlatformAccessOrRedirect(
  blockedPath = "/planos"
): Promise<{ userId: string; role: UserRole; access: CanAccessResult }> {
  const userId = await requireAuthenticated()
  const role = (await getCurrentRole()) ?? "student"
  const access = await canAccessPlatform(userId)
  if (role === "admin" || role === "coach") {
    return { userId, role, access: { ...access, allowed: true } }
  }
  if (!access.allowed) {
    const locale = localeFromHeaders()
    const target = blockedPath.startsWith("/") ? blockedPath : "/" + blockedPath
    redirect(`/${locale}${target}?r=${encodeURIComponent(access.reason)}`)
  }
  return { userId, role, access }
}
