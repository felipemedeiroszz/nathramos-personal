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
    const storyId = req.nextUrl.searchParams.get("story");
    if (storyId !== null) {
      if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(storyId))
        return new NextResponse(null, { status: 400 });
      const story = await db
        .from("community_stories")
        .select(
          "id,author:profiles!community_stories_author_id_fkey!inner(is_deleted)",
        )
        .eq("id", storyId)
        .eq("image_path", path)
        .eq("author.is_deleted", false)
        .is("deleted_at", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1);
      if (story.error || !story.data?.length)
        return new NextResponse(null, { status: 404 });
    } else {
      const upload = await db
        .from("community_uploads")
        .select("owner_id")
        .eq("path", path)
        .maybeSingle();
      if (upload.error || !upload.data)
        return new NextResponse(null, { status: 404 });
      const post = await db
        .from("community_posts")
        .select(
          "id,author:profiles!community_posts_author_id_fkey!inner(is_deleted)",
        )
        .eq("author.is_deleted", false)
        .contains("images", [path])
        .is("deleted_at", null)
        .limit(1);
      if (post.error) return new NextResponse(null, { status: 404 });
      if (upload.data.owner_id !== userId && !post.data?.length) {
        const story = await db
          .from("community_stories")
          .select(
            "id,author:profiles!community_stories_author_id_fkey!inner(is_deleted)",
          )
          .eq("author.is_deleted", false)
          .eq("image_path", path)
          .is("deleted_at", null)
          .gt("expires_at", new Date().toISOString())
          .limit(1);
        if (story.error || !story.data?.length)
          return new NextResponse(null, { status: 404 });
      }
    }
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
