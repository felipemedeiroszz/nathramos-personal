import { NextRequest, NextResponse } from "next/server";
import { communityActor } from "@/services/CommunityService";
import { createServiceClientSSR } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { userId } = await communityActor();
    const path = req.nextUrl.searchParams.get("path") || "";
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(path))
      return new NextResponse(null, { status: 400 });
    const db: any = await createServiceClientSSR();
    const upload = await db
      .from("community_uploads")
      .select("owner_id")
      .eq("path", path)
      .maybeSingle();
    if (upload.error || !upload.data)
      return new NextResponse(null, { status: 404 });
    const post = await db
      .from("community_posts")
      .select("id,author:profiles!inner(is_deleted)")
      .eq("author.is_deleted", false)
      .contains("images", [path])
      .is("deleted_at", null)
      .limit(1);
    if (post.error || (upload.data.owner_id !== userId && !post.data?.length))
      return new NextResponse(null, { status: 404 });
    const result = await db.storage.from("community-images").download(path);
    if (result.error) return new NextResponse(null, { status: 404 });
    return new NextResponse(result.data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 403 });
  }
}
