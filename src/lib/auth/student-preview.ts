import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  createDefaultClientSSR,
  createServiceClientSSR,
} from "@/lib/supabase/server";
import { isAccountSuspended } from "@/lib/auth/suspension";
import { PREVIEW_COOKIE, openPreview } from "./student-preview-token";
export async function verifiedPreview() {
  const context = openPreview(
    (await cookies()).get(PREVIEW_COOKIE)?.value ?? "",
  );
  if (!context || context.expires <= Date.now()) return null;
  const admin = await createDefaultClientSSR();
  const {
    data: { user },
  } = await admin.auth.getUser();
  if (!user || user.id !== context.adminId || isAccountSuspended(user))
    return null;
  const service = await createServiceClientSSR();
  const { data: actor } = await service
    .from("profiles")
    .select<string, { role: string; is_deleted: boolean }>("role,is_deleted")
    .eq("id", user.id)
    .maybeSingle();
  const { data: target } = await service
    .from("profiles")
    .select<string, { role: string; is_deleted: boolean }>("role,is_deleted")
    .eq("id", context.studentId)
    .maybeSingle();
  if (
    actor?.role !== "admin" ||
    actor.is_deleted ||
    target?.role !== "student" ||
    target.is_deleted
  )
    return null;
  return context;
}
export async function previewClient() {
  const context = await verifiedPreview();
  if (!context) redirect("/api/admin/student-preview/exit");
  // The student access token stays encrypted in an HttpOnly cookie. No browser session is replaced.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${context.token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  ) as unknown as Awaited<ReturnType<typeof createDefaultClientSSR>>;
}
