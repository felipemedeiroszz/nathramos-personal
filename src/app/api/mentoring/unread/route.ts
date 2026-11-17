import { NextRequest, NextResponse } from "next/server";
import { mentorshipUnreadCount } from "@/services/MentorshipUnreadService";
import { AccessError } from "@/lib/auth/platform";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const side =
      request.nextUrl.searchParams.get("side") === "admin"
        ? "admin"
        : "student";
    return NextResponse.json(
      { count: await mentorshipUnreadCount(side) },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Contagem indisponível" },
      { status: error instanceof AccessError ? error.status : 503, headers },
    );
  }
}
