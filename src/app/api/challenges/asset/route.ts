import { NextRequest, NextResponse } from "next/server";
import { challengeActor } from "@/services/ChallengeService";
import { createServiceClientSSR } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { userId } = await challengeActor();
    const path = req.nextUrl.searchParams.get("path") || "";
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|pdf)$/.test(path))
      return new NextResponse(null, { status: 400 });
    const db = await createServiceClientSSR();
    const permission = await (db.rpc as any)("challenge_asset", {
      p_actor: userId,
      p_path: path,
    });
    if (permission.error) return new NextResponse(null, { status: 404 });
    const file = await db.storage.from("challenge-assets").download(path);
    if (file.error) return new NextResponse(null, { status: 404 });
    return new NextResponse(file.data, {
      headers: {
        "Content-Type": permission.data,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(permission.data === "application/pdf"
          ? {
              "Content-Disposition": 'attachment; filename="comprovante.pdf"',
              "Content-Security-Policy": "sandbox",
            }
          : {}),
      },
    });
  } catch {
    return new NextResponse(null, { status: 403 });
  }
}
