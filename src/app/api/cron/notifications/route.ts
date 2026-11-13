import { NextResponse } from "next/server";
import { NotificationDispatcher } from "@/services/NotificationDispatcher";
import { ExamUploadService } from "@/services/ExamUploadService";
import { cleanCommunityUploads } from "@/services/CommunityService";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const task = new URL(request.url).searchParams.get("task") || "all";
  if (!["all", "reminders", "deliver", "uploads"].includes(task))
    return NextResponse.json({ error: "invalid_task" }, { status: 400 });
  const result: Record<string, unknown> = { task };
  let failed = false;
  const run = async (name: string, action: () => Promise<any>) => {
    try {
      const value = await action();
      result[name] = value;
      if (value.failed > 0) failed = true;
    } catch {
      failed = true;
      result[name] = {
        error: "Falha nesta etapa. As outras etapas foram executadas.",
      };
      console.error("[cron/notifications] stage_failed", { stage: name });
    }
  };
  if (task === "all" || task === "reminders")
    await run("reminders", () =>
      NotificationDispatcher.generateRoutineReminders(),
    );
  if (task === "all" || task === "deliver")
    await run("deliveries", () =>
      NotificationDispatcher.processDueNotifications(),
    );
  if (task === "all" || task === "uploads")
    await run("uploads", () => ExamUploadService.cleanExpired());
  if (task === "all" || task === "uploads")
    await run("communityUploads", cleanCommunityUploads);
  return NextResponse.json(
    { success: !failed, ...result },
    { status: failed ? 500 : 200 },
  );
}
