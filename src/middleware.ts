import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "@/i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Skip middleware for static files and public assets
  const url = request.nextUrl.pathname;
  if (url.startsWith('/_next') || url.startsWith('/public') || url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|json|js|css)$/i)) {
    return NextResponse.next();
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
  if (!response.headers.has("x-content-type-options")) response.headers.set("x-content-type-options", "nosniff");
  if (!response.headers.has("x-frame-options")) response.headers.set("x-frame-options", "DENY");
  if (!response.headers.has("referrer-policy")) response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  if (!response.headers.has("permissions-policy")) response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*|icons-pwa|images).*)",
  ],
};
