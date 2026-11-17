import { NextResponse, NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

import createMiddleware from "next-intl/middleware";

import { locales, defaultLocale } from "@/i18n/config";

const intlMiddleware = createMiddleware({
  locales,

  defaultLocale,

  localePrefix: "always",
});

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname;

  const supportControl = path.startsWith("/api/admin/student-preview/");

  let sourcePath = path;

  if (path.startsWith("/api")) {
    try {
      const ref = new URL(request.headers.get("referer") ?? "");

      if (ref.origin === request.nextUrl.origin) sourcePath = ref.pathname;
    } catch {}
  }

  const preview =
    request.cookies.has("nr-support-preview") &&
    !supportControl &&
    !/^\/(pt-BR|en-US)\/admin(?:\/|$)/.test(sourcePath);

  const forwarded = new Headers(request.headers);

  forwarded.delete("x-student-preview");

  if (preview) forwarded.set("x-student-preview", "1");

  request = new NextRequest(request, { headers: forwarded });

  if (preview && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return NextResponse.json(
      {
        error:
          "Visualização de suporte: alterações desativadas. Volte ao administrador para editar.",
      },
      { status: 403 },
    );
  }

  // Skip middleware for static files and public assets

  const url = request.nextUrl.pathname;

  if (
    url.startsWith("/_next") ||
    url.startsWith("/public") ||
    url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|json|js|css)$/i)
  ) {
    return NextResponse.next({ request: { headers: forwarded } });
  }

  // API routes are not localized: skip intlMiddleware to avoid a redirect to /{locale}/api/...

  if (url.startsWith("/api")) {
    const apiResponse = NextResponse.next({ request: { headers: forwarded } });

    try {
      const sessionResp = await updateSession(request.clone() as NextRequest);

      for (const cookie of sessionResp.headers.getSetCookie?.() ?? []) {
        apiResponse.headers.append("set-cookie", cookie);
      }
    } catch {}

    if (!apiResponse.headers.has("x-content-type-options"))
      apiResponse.headers.set("x-content-type-options", "nosniff");

    if (!apiResponse.headers.has("x-frame-options"))
      apiResponse.headers.set("x-frame-options", "DENY");

    if (!apiResponse.headers.has("referrer-policy"))
      apiResponse.headers.set(
        "referrer-policy",
        "strict-origin-when-cross-origin",
      );

    if (!apiResponse.headers.has("permissions-policy"))
      apiResponse.headers.set(
        "permissions-policy",
        "camera=(), microphone=(), geolocation=()",
      );

    if (preview) apiResponse.headers.set("Cache-Control", "private, no-store");
    return apiResponse;
  }

  // 1. Run intlMiddleware FIRST on the ORIGINAL request, BEFORE updateSession mutates request cookies.

  // This prevents NEXT_LOCALE cookie lookups / auth cookies from interfering with locale detection.

  const response = intlMiddleware(request);

  // 2. updateSession uses Supabase SSR and may mutate `request.cookies` inside setAll.

  // Clone request so we have a clean copy for updateSession only (side effects isolated).

  let sessionSetCookie: string[] = [];

  try {
    const cloned = request.clone() as NextRequest;

    const sessionResp = await updateSession(cloned);

    sessionSetCookie = sessionResp.headers.getSetCookie?.() ?? [];
  } catch {}

  // Merge session cookies without overwriting intl cookies (order preserved, no duplicates)

  if (sessionSetCookie.length > 0) {
    const existing = response.headers.getSetCookie?.() ?? [];

    const byName = new Map<string, string>();

    const push = (line: string) => {
      const name = line.split("=")[0];

      byName.set(name, line);
    };

    for (const c of existing) push(c);

    for (const c of sessionSetCookie) push(c);

    response.headers.delete("set-cookie");

    for (const c of byName.values()) response.headers.append("set-cookie", c);
  }

  // Security headers

  if (!response.headers.has("x-content-type-options"))
    response.headers.set("x-content-type-options", "nosniff");

  if (!response.headers.has("x-frame-options"))
    response.headers.set("x-frame-options", "DENY");

  if (!response.headers.has("referrer-policy"))
    response.headers.set("referrer-policy", "strict-origin-when-cross-origin");

  if (!response.headers.has("permissions-policy"))
    response.headers.set(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=()",
    );

  if (preview) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*|icons-pwa|images).*)",
  ],
};
