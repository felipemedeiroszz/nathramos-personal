"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { upsertMeetingAction } from "@/app/actions/mentoring";
import { MEETING_STATUS_ARR } from "@/schemas/mentoring";
import type { MeetingWithStudent } from "@/services/MentorshipService";

export interface MeetingStudentOption {
  id: string;
  name: string;
}

interface MeetingUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: MeetingStudentOption[];
  meeting?: MeetingWithStudent | null;
  onSaved: () => void;
}

const PLATFORMS = ["google_meet", "zoom", "teams", "whatsapp", "other"] as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function MeetingUpsertModal({
  isOpen,
  onClose,
  students,
  meeting,
  onSaved,
}: MeetingUpsertModalProps) {
  const t = useTranslations("adminMentoring");
  const tStatus = useTranslations("meetingStatus");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [titlePt, setTitlePt] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descriptionPt, setDescriptionPt] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [startAt, setStartAt] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [platform, setPlatform] = useState<string>("google_meet");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [status, setStatus] = useState<string>("scheduled");

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (meeting) {
      setStudentId(meeting.user_id);
      setTitlePt(meeting.title_pt);
      setTitleEn(meeting.title_en);
      setDescriptionPt(meeting.description_pt ?? "");
      setDescriptionEn(meeting.description_en ?? "");
      setStartAt(toLocalInput(meeting.start_at));
      setDurationMin(meeting.duration_min);
      setPlatform(meeting.meeting_platform);
      setMeetingUrl(meeting.meeting_url ?? "");
      setStatus(meeting.status);
    } else {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      setStudentId(students[0]?.id ?? "");
      setTitlePt("Mentoria 1:1");
      setTitleEn("1:1 Mentorship");
      setDescriptionPt("");
      setDescriptionEn("");
      setStartAt(toLocalInput(now.toISOString()));
      setDurationMin(60);
      setPlatform("google_meet");
      setMeetingUrl("");
      setStatus("scheduled");
    }
  }, [isOpen, meeting, students]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!studentId) {
      setErrorMsg(t("selectStudentError"));
      return;
    }
    if (!startAt) {
      setErrorMsg(t("startAtError"));
      return;
    }

    startTransition(async () => {
      try {
        const result = await upsertMeetingAction({
          id: meeting?.id,
          user_id: studentId,
          title_pt: titlePt,
          title_en: titleEn.trim() || titlePt,
          description_pt: descriptionPt || null,
          description_en: descriptionEn.trim() || descriptionPt || null,
          start_at: startAt,
          duration_min: durationMin,
          status: status as any,
          meeting_url: meetingUrl || null,
          meeting_platform: platform,
        });
        if (result?.success) {
          onSaved();
        } else {
          setErrorMsg(result?.message ?? t("saveError"));
        }
      } catch (err: any) {
        setErrorMsg(err?.message ?? t("saveError"));
      }
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <ModalHeader>
        <ModalTitle>{meeting ? t("editMeeting") : t("createMeeting")}</ModalTitle>
        <ModalClose onClick={onClose} />
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("student")}</label>
            <Select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!!meeting}
            >
              <option value="">{t("selectStudent")}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("titlePt")}</label>
              <Input value={titlePt} onChange={(e) => setTitlePt(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("titleEn")}</label>
              <Input
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder={titlePt}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("descriptionPt")}</label>
              <Textarea
                value={descriptionPt}
                onChange={(e) => setDescriptionPt(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("descriptionEn")}</label>
              <Textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                rows={3}
                placeholder={descriptionPt}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("startAt")}</label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("duration")}</label>
              <Input
                type="number"
                min={5}
                max={480}
                step={5}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("status")}</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {MEETING_STATUS_ARR.map((s) => (
                  <option key={s} value={s}>
                    {tStatus(s)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("platform")}</label>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {t(`platform_${p}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("meetingUrl")}</label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              {errorMsg}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? tCommon("loading") : tCommon("save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default MeetingUpsertModal;
