"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { CheckCircle, Download, Loader2, MessageSquare, XCircle } from "lucide-react";
import { reviewExamAction } from "@/app/actions/content";
import { getExamFileUrlAction } from "@/app/actions/exams";
import type { ExamRow } from "@/types";

interface ExamReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam?: ExamRow | null;
  studentName?: string;
  onSaved?: () => void;
}

export function ExamReviewModal({
  isOpen,
  onClose,
  exam,
  studentName,
  onSaved,
}: ExamReviewModalProps) {
  const t = useTranslations("adminExams");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(exam?.coach_feedback ?? "");
    setStatus(null);
  }, [isOpen, exam]);

  if (!exam) return null;

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-US");
    } catch {
      return value;
    }
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await reviewExamAction({ id: exam!.id, coach_feedback: feedback });
      if (res.success) {
        setStatus({ type: "ok", msg: t("feedbackSaved") });
        onSaved?.();
      } else {
        setStatus({ type: "err", msg: t("feedbackError") });
      }
    });
  }

  function handleViewFile() {
    startTransition(async () => {
      const res = await getExamFileUrlAction(exam!.id);
      if (res.success) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setStatus({ type: "err", msg: t("fileError") });
      }
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <ModalHeader>
        <ModalTitle>{t("reviewTitle")}</ModalTitle>
        <ModalClose onClick={onClose} />
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <div className="rounded-xl border border-border bg-surface-secondary/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text">{exam.title}</span>
              {exam.coach_feedback ? (
                <Badge variant="success">
                  <CheckCircle size={12} className="mr-1" />
                  {t("reviewed")}
                </Badge>
              ) : (
                <Badge variant="warning">{t("pendingReview")}</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-secondary">
              <span>
                {t("student")}: <span className="text-text">{studentName || "-"}</span>
              </span>
              <span>
                {t("lab")}: <span className="text-text">{exam.lab_name || "-"}</span>
              </span>
              <span>
                {t("examDate")}: <span className="text-text">{formatDate(exam.exam_date)}</span>
              </span>
              {exam.reviewed_at && (
                <span>
                  {t("reviewedAt")}:{" "}
                  <span className="text-text">{formatDate(exam.reviewed_at)}</span>
                </span>
              )}
            </div>
            {exam.description && (
              <p className="text-sm text-text-secondary whitespace-pre-line">{exam.description}</p>
            )}
            {exam.file_name && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleViewFile}
                disabled={isPending}
              >
                <Download size={14} className="mr-2" />
                {t("viewFile")} · {exam.file_name}
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text flex items-center gap-2">
              <MessageSquare size={14} className="text-primary" />
              {t("feedback")}
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              placeholder={t("feedbackPlaceholder")}
            />
            <p className="text-xs text-text-secondary">{t("markReviewedHint")}</p>
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                status.type === "ok"
                  ? "border-green-500/30 bg-green-500/10 text-green-500"
                  : "border-red-500/30 bg-red-500/10 text-red-500"
              }`}
            >
              {status.type === "ok" ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {status.msg}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {tCommon("close")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                {tCommon("loading")}
              </>
            ) : (
              t("saveFeedback")
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default ExamReviewModal;
