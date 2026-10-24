"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  FileText,
  History as HistoryIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  deleteTemplateAction,
  saveTemplateAction,
  sendNotificationAction,
} from "@/app/actions/notifications";
import { NOTIFICATION_TYPES } from "@/schemas/notifications";
import type {
  AdminNotificationRow,
  NotificationTemplateRow,
} from "@/services/NotificationService";
import type { NotificationTypeT } from "@/lib/supabase/types";

interface AdminNotificationsClientProps {
  history: AdminNotificationRow[];
  historyTotal: number;
  templates: NotificationTemplateRow[];
  studentCount: number;
}

type Feedback = { type: "success" | "error"; text: string } | null;

interface ComposeForm {
  type: NotificationTypeT;
  title_pt: string;
  title_en: string;
  body_pt: string;
  body_en: string;
  url: string;
}

interface TemplateForm {
  id?: string;
  slug: string;
  type: NotificationTypeT;
  title_pt: string;
  title_en: string;
  body_pt: string;
  body_en: string;
  default_url: string;
}

const EMPTY_COMPOSE: ComposeForm = {
  type: "system",
  title_pt: "",
  title_en: "",
  body_pt: "",
  body_en: "",
  url: "",
};

const EMPTY_TEMPLATE: TemplateForm = {
  slug: "",
  type: "system",
  title_pt: "",
  title_en: "",
  body_pt: "",
  body_en: "",
  default_url: "",
};

export function AdminNotificationsClient({
  history,
  historyTotal,
  templates,
  studentCount,
}: AdminNotificationsClientProps) {
  const t = useTranslations("adminNotifications");
  const locale = useLocale();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [compose, setCompose] = useState<ComposeForm>(EMPTY_COMPOSE);
  const [composeFeedback, setComposeFeedback] = useState<Feedback>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [templateDraft, setTemplateDraft] = useState<TemplateForm | null>(null);
  const [templateFeedback, setTemplateFeedback] = useState<Feedback>(null);

  const typeLabel = (type: string) => t(`types.${type}`);

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    return history.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (!term) return true;
      return (
        (row.recipient_name ?? "").toLowerCase().includes(term) ||
        row.title.toLowerCase().includes(term) ||
        row.body.toLowerCase().includes(term)
      );
    });
  }, [history, search, typeFilter]);

  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setCompose({
      type: template.type,
      title_pt: template.title_pt,
      title_en: template.title_en,
      body_pt: template.body_pt,
      body_en: template.body_en,
      url: template.default_url ?? "",
    });
    setComposeFeedback(null);
  };

  const handleSend = () => {
    setComposeFeedback(null);
    startTransition(async () => {
      const result = await sendNotificationAction(compose);
      if (result.success) {
        setComposeFeedback({
          type: "success",
          text: t("sent", { count: result.sent }),
        });
        setCompose(EMPTY_COMPOSE);
        router.refresh();
      } else {
        setComposeFeedback({ type: "error", text: result.message ?? t("error") });
      }
    });
  };

  const startNewTemplate = () => {
    setTemplateDraft({ ...EMPTY_TEMPLATE });
    setTemplateFeedback(null);
  };

  const startEditTemplate = (template: NotificationTemplateRow) => {
    setTemplateDraft({
      id: template.id,
      slug: template.slug,
      type: template.type,
      title_pt: template.title_pt,
      title_en: template.title_en,
      body_pt: template.body_pt,
      body_en: template.body_en,
      default_url: template.default_url ?? "",
    });
    setTemplateFeedback(null);
  };

  const handleSaveTemplate = () => {
    if (!templateDraft) return;
    setTemplateFeedback(null);
    startTransition(async () => {
      const result = await saveTemplateAction(templateDraft);
      if (result.success) {
        setTemplateFeedback({ type: "success", text: t("saved") });
        setTemplateDraft(null);
        router.refresh();
      } else {
        setTemplateFeedback({ type: "error", text: result.message ?? t("error") });
      }
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplateFeedback(null);
    startTransition(async () => {
      const result = await deleteTemplateAction(templateId);
      if (result.success) {
        if (templateDraft?.id === templateId) setTemplateDraft(null);
        router.refresh();
      } else {
        setTemplateFeedback({ type: "error", text: result.message ?? t("error") });
      }
    });
  };

  const canSend =
    compose.title_pt.trim() &&
    compose.title_en.trim() &&
    compose.body_pt.trim() &&
    compose.body_en.trim() &&
    studentCount > 0;

  return (
    <Tabs defaultValue="compose" className="w-full">
      <TabsList>
        <TabsTrigger value="compose">
          <Send size={16} className="mr-2" />
          {t("tabCompose")}
        </TabsTrigger>
        <TabsTrigger value="history">
          <HistoryIcon size={16} className="mr-2" />
          {t("tabHistory")}
        </TabsTrigger>
        <TabsTrigger value="templates">
          <FileText size={16} className="mr-2" />
          {t("tabTemplates")}
        </TabsTrigger>
      </TabsList>

      {/* Enviar */}
      <TabsContent value="compose">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t("composeTitle")}</CardTitle>
                <CardDescription>{t("composeDesc")}</CardDescription>
              </div>
              <Badge variant="outline">{t("recipients", { count: studentCount })}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">{t("loadTemplate")}</label>
                <Select
                  value=""
                  onChange={(e) => applyTemplate(e.target.value)}
                  disabled={isPending}
                >
                  <option value="">{t("loadTemplatePlaceholder")}</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title_pt}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">{t("type")}</label>
                <Select
                  value={compose.type}
                  onChange={(e) =>
                    setCompose((prev) => ({
                      ...prev,
                      type: e.target.value as NotificationTypeT,
                    }))
                  }
                  disabled={isPending}
                >
                  {NOTIFICATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {typeLabel(type)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">{t("url")}</label>
                <Input
                  value={compose.url}
                  onChange={(e) => setCompose((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder={t("urlPlaceholder")}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">{t("titlePt")}</label>
                <Input
                  value={compose.title_pt}
                  onChange={(e) => setCompose((prev) => ({ ...prev, title_pt: e.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">{t("titleEn")}</label>
                <Input
                  value={compose.title_en}
                  onChange={(e) => setCompose((prev) => ({ ...prev, title_en: e.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">{t("bodyPt")}</label>
                <Textarea
                  rows={4}
                  value={compose.body_pt}
                  onChange={(e) => setCompose((prev) => ({ ...prev, body_pt: e.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">{t("bodyEn")}</label>
                <Textarea
                  rows={4}
                  value={compose.body_en}
                  onChange={(e) => setCompose((prev) => ({ ...prev, body_en: e.target.value }))}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button variant="primary" onClick={handleSend} disabled={isPending || !canSend}>
                {isPending ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Send size={16} className="mr-2" />
                )}
                {isPending ? t("sending") : t("send")}
              </Button>
              {composeFeedback && (
                <span
                  className={`inline-flex items-center gap-2 text-sm ${
                    composeFeedback.type === "success" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {composeFeedback.type === "success" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  {composeFeedback.text}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Histórico */}
      <TabsContent value="history">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>{t("historyTitle")}</CardTitle>
                <CardDescription>{t("historyDesc")}</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="pl-9 sm:w-64"
                  />
                </div>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="sm:w-40"
                >
                  <option value="all">{t("allTypes")}</option>
                  {NOTIFICATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {typeLabel(type)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <EmptyState
                className="py-16"
                icon={<Bell size={40} className="text-text-secondary" />}
                title={t("emptyTitle")}
                description={t("emptyDesc")}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("colRecipient")}</TableHead>
                      <TableHead>{t("colType")}</TableHead>
                      <TableHead>{t("colTitle")}</TableHead>
                      <TableHead>{t("colStatus")}</TableHead>
                      <TableHead>{t("colDate")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-text">
                          {row.recipient_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{typeLabel(row.type)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-text-secondary">
                          {row.title}
                        </TableCell>
                        <TableCell>
                          {!row.sent_at ? (
                            <Badge variant="warning">{t("statusScheduled")}</Badge>
                          ) : row.read_at ? (
                            <Badge variant="success">{t("statusRead")}</Badge>
                          ) : (
                            <Badge variant="default">{t("statusUnread")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {formatDate(row.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-4 text-xs text-text-secondary">
                  {t("showingCount", {
                    count: filteredHistory.length,
                    total: historyTotal,
                  })}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Templates */}
      <TabsContent value="templates">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>{t("templatesTitle")}</CardTitle>
                  <CardDescription>{t("templatesDesc")}</CardDescription>
                </div>
                <Button variant="secondary" size="sm" onClick={startNewTemplate}>
                  <Plus size={16} className="mr-2" />
                  {t("newTemplate")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <EmptyState
                  className="py-12"
                  icon={<FileText size={36} className="text-text-secondary" />}
                  title={t("templatesEmpty")}
                />
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-secondary/30 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {template.title_pt}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {typeLabel(template.type)} · {template.slug}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditTemplate(template)}
                          aria-label={t("editTemplate")}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={isPending}
                          aria-label={t("delete")}
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {templateDraft && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {templateDraft.id ? t("editTemplate") : t("newTemplate")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">{t("slug")}</label>
                    <Input
                      value={templateDraft.slug}
                      onChange={(e) =>
                        setTemplateDraft({ ...templateDraft, slug: e.target.value })
                      }
                      placeholder="boas-vindas"
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">{t("type")}</label>
                    <Select
                      value={templateDraft.type}
                      onChange={(e) =>
                        setTemplateDraft({
                          ...templateDraft,
                          type: e.target.value as NotificationTypeT,
                        })
                      }
                      disabled={isPending}
                    >
                      {NOTIFICATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {typeLabel(type)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">{t("titlePt")}</label>
                    <Input
                      value={templateDraft.title_pt}
                      onChange={(e) =>
                        setTemplateDraft({ ...templateDraft, title_pt: e.target.value })
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">{t("titleEn")}</label>
                    <Input
                      value={templateDraft.title_en}
                      onChange={(e) =>
                        setTemplateDraft({ ...templateDraft, title_en: e.target.value })
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">{t("bodyPt")}</label>
                    <Textarea
                      rows={3}
                      value={templateDraft.body_pt}
                      onChange={(e) =>
                        setTemplateDraft({ ...templateDraft, body_pt: e.target.value })
                      }
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text">{t("bodyEn")}</label>
                    <Textarea
                      rows={3}
                      value={templateDraft.body_en}
                      onChange={(e) =>
                        setTemplateDraft({ ...templateDraft, body_en: e.target.value })
                      }
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text">{t("defaultUrl")}</label>
                  <Input
                    value={templateDraft.default_url}
                    onChange={(e) =>
                      setTemplateDraft({ ...templateDraft, default_url: e.target.value })
                    }
                    placeholder={t("urlPlaceholder")}
                    disabled={isPending}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={handleSaveTemplate}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} className="mr-2" />
                    )}
                    {isPending ? t("saving") : t("save")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setTemplateDraft(null)}
                    disabled={isPending}
                  >
                    {t("cancel")}
                  </Button>
                  {templateFeedback && (
                    <span
                      className={`inline-flex items-center gap-2 text-sm ${
                        templateFeedback.type === "success"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {templateFeedback.type === "success" ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      {templateFeedback.text}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default AdminNotificationsClient;
