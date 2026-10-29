import { StudentHome } from "@/components/student/StudentHome";
import { setRequestLocale } from "next-intl/server";
import { requireStudentPage } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";
import {
  StudentRoutineService,
  checked,
} from "@/services/StudentRoutineService";
export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };
export default async function Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const userId = await requireStudentPage();
  const db: any = await createServiceClientSSR();
  const [data, notifications, rooms, meetings] = await Promise.all([
    StudentRoutineService.get(userId),
    db
      .from("notifications")
      .select("id, title, body, read_at")
      .eq("user_id", userId)
      .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("mentorship_rooms")
      .select("id, unread_count_user")
      .eq("user_id", userId)
      .eq("is_active", true),
    db
      .from("meetings")
      .select("id, title_pt, title_en, start_at")
      .eq("user_id", userId)
      .in("status", ["scheduled", "confirmed", "rescheduled"])
      .gte("start_at", new Date().toISOString())
      .order("start_at")
      .limit(3),
  ]);
  const notices = checked<any[]>(notifications, "dashboard notifications");
  const conversations = checked<any[]>(rooms, "dashboard rooms");
  const upcoming = checked<any[]>(meetings, "dashboard meetings");
  return (
    <StudentHome
      locale={locale}
      userId={userId}
      data={data}
      notices={notices}
      upcoming={upcoming}
      unread={conversations.reduce(
        (sum, room) => sum + Number(room.unread_count_user || 0),
        0,
      )}
    />
  );
}
