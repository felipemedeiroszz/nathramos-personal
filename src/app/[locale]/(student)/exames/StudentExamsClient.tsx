"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Cloud,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import {
  deleteMyExamAction,
  getExamFileUrlAction,
  uploadExamAction,
} from "@/app/actions/exams";
import type { ExamCategoryRow, ExamRow } from "@/types";

interface StudentExamsClientProps {
  locale: string;
  exams: ExamRow[];
  categories: ExamCategoryRow[];
}

export function StudentExamsClient({
  locale,
  exams,
  categories,
}: StudentExamsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString(
        locale === "pt-BR" ? "pt-BR" : "en-US",
      );
    } catch {
      return value;
    }
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return "-";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const pendingReview = exams.filter((e) => !e.coach_feedback).length;
  const reviewedCount = exams.filter((e) => !!e.coach_feedback).length;
  const lastExam = exams[0];

  function pickFile(selected: File | null) {
    if (!selected) return;
    if (
      selected.type &&
      !selected.type.startsWith("application/pdf") &&
      !selected.type.startsWith("image/")
    ) {
      setStatus({ type: "err", msg: "Envie um arquivo PDF ou imagem." });
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setStatus({ type: "err", msg: "Arquivo maior que 20MB." });
      return;
    }
    setStatus(null);
    setFile(selected);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!file) {
      setStatus({ type: "err", msg: "Selecione um arquivo para envio." });
      return;
    }
    formData.set("file", file);

    startTransition(async () => {
      const res = await uploadExamAction(formData);
      if (res.success) {
        setStatus({ type: "ok", msg: "Exame enviado com sucesso!" });
        setFile(null);
        formRef.current?.reset();
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } else {
        setStatus({
          type: "err",
          msg:
            res.message === "validation"
              ? "Preencha título e data do exame."
              : res.message,
        });
      }
    });
  }

  async function handleDownload(exam: ExamRow) {
    setBusyId(exam.id);
    try {
      const res = await getExamFileUrlAction(exam.id);
      if (res.success) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setStatus({ type: "err", msg: res.message });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(exam: ExamRow) {
    setBusyId(exam.id);
    try {
      const res = await deleteMyExamAction(exam.id);
      if (!res.success) {
        setStatus({ type: "err", msg: res.message });
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      <section className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2 xl:col-span-3 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resumo geral</CardTitle>
                <CardDescription>Panorama dos seus exames</CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <FileText size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Total
                  </span>
                </div>
                <div className="text-2xl font-bold text-text">
                  {exams.length}
                </div>
                <div className="text-xs text-text-secondary">
                  exames enviados
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Último
                  </span>
                </div>
                <div className="text-xl font-bold text-text">
                  {lastExam ? formatDate(lastExam.exam_date) : "-"}
                </div>
                <div className="text-xs text-text-secondary">
                  {lastExam?.title ?? "Nenhum exame"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <MessageSquare size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Revisados
                  </span>
                </div>
                <div className="text-xl font-bold text-text">
                  {reviewedCount}
                </div>
                <div className="text-xs text-text-secondary">
                  {pendingReview} aguardando parecer
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <CheckCircle size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Status
                  </span>
                </div>
                <div className="pt-1">
                  {pendingReview === 0 && exams.length > 0 ? (
                    <Badge variant="success" className="px-3 py-1 text-xs">
                      <CheckCircle size={12} className="mr-1" />
                      Todos revisados
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="px-3 py-1 text-xs">
                      <Clock size={12} className="mr-1" />
                      {pendingReview} pendente{pendingReview === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload de novo exame</CardTitle>
                <CardDescription>
                  Informe os dados e anexe o arquivo (PDF ou imagem até 20MB)
                </CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Upload size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text">
                    Título do exame
                  </label>
                  <Input
                    name="title"
                    placeholder="Hemograma completo"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text">
                    Data do exame
                  </label>
                  <Input
                    name="exam_date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text">
                    Categoria
                  </label>
                  <Select name="category_id" defaultValue="">
                    <option value="">-- Selecione --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {locale === "pt-BR" ? c.name_pt : c.name_en}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text">
                    Laboratório
                  </label>
                  <Input name="lab_name" placeholder="Lab Central" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">
                  Observações
                </label>
                <Textarea
                  name="description"
                  rows={3}
                  placeholder="Alguma observação sobre o exame..."
                />
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className={`rounded-xl border-2 border-dashed transition-colors ${
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface-secondary/20"
                }`}
              >
                <label className="flex flex-col items-center justify-center px-6 py-10 cursor-pointer text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Cloud size={32} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-base md:text-lg font-semibold text-text">
                      {file
                        ? file.name
                        : "Arraste o arquivo ou clique para selecionar"}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {file
                        ? formatSize(file.size)
                        : "Aceita PDF ou imagem até 20MB"}
                    </p>
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {status && (
                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    status.type === "ok"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-text/25 bg-text/[0.08] text-text"
                  }`}
                >
                  {status.type === "ok" ? (
                    <CheckCircle size={16} />
                  ) : (
                    <XCircle size={16} />
                  )}
                  {status.msg}
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-text-secondary">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p>
                  Após o envio, seu treinador poderá visualizar o arquivo e
                  deixar um parecer.
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending || !file}>
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" />
                      Enviar exame
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Meus exames</CardTitle>
                <CardDescription>
                  {exams.length} arquivo{exams.length === 1 ? "" : "s"} enviado
                  {exams.length === 1 ? "" : "s"}
                </CardDescription>
              </div>
              <div className="w-11 h-11 rounded-xl bg-surface-secondary text-text-secondary flex items-center justify-center">
                <FileText size={22} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {exams.length === 0 ? (
              <EmptyState
                icon={<FileText size={28} className="text-text-secondary" />}
                title="Nenhum exame enviado"
                description="Envie seu primeiro exame usando o formulário acima."
              />
            ) : (
              exams.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                          {formatDate(exam.exam_date)}
                        </span>
                        <span className="font-semibold text-text">
                          {exam.title}
                        </span>
                        {exam.coach_feedback ? (
                          <Badge variant="success">
                            <CheckCircle size={12} className="mr-1" />
                            Revisado
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            <Clock size={12} className="mr-1" />
                            Aguardando parecer
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                        {exam.lab_name && <span>{exam.lab_name}</span>}
                        {exam.file_name && (
                          <span>
                            {exam.file_name} ·{" "}
                            {formatSize(exam.file_size_bytes)}
                          </span>
                        )}
                      </div>
                      {exam.description && (
                        <p className="text-xs text-text-secondary">
                          {exam.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {exam.file_bucket_path && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownload(exam)}
                          disabled={busyId === exam.id}
                        >
                          {busyId === exam.id ? (
                            <Loader2
                              size={16}
                              className="mr-1.5 animate-spin"
                            />
                          ) : (
                            <Download size={16} className="mr-1.5" />
                          )}
                          Baixar arquivo
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-text hover:text-text"
                        onClick={() => handleDelete(exam)}
                        disabled={busyId === exam.id}
                      >
                        <Trash2 size={16} className="mr-1.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg border p-3 text-sm whitespace-pre-line ${
                      exam.coach_feedback
                        ? "border-primary/30 bg-primary/5 text-text"
                        : "border-border bg-surface-secondary/30 text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wide">
                      <MessageSquare size={12} />
                      Parecer do professor
                    </div>
                    {exam.coach_feedback ||
                      "Ainda não há parecer para este exame."}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default StudentExamsClient;
