import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { MentorshipService } from "@/services/MentorshipService";
import { AdminMentoriaClient } from "@/components/admin/mentoring/AdminMentoriaClient";
import type { ChatMessageItem } from "@/components/mentoring/MentorChat";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Mentoria",
};

export default async function AdminMentoriaPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminMentoring = await getTranslations("adminMentoring");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const rooms = await MentorshipService.listRooms();

  const initialRoom =
    rooms.find((r) => r.unread_count_coach > 0) ?? rooms[0] ?? null;
  const initialMessages: ChatMessageItem[] = initialRoom
    ? (await MentorshipService.listMessages(initialRoom.id)).map((m) => ({
        id: m.id,
        roomId: m.room_id,
        senderId: m.sender_id,
        senderType: m.sender_type,
        content: m.content,
        createdAt: m.created_at,
      }))
    : [];

  const title = (() => {
    try {
      if (tAdminNav.has("mentoria")) return tAdminNav("mentoria");
    } catch {}
    return "Mentoria";
  })();

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="relationship">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminMentoring("subtitle")}
        </p>
      </AdminPageHeader>

      <AdminMentoriaClient
        currentUserId={userId}
        rooms={rooms}
        initialRoomId={initialRoom?.id ?? null}
        initialMessages={initialMessages}
      />
    </div>
  );
}
