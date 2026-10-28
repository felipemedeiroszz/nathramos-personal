import { NextResponse } from "next/server";
import { requireStudentTarget, AccessError } from "@/lib/auth/platform";
import { WorkoutService } from "@/services/WorkoutService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { targetId: userId } = await requireStudentTarget(searchParams.get("userId"));
    const limit = Math.max(1, Math.min(100, Math.trunc(Number(searchParams.get("limit"))) || 30));

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const sessions = await WorkoutService.userHistory(userId, limit);

    return NextResponse.json({ sessions });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Error fetching workout history:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout history" },
      { status: 500 }
    );
  }
}
