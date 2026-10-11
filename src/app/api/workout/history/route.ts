import { NextResponse } from "next/server";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { WorkoutService } from "@/services/WorkoutService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const sessions = await WorkoutService.userHistory(userId, limit);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching workout history:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout history" },
      { status: 500 }
    );
  }
}
