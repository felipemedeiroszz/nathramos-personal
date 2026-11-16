import { NextRequest, NextResponse } from "next/server";
import { monthlyProgressActor } from "@/services/MonthlyProgressService";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { progressPath } from "@/lib/monthly-progress";
import { AccessError } from "@/lib/auth/platform";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const actor = await monthlyProgressActor();
    const path = progressPath.parse(req.nextUrl.searchParams.get("path"));
    const db: any = await createServiceClientSSR();
    const upload = await db
      .from("monthly_progress_uploads")
      .select("path")
      .eq("user_id", actor.userId)
      .eq("path", path)
      .eq("ready", true)
      .eq("deleting", false)
      .maybeSingle();
    if (upload.error || !upload.data)
      return new NextResponse(null, { status: 404 });
    const result = await db.storage.from("monthly-progress").download(path);
    if (result.error) return new NextResponse(null, { status: 404 });
    return new NextResponse(result.data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return new NextResponse(null, {
      status: error instanceof AccessError ? error.status : 400,
    });
  }
}
