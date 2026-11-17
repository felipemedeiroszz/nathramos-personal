import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import {
  createDefaultClientSSR,
  createServiceClientSSR,
} from "@/lib/supabase/server";

import { isAccountSuspended } from "@/lib/auth/suspension";

import {
  sealPreview,
  PREVIEW_COOKIE,
  PREVIEW_MARKER,
} from "@/lib/auth/student-preview-token";

import { AuditLogService } from "@/services/AuditLogService";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return new NextResponse("Origem inválida", { status: 403 });

  const admin = await createDefaultClientSSR();

  const {
    data: { user },
  } = await admin.auth.getUser();

  if (!user || isAccountSuspended(user))
    return new NextResponse("Acesso negado", { status: 403 });

  const service = await createServiceClientSSR();

  const { data: actor } = await service
    .from("profiles")
    .select<string, { role: string; is_deleted: boolean }>("role,is_deleted")
    .eq("id", user.id)
    .maybeSingle();

  if (actor?.role !== "admin" || actor.is_deleted)
    return new NextResponse("Acesso negado", { status: 403 });

  const form = await request.formData();

  const studentId = String(form.get("studentId") ?? "");

  const locale = form.get("locale") === "en-US" ? "en-US" : "pt-BR";

  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(studentId))
    return new NextResponse("Aluno inválido", { status: 400 });

  const { data: target } = await service
    .from("profiles")
    .select<string, { role: string; is_deleted: boolean }>("role,is_deleted")
    .eq("id", studentId)
    .maybeSingle();

  const { data: account, error: accountError } =
    await service.auth.admin.getUserById(studentId);

  if (
    accountError ||
    target?.role !== "student" ||
    target.is_deleted ||
    !account.user?.email ||
    isAccountSuspended(account.user)
  )
    return new NextResponse("Aluno indisponível", { status: 400 });

  if (
    !(await AuditLogService.log({
      adminId: user.id,
      userId: studentId,
      action: "student_preview_start",
      entity_type: "profiles",
      entity_id: studentId,
      details: { mode: "read_only", duration_minutes: 15 },
    }))
  )
    return new NextResponse("Não foi possível registrar o acesso de suporte", {
      status: 503,
    });

  const { data: link, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email: account.user.email,
  });

  if (error || !link.properties?.hashed_token)
    return new NextResponse("Não foi possível iniciar a visualização", {
      status: 503,
    });

  const isolated = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { data, error: verifyError } = await isolated.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });

  if (verifyError || !data.session || data.user?.id !== studentId)
    return new NextResponse("Não foi possível iniciar a visualização", {
      status: 503,
    });

  const expires = Math.min(
    Date.now() + 15 * 60_000,
    (data.session.expires_at ?? 0) * 1000,
  );

  const response = NextResponse.redirect(
    new URL(`/${locale}/dashboard`, request.url),
    303,
  );

  response.headers.set("Cache-Control", "no-store");

  const options = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  response.cookies.set(
    PREVIEW_COOKIE,
    sealPreview({
      adminId: user.id,
      studentId,
      locale,
      expires,
      token: data.session.access_token,
    }),
    { ...options, httpOnly: true },
  );

  response.cookies.set(PREVIEW_MARKER, "1", options);

  return response;
}
