"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import type { WorkoutKitRow, WorkoutProgramRow } from "@/types";
import { assignWorkoutKitToStudentAction } from "@/app/actions/workouts";

interface AssignWorkoutKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  student_id: string;
  student_label?: string;
  kits?: WorkoutKitRow[];
  programs?: WorkoutProgramRow[];
  onSuccess?: () => void | Promise<void>;
}

function todayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type AssignMode = "kit" | "program";

export function AssignWorkoutKitModal({
  isOpen,
  onClose,
  student_id,
  student_label,
  kits = [],
  programs = [],
  onSuccess,
}: AssignWorkoutKitModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [mode, setMode] = useState<AssignMode>("kit");
  const [form, setForm] = useState({
    kit_id: "" as string,
    program_id: "" as string,
    start_date: todayDate(),
    end_date: "" as string,
    notes: "" as string,
  });

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setMode("kit");
    setForm({
      kit_id: "",
      program_id: "",
      start_date: todayDate(),
      end_date: "",
      notes: "",
    });
  }, [isOpen, student_id]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const payload: Record<string, any> = {
          student_id,
          kit_id: mode === "kit" && form.kit_id ? form.kit_id : null,
          program_id: mode === "program" && form.program_id ? form.program_id : null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          notes: form.notes || null,
        };
        const result = await assignWorkoutKitToStudentAction(payload as any);
        if (result?.success) {
          if (onSuccess) await onSuccess();
          onClose();
        } else {
          setErrorMsg(result?.message ?? label("Erro ao atribuir.", "Assign error."));
        }
      } catch (e: any) {
        setErrorMsg(e?.message ?? label("Erro inesperado.", "Unexpected error."));
      }
    });
  };

  const title = label("Atribuir Treino ao Aluno", "Assign Workout to Student");
  const warnText = label(
    "Atencao: O aluno pode ter no maximo 6 treinos ativos simultaneos.",
    "Warning: A student can have a maximum of 6 active workouts at the same time."
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <div>
          <ModalTitle>{title}</ModalTitle>
          {student_label && (
            <p className="text-sm text-text-secondary mt-1">{student_label}</p>
          )}
        </div>
        <ModalClose onClick={onClose} />
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 flex gap-3 items-start">
            <AlertTriangle size={20} className="text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-text leading-relaxed">{warnText}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("ID do Aluno (somente leitura)", "Student ID (read only)")}
            </label>
            <Input value={student_id} readOnly disabled />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-text">
              {label("Tipo de Atribuicao", "Assignment Type")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("kit")}
                className={`h-11 rounded-xl border font-medium transition-all ${
                  mode === "kit"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-text hover:border-primary/50"
                }`}
              >
                {label("Kit de Treinos", "Workout Kit")}
              </button>
              <button
                type="button"
                onClick={() => setMode("program")}
                className={`h-11 rounded-xl border font-medium transition-all ${
                  mode === "program"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-text hover:border-primary/50"
                }`}
              >
                {label("Programa Isolado", "Single Program")}
              </button>
            </div>
          </div>

          {mode === "kit" ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Kit", "Kit")}
              </label>
              <Select
                value={form.kit_id}
                onChange={(e) => update("kit_id", e.target.value)}
                required
              >
                <option value="">-- {label("Selecione um kit", "Select a kit")} --</option>
                {kits.map((k) => (
                  <option key={k.id} value={k.id}>
                    {locale === "pt-BR" ? k.name_pt : k.name_en}
                    {k.difficulty ? (
                      <span>
                        {" "}
                        ({locale === "pt-BR" ? { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" }[k.difficulty] : k.difficulty})
                      </span>
                    ) : null}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Programa", "Program")}
              </label>
              <Select
                value={form.program_id}
                onChange={(e) => update("program_id", e.target.value)}
                required
              >
                <option value="">-- {label("Selecione um programa", "Select a program")} --</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {locale === "pt-BR" ? p.title_pt : p.title_en}
                    {p.difficulty ? (
                      <span>
                        {" "}
                        ({locale === "pt-BR" ? { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" }[p.difficulty] : p.difficulty})
                      </span>
                    ) : null}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Data de Inicio", "Start Date")}
              </label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Data de Fim (opcional)", "End Date (optional)")}
              </label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => update("end_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Observacoes", "Notes")}
            </label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              placeholder={label(
                "Instrucoes adicionais para o aluno...",
                "Additional instructions for the student..."
              )}
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
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("loading") : t("confirm")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default AssignWorkoutKitModal;
