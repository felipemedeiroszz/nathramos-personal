"use client";
import { useAsyncTransition } from "@/hooks/useAsyncTransition";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Link2, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  syncStudentDietKitsAction,
  syncStudentSupplementKitsAction,
} from "@/app/actions/content";

export interface StudentKitOption {
  id: string;
  namePt: string;
  nameEn: string;
}

export interface StudentKitAssignment {
  id: string;
  kitId: string;
  namePt: string;
  nameEn: string;
  status: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  assignedAt: string;
}

interface StudentKitsPanelProps {
  studentId: string;
  fingerprint?: string;
  kind: "supplement" | "diet";
  kits: StudentKitOption[];
  assignments: StudentKitAssignment[];
}

function todayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const datePart = value.length > 10 ? value.slice(0, 10) : value;
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function StudentKitsPanel({
  studentId,
  fingerprint,
  kind,
  kits,
  assignments,
}: StudentKitsPanelProps) {
  const t = useTranslations("studentKits");
  const locale = useLocale();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const title = kind === "supplement" ? t("titleSupplement") : t("titleDiet");
  const emptyTitle =
    kind === "supplement" ? t("emptySupplement") : t("emptyDiet");

  function statusBadge(status: string) {
    if (status === "active")
      return { label: t("active"), variant: "success" as const };
    if (status === "completed")
      return { label: t("completed"), variant: "default" as const };
    return { label: t("archived"), variant: "outline" as const };
  }

  function nameOf(a: StudentKitAssignment) {
    return locale === "pt-BR" ? a.namePt : a.nameEn;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <p className="text-sm text-text-secondary">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {assignments.length} {t("count")}
          </Badge>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Link2 size={16} className="mr-2" />
            {t("assignButton")}
          </Button>
        </div>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          className="py-12"
          icon={<Link2 size={36} className="text-text-secondary" />}
          title={emptyTitle}
          description={t("emptyDesc")}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("kit")}</TableHead>
                <TableHead>{t("colStart")}</TableHead>
                <TableHead>{t("colEnd")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("colNotes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => {
                const badge = statusBadge(a.status);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-semibold text-text">
                      {nameOf(a)}
                    </TableCell>
                    <TableCell>{formatDate(a.startDate)}</TableCell>
                    <TableCell>{formatDate(a.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary max-w-[280px] truncate">
                      {a.notes || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {modalOpen && (
        <StudentKitsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          studentId={studentId}
          fingerprint={fingerprint}
          kind={kind}
          kits={kits}
          assignedKitIds={assignments
            .filter((a) => a.status === "active")
            .map((a) => a.kitId)}
          onSaved={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

interface StudentKitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  fingerprint?: string;
  kind: "supplement" | "diet";
  kits: StudentKitOption[];
  assignedKitIds: string[];
  onSaved: () => void;
}

function StudentKitsModal({
  isOpen,
  onClose,
  studentId,
  fingerprint,
  kind,
  kits,
  assignedKitIds,
  onSaved,
}: StudentKitsModalProps) {
  const t = useTranslations("studentKits");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useAsyncTransition();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(todayDate());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const assignedKey = assignedKitIds.join(",");

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSearch("");
    setSelected(assignedKitIds);
    setStartDate(todayDate());
    setEndDate("");
    setNotes("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, assignedKey]);

  const filteredKits = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return kits;
    return kits.filter(
      (k) =>
        k.namePt.toLowerCase().includes(term) ||
        k.nameEn.toLowerCase().includes(term),
    );
  }, [kits, search]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const payload = {
          expected_fingerprint: fingerprint,
          student_id: studentId,
          kit_ids: selected,
          start_date: startDate || null,
          end_date: endDate || null,
          notes: notes || null,
        };
        const result =
          kind === "supplement"
            ? await syncStudentSupplementKitsAction(payload)
            : await syncStudentDietKitsAction(payload);
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
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) onClose();
      }}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <div>
          <ModalTitle>
            {kind === "supplement" ? t("titleSupplement") : t("titleDiet")}
          </ModalTitle>
        </div>
        <ModalClose disabled={isPending} onClick={onClose} />
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <p className="text-sm text-text-secondary">{t("assignSubtitle")}</p>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <Input
              placeholder={t("searchPlaceholder")}
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            {kits.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">{t("noKits")}</p>
            ) : filteredKits.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">
                {t("noKitsFound")}
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {filteredKits.map((kit) => {
                  const checked = selectedSet.has(kit.id);
                  return (
                    <label
                      key={kit.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        checked
                          ? "bg-primary/10"
                          : "hover:bg-surface-secondary/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(kit.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                      />
                      <span className="flex-1 min-w-0 text-sm font-medium text-text truncate">
                        {locale === "pt-BR" ? kit.namePt : kit.nameEn}
                      </span>
                      {checked && (
                        <Check size={16} className="text-primary shrink-0" />
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("colStart")}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("colEnd")}
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {t("colNotes")}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("colNotes")}
            />
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              {errorMsg}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? tCommon("loading") : t("save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default StudentKitsPanel;
