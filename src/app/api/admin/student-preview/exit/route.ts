import { NextRequest, NextResponse } from "next/server";

import {
  openPreview,
  PREVIEW_COOKIE,
  PREVIEW_MARKER,
} from "@/lib/auth/student-preview-token";

export async function GET(request: NextRequest) {
  const context = openPreview(request.cookies.get(PREVIEW_COOKIE)?.value ?? "");

  // Exiting only clears support context; the administrator session is never changed.

  const path = context
    ? `/${context.locale}/admin/alunos/${context.studentId}`
    : "/pt-BR/admin/alunos";

  const response = NextResponse.redirect(new URL(path, request.url), 303);

  response.cookies.delete(PREVIEW_COOKIE);

  response.cookies.delete(PREVIEW_MARKER);

  response.headers.set("Cache-Control", "no-store");

  return response;
}
