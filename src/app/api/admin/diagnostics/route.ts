import { NextResponse } from "next/server";
import { createClientSSR, createServiceClientSSR } from "@/lib/supabase/server";
import { checkAdminDatabase } from "@/lib/admin/diagnostics";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const respond = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET() {
  try {
    // Authenticate without service_role so a broken server key is diagnosable.
    const session = await createClientSSR();
    const {
      data: { user },
      error: authError,
    } = await session.auth.getUser();
    if (authError || !user)
      return respond(
        { error: "Entre na sua conta para consultar o diagnóstico." },
        401,
      );
    const { data: profile, error: profileError } = await (session as any)
      .from("profiles")
      .select("role,is_deleted")
      .eq("id", user.id)
      .single();
    if (profileError)
      return respond(
        {
          error: "Não foi possível verificar a permissão do administrador.",
          code: profileError.code,
        },
        503,
      );
    if (!profile || profile.is_deleted || profile.role !== "admin")
      return respond(
        { error: "Diagnóstico disponível somente para administradores." },
        403,
      );
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return respond({
        ok: false,
        checkedAt: new Date().toISOString(),
        checks: [
          {
            id: "service_key",
            label: "SUPABASE_SERVICE_ROLE_KEY no servidor",
            ok: false,
            kind: "credentials",
            code: "MISSING_ENV",
          },
        ],
      });
    const db = await createServiceClientSSR();
    const result = await checkAdminDatabase(db, user.id);
    return respond(result);
  } catch {
    return respond(
      {
        error:
          "Falha ao consultar o diagnóstico. Confira os logs do servidor e as variáveis Supabase do ambiente publicado.",
      },
      503,
    );
  }
}
