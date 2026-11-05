import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { DatabaseSchema } from "./server"
import { isAccountSuspended } from "@/lib/auth/suspension"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return response

  // Safety check for request.cookies
  if (!request || !request.cookies) {
    return response
  }

  const supabase = createServerClient<DatabaseSchema>(url, anonKey, {
    cookies: {
      getAll() {
        try {
          return request.cookies.getAll()
        } catch {
          return []
        }
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options as CookieOptions)
        }
      },
    },
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  if ((user && isAccountSuspended(user)) || error?.code === "user_banned") {
    await supabase.auth.signOut({ scope: "local" })
  }
  return response
}
