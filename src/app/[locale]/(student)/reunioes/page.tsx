import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarClock, History, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireStudentPage } from "@/lib/auth/platform";
import { MentorshipService, type MeetingWithStudent } from "@/services/MentorshipService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reuniões",
};

function statusVariant(
  status: string
): "success" | "warning" | "error" | "default" | "outline" {
  switch (status) {
    case "completed":
      return "success";
    case "confirmed":
      return "default";
    case "scheduled":
    case "rescheduled":
      return "warning";
    case "canceled":
    case "no_show":
      return "error";
    default:
      return "outline";
  }
}

export default async function StudentMeetingsPage({
  params: { locale },
}: {
  params: { locale: (typeof locales)[number] };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const nav = await getTranslations("navigation");
  const t = await getTranslations("studentMentoring");
  const tStatus = await getTranslations("meetingStatus");

  const userId = await requireStudentPage();

  const meetings = await MentorshipService.listMeetings({ userId, limit: 100 });
  const now = Date.now();
  const isUpcoming = (m: MeetingWithStudent) =>
    new Date(m.start_at).getTime() >= now &&
    m.status !== "canceled" &&
    m.status !== "completed" &&
    m.status !== "no_show";

  const upcoming = meetings.filter(isUpcoming);
  const past = meetings.filter((m) => !isUpcoming(m)).reverse();

  const renderCard = (meeting: MeetingWithStudent, withJoin: boolean) => {
    const title = locale === "pt-BR" ? meeting.title_pt : meeting.title_en;
    const description =
      locale === "pt-BR" ? meeting.description_pt : meeting.description_en;

    return (
      <div
        key={meeting.id}
        className="rounded-xl border border-border/60 bg-surface-secondary/40 p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text truncate">{title}</p>
            {description && (
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <Badge variant={statusVariant(meeting.status)} className="shrink-0">
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
        {withJoin && meeting.meeting_url && (
          <Button variant="secondary" size="sm" className="w-full" asChild>
            <Link href={meeting.meeting_url} target="_blank" rel="noreferrer">
              <Video size={14} className="mr-1.5" />
              {t("joinMeeting")}
            </Link>
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title={nav("meetings")}
        description={t("meetingsSubtitle")}
        icon={<CalendarClock size={22} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

          {upcoming.length === 0 ? (
            <p className="text-sm text-text-secondary py-6 text-center">{t("noMeetings")}</p>
          ) : (
            <div className="space-y-3">{upcoming.map((m) => renderCard(m, true))}</div>
          )}
        </Card>

        <Card className="p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">{t("pastTitle")}</h2>
            <div className="w-10 h-10 rounded-xl bg-surface-secondary text-text-secondary flex items-center justify-center">
              <History size={20} />
            </div>
          </div>

          {past.length === 0 ? (
            <p className="text-sm text-text-secondary py-6 text-center">
              {t("noPastMeetings")}
            </p>
          ) : (
            <div className="space-y-3">{past.map((m) => renderCard(m, false))}</div>
          )}
        </Card>
      </div>
    </div>
  );
}
