import { NextRequest, NextResponse } from "next/server"
import { createClientSSR } from "@/lib/supabase/server"
import { locales } from "@/i18n/config"
export async function GET(request: NextRequest, { params }: { params: { locale: string } }) {
 const locale = locales.includes(params.locale as any) ? params.locale : "pt-BR"
 const code = request.nextUrl.searchParams.get("code")
 const token = request.nextUrl.searchParams.get("token_hash")
 const type = request.nextUrl.searchParams.get("type")
 const next = request.nextUrl.searchParams.get("next")
 const target = next === `/${locale}/reset-password` || type === "recovery" ? `/${locale}/reset-password` : `/${locale}/dashboard`
 const db = await createClientSSR()
 const result = code ? await db.auth.exchangeCodeForSession(code) : token && (type === "recovery" || type === "email" || type === "signup") ? await db.auth.verifyOtp({ token_hash: token, type }) : null
 if (result && !result.error) return NextResponse.redirect(new URL(target, request.url))
 return NextResponse.redirect(new URL(`/${locale}/login?auth_error=invalid_link`, request.url))
}
