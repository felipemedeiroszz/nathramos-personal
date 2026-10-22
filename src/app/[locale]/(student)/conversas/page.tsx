import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Crown, MessageSquare, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { MentorChat, type ChatMessageItem } from "@/components/mentoring/MentorChat";
import { requireAuthenticated } from "@/lib/auth/access";
import { MentorshipService } from "@/services/MentorshipService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mentoria",
};

export default async function ConversationsPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const nav = await getTranslations("navigation");
  const t = await getTranslations("studentMentoring");
  const tStatus = await getTranslations("meetingStatus");

  const userId = await requireAuthenticated();

  const room = await MentorshipService.getRoomForStudent(userId);
  const [messages, meetings] = await Promise.all([
    room ? MentorshipService.listMessages(room.id) : Promise.resolve([]),
    MentorshipService.listMeetings({ userId, upcomingOnly: true, limit: 20 }),
  ]);

  const chatMessages: ChatMessageItem[] = messages.map((m) => ({
    id: m.id,
    roomId: m.room_id,
    senderId: m.sender_id,
    senderType: m.sender_type,
    content: m.content,
    createdAt: m.created_at,
  }));

  const coachName = room?.coach_name ?? "Nath Ramos";

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{nav("mentoring")}</h1>
        <p className="text-sm md:text-base text-text-secondary">{t("subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card className="p-0 overflow-hidden">
          {room ? (
            <div className="flex flex-col h-[560px]">
              <MentorChat
                className="flex-1 min-h-0"
                roomId={room.id}
                viewer="user"
                currentUserId={userId}
                counterpartName={coachName}
                counterpartAvatarUrl={null}
                initialMessages={chatMessages}
              />
            </div>
          ) : (
            <div className="h-[560px] flex items-center justify-center">
              <EmptyState
                className="py-12"
                icon={<MessageSquare size={36} className="text-text-secondary" />}
                title={t("chatUnavailable")}
                description={t("chatUnavailableDesc")}
              />
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-text">{t("upcomingTitle")}</h2>
              <p className="text-xs text-text-secondary">{t("upcomingDesc")}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CalendarClock size={20} />
            </div>
          </div>

          {meetings.length === 0 ? (
            <p className="text-sm text-text-secondary py-6 text-center">{t("noMeetings")}</p>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-xl border border-border/60 bg-surface-secondary/40 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-text">
                      {locale === "pt-BR" ? meeting.title_pt : meeting.title_en}
                    </p>
                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                      {tStatus(meeting.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {new Date(meeting.start_at).toLocaleString(locale, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {meeting.duration_min} min
                  </p>
                  <div className="flex items-center gap-2">
                    <Avatar alt={coachName} size="sm" fallback="N" />
                    <span className="text-xs text-text-secondary flex items-center gap-1">
                      <Crown size={12} className="text-primary" />
                      {coachName}
                    </span>
                  </div>
                  {meeting.meeting_url && (
                    <Button variant="secondary" size="sm" className="w-full" asChild>
                      <Link href={meeting.meeting_url} target="_blank" rel="noreferrer">
                        <Video size={14} className="mr-1.5" />
                        {t("joinMeeting")}
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
