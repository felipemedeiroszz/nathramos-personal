"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { DatabaseSchema } from "./server"

export function createClientBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error("[supabase/client] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar em .env.local.")
  }
  return createBrowserClient<DatabaseSchema>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}
