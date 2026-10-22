"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, CalendarPlus, Pencil, Trash2, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  MeetingUpsertModal,
  type MeetingStudentOption,
} from "./MeetingUpsertModal";
import { updateMeetingStatusAction, deleteMeetingAction } from "@/app/actions/mentoring";
import { MEETING_STATUS_ARR } from "@/schemas/mentoring";
import type { MeetingWithStudent } from "@/services/MentorshipService";

interface AdminReunioesClientProps {
  meetings: MeetingWithStudent[];
  students: MeetingStudentOption[];
}

function meetingStatusVariant(
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

export function AdminReunioesClient({ meetings, students }: AdminReunioesClientProps) {
  const t = useTranslations("adminMentoring");
  const tStatus = useTranslations("meetingStatus");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [meetingFilter, setMeetingFilter] = useState("");
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingWithStudent | null>(null);
  const [busyMeetingId, setBusyMeetingId] = useState<string | null>(null);

  const filteredMeetings = useMemo(() => {
    if (!meetingFilter) return meetings;
    return meetings.filter((m) => m.status === meetingFilter);
  }, [meetings, meetingFilter]);

  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.start_at).getTime() >= Date.now() && m.status !== "canceled"
  ).length;

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleMeetingStatusChange(meeting: MeetingWithStudent, status: string) {
    setBusyMeetingId(meeting.id);
    startTransition(async () => {
      try {
        await updateMeetingStatusAction({
          id: meeting.id,
          status: status as any,
          cancel_reason: status === "canceled" ? meeting.cancel_reason : undefined,
        });
        router.refresh();
      } finally {
        setBusyMeetingId(null);
      }
    });
  }

  function handleDeleteMeeting(meeting: MeetingWithStudent) {
    if (!window.confirm(t("deleteMeetingConfirm"))) return;
    setBusyMeetingId(meeting.id);
    startTransition(async () => {
      try {
        await deleteMeetingAction(meeting.id);
        router.refresh();
      } finally {
        setBusyMeetingId(null);
      }
    });
  }

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-border">
          <div className="flex-1 flex items-center gap-2">
            <Badge variant="outline">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {upcomingMeetings} {t("upcoming")}
              </span>
            </Badge>
          </div>
          <Select
            className="w-full sm:w-[200px]"
            value={meetingFilter}
            onChange={(e) => setMeetingFilter(e.target.value)}
          >
            <option value="">{t("allStatuses")}</option>
            {MEETING_STATUS_ARR.map((s) => (
              <option key={s} value={s}>
                {tStatus(s)}
              </option>
            ))}
          </Select>
          <Button
            variant="primary"
            onClick={() => {
              setEditingMeeting(null);
              setMeetingModalOpen(true);
            }}
          >
            <CalendarPlus size={16} className="mr-2" />
            {t("createMeeting")}
          </Button>
        </div>

        {filteredMeetings.length === 0 ? (
          <EmptyState
            className="py-16"
            icon={<Calendar size={36} className="text-text-secondary" />}
            title={t("noMeetings")}
            description={t("noMeetingsDesc")}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("student")}</TableHead>
                  <TableHead>{t("title")}</TableHead>
                  <TableHead>{t("startAt")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("duration")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("platform")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map((meeting) => (
                  <TableRow key={meeting.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={meeting.student_avatar_url || undefined}
                          alt={meeting.student_name}
                          size="sm"
                          fallback={meeting.student_name?.[0]?.toUpperCase() ?? "?"}
                        />
                        <span className="text-sm font-medium text-text truncate">
                          {meeting.student_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-text max-w-[220px] truncate">
                      {locale === "pt-BR" ? meeting.title_pt : meeting.title_en}
                    </TableCell>
                    <TableCell className="text-sm text-text whitespace-nowrap">
                      {formatDateTime(meeting.start_at)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-text">
                      {meeting.duration_min} min
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-sm text-text">
                        <Video size={13} className="text-text-secondary" />
                        {t(`platform_${meeting.meeting_platform}` as any)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          className="w-[150px]"
                          value={meeting.status}
                          disabled={busyMeetingId === meeting.id}
                          onChange={(e) => handleMeetingStatusChange(meeting, e.target.value)}
                        >
                          {MEETING_STATUS_ARR.map((s) => (
                            <option key={s} value={s}>
                              {tStatus(s)}
                            </option>
                          ))}
                        </Select>
                        <Badge
                          variant={meetingStatusVariant(meeting.status)}
                          className="hidden xl:inline-flex"
                        >
                          {tStatus(meeting.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("editMeeting")}
                          onClick={() => {
                            setEditingMeeting(meeting);
                            setMeetingModalOpen(true);
                          }}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("deleteMeeting")}
                          disabled={busyMeetingId === meeting.id}
                          onClick={() => handleDeleteMeeting(meeting)}
                        >
                          <Trash2 size={15} className="text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {meetingModalOpen && (
        <MeetingUpsertModal
          isOpen={meetingModalOpen}
          onClose={() => setMeetingModalOpen(false)}
          students={students}
          meeting={editingMeeting}
          onSaved={() => {
            setMeetingModalOpen(false);
            setEditingMeeting(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

export default AdminReunioesClient;
