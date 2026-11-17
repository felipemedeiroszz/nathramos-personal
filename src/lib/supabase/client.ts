"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { DatabaseSchema } from "./server";

export function createClientBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "[supabase/client] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar em .env.local.",
    );
  }
  const preview =
    typeof window !== "undefined" &&
    document.cookie.split("; ").includes("nr-support-mode=1") &&
    !/^\/(pt-BR|en-US)\/admin(?:\/|$)/.test(window.location.pathname);
  return createBrowserClient<DatabaseSchema>(url, anonKey, {
    ...(preview
      ? {
          isSingleton: false,
          cookieOptions: { name: "nr-support-anonymous" },
          cookies: { getAll: () => [], setAll: () => {} },
        }
      : {}),
    auth: {
      autoRefreshToken: !preview,
      persistSession: !preview,
      detectSessionInUrl: !preview,
    },
  });
}
