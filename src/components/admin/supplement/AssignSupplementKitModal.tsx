"use client";
import { useAsyncTransition } from "@/hooks/useAsyncTransition";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/Input";
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
import { syncSupplementKitStudentsAction } from "@/app/actions/content";
import type { SupplementKitWithItems } from "@/types";

export interface AssignStudentOption {
  id: string;
  name: string;
  email: string;
}

interface AssignSupplementKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit: SupplementKitWithItems;
  students: AssignStudentOption[];
  assignedStudentIds: string[];
  fingerprint?: string;
  onSaved?: () => void;
}

function todayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AssignSupplementKitModal({
  isOpen,
  onClose,
  kit,
  students,
  assignedStudentIds,
  fingerprint,
  onSaved,
}: AssignSupplementKitModalProps) {
  const t = useTranslations("adminSupplementKits");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useAsyncTransition();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(todayDate());
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const assignedKey = assignedStudentIds.join(",");

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSearch("");
    setSelected(assignedStudentIds);
    setStartDate(todayDate());
    setEndDate("");
    setNotes("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, kit.id, assignedKey]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        (s.name ?? "").toLowerCase().includes(term) ||
        (s.email ?? "").toLowerCase().includes(term),
    );
  }, [students, search]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return Array.from(next);
    });
  }

  function clearSelection() {
    setSelected([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const result = await syncSupplementKitStudentsAction({
          expected_fingerprint: fingerprint,
          kit_id: kit.id,
          student_ids: selected,
          start_date: startDate || null,
          end_date: endDate || null,
          notes: notes || null,
        });
        if (result?.success) {
          onSaved?.();
          onClose();
        } else {
          setErrorMsg(result?.message ?? t("assignError"));
        }
      } catch (err: any) {
        setErrorMsg(err?.message ?? t("assignError"));
      }
    });
  }

  const kitName = locale === "pt-BR" ? kit.name_pt : kit.name_en;

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
          <ModalTitle>{t("assignTitle")}</ModalTitle>
          <p className="text-sm text-text-secondary mt-1">{kitName}</p>
        </div>
        <ModalClose disabled={isPending} onClick={onClose} />
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <p className="text-sm text-text-secondary">{t("assignSubtitle")}</p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <Input
                placeholder={t("studentSearchPlaceholder")}
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={selectAllFiltered}
              >
                {t("selectAll")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                {t("clearSelection")}
              </Button>
              <Badge variant="default">
                <Users size={12} className="mr-1" />
                {selected.length}
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            {students.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">
                {t("noStudents")}
              </p>
            ) : filteredStudents.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">
                {t("noStudentsFound")}
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {filteredStudents.map((student) => {
                  const checked = selectedSet.has(student.id);
                  return (
                    <label
                      key={student.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        checked
                          ? "bg-primary/10"
                          : "hover:bg-surface-secondary/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(student.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-text truncate">
                          {student.name || student.email}
                        </span>
                        {student.email && (
                          <span className="block text-xs text-text-secondary truncate">
                            {student.email}
                          </span>
                        )}
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
                {t("startDate")}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("endDate")}
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
              {t("notes")}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("notes")}
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
            {isPending ? tCommon("loading") : t("saveAssignments")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default AssignSupplementKitModal;
