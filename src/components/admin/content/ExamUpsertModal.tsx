"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import type { ExamRow, ExamCategoryRow } from "@/types";

interface ExamUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam?: ExamRow;
  categories?: ExamCategoryRow[];
  studentOptions?: { id: string; name: string; email: string }[];
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onSaved?: () => void;
}

export function ExamUpsertModal({
  isOpen,
  onClose,
  exam,
  categories = [],
  studentOptions = [],
  onSubmit,
  onSaved,
}: ExamUpsertModalProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const [form, setForm] = useState({
    id: exam?.id,
    user_id: exam?.user_id ?? "",
    category_id: exam?.category_id ?? "",
    title: exam?.title ?? "",
    exam_date: exam?.exam_date ?? new Date().toISOString().slice(0, 10),
    lab_name: exam?.lab_name ?? "",
    description: exam?.description ?? "",
    file_name: exam?.file_name ?? "",
  });

  useEffect(() => {
    if (!isOpen) return;
    if (exam) {
      setForm({
        id: exam.id,
        user_id: exam.user_id ?? "",
        category_id: exam.category_id ?? "",
        title: exam.title ?? "",
        exam_date: exam.exam_date ?? new Date().toISOString().slice(0, 10),
        lab_name: exam.lab_name ?? "",
        description: exam.description ?? "",
        file_name: exam.file_name ?? "",
      });
    } else {
      setForm({
        id: undefined,
        user_id: "",
        category_id: "",
        title: "",
        exam_date: new Date().toISOString().slice(0, 10),
        lab_name: "",
        description: "",
        file_name: "",
      });
    }
  }, [isOpen, exam]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload: Record<string, any> = {
        ...form,
        category_id: form.category_id || null,
        lab_name: form.lab_name || null,
        description: form.description || null,
        file_name: form.file_name || null,
      };
      if (!payload.id) delete payload.id;
      if (onSubmit) await onSubmit(payload);
      onSaved?.();
    });
  };

  const titleCreate = label("Criar Exame", "Create Exam");
  const titleEdit = label("Editar Exame", "Edit Exam");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{exam ? titleEdit : titleCreate}</ModalTitle>
        <ModalClose onClick={onClose} />
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Aluno", "Student")}
            </label>
            <Select
              value={form.user_id}
              onChange={(e) => update("user_id", e.target.value)}
              required
            >
              <option value="">-- {label("Selecione", "Select")} --</option>
              {studentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Título", "Title")}
            </label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder={label("Hemograma completo", "Complete blood count")}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Categoria", "Category")}
              </label>
              <Select
                value={form.category_id}
                onChange={(e) => update("category_id", e.target.value)}
              >
                <option value="">-- {label("Selecione", "Select")} --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "pt-BR" ? c.name_pt : c.name_en}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {label("Data do exame", "Exam date")}
              </label>
              <Input
                type="date"
                value={form.exam_date}
                onChange={(e) => update("exam_date", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Laboratório", "Lab")}
            </label>
            <Input
              value={form.lab_name}
              onChange={(e) => update("lab_name", e.target.value)}
              placeholder={label("Lab Central", "Central Lab")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Descrição", "Description")}
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder={label("Observações sobre o exame...", "Notes about the exam...")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {label("Arquivo (nome)", "File (name)")}
            </label>
            <Input
              value={form.file_name}
              onChange={(e) => update("file_name", e.target.value)}
              placeholder="exame.pdf"
            />
          </div>
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
            {isPending ? t("loading") : t("save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default ExamUpsertModal;
