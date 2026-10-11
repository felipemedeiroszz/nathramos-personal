import { NextResponse } from "next/server";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { WorkoutService } from "@/services/WorkoutService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const todaysProgram = await WorkoutService.getTodaysProgram(userId);

    if (!todaysProgram || !todaysProgram.program || !todaysProgram.day) {
      return NextResponse.json({
        program: null,
        day: null,
        exerciseCount: 0,
        estimatedMinutes: 0,
        available: false,
        reason: "No workout assigned for today",
        completedToday: todaysProgram?.sessionCompletedToday ?? false,
      });
    }

    const dayExercises = await WorkoutService.listDayExercises(todaysProgram.day.id);

    return NextResponse.json({
      program: todaysProgram.program,
      day: todaysProgram.day,
      exerciseCount: dayExercises.length,
      estimatedMinutes: todaysProgram.day.est_minutes || todaysProgram.program.est_minutes_per_session || 45,
      available: true,
      completedToday: todaysProgram.sessionCompletedToday ?? false,
    });
  } catch (error) {
    console.error("Error fetching today's workout:", error);
    return NextResponse.json(
      { error: "Failed to fetch today's workout" },
      { status: 500 }
    );
  }
}
