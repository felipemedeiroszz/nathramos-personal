"use client";
import { useAsyncTransition } from "@/hooks/useAsyncTransition";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
import {
  CheckCircle,
  Loader2,
  Pill,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { saveSupplementKitAction } from "@/app/actions/content";
import type { SupplementKitWithItems, SupplementRow } from "@/types";

interface KitItemDraft {
  id?: string;
  supplement_id: string;
  dosage: string;
  dosage_unit: string;
  frequency_per_day: number;
  times_of_day: string;
  notes_pt: string;
  notes_en: string;
}

interface SupplementKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit?: SupplementKitWithItems | null;
  supplements?: SupplementRow[];
  userId?: string;
  onSaved?: () => void;
}

const emptyForm = {
  id: undefined as string | undefined,
  name_pt: "",
  name_en: "",
  goal_pt: "",
  goal_en: "",
  short_desc_pt: "",
  short_desc_en: "",
  description_pt: "",
  description_en: "",
  cover_image_url: "",
  tags: "",
  is_published: true,
  is_featured: false,
};

export function SupplementKitModal({
  isOpen,
  onClose,
  kit,
  supplements = [],
  onSaved,
}: SupplementKitModalProps) {
  const t = useTranslations("adminSupplementKits");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useAsyncTransition();

  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<KitItemDraft[]>([]);
  const [selectedSupplement, setSelectedSupplement] = useState("");
  const [status, setStatus] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    setSelectedSupplement("");
    if (kit) {
      setForm({
        id: kit.id,
        name_pt: kit.name_pt ?? "",
        name_en: kit.name_en ?? "",
        goal_pt: kit.goal_pt ?? "",
        goal_en: kit.goal_en ?? "",
        short_desc_pt: kit.short_desc_pt ?? "",
        short_desc_en: kit.short_desc_en ?? "",
        description_pt: kit.description_pt ?? "",
        description_en: kit.description_en ?? "",
        cover_image_url: kit.cover_image_url ?? "",
        tags: (kit.tags ?? []).join(", "),
        is_published: kit.is_published,
        is_featured: kit.is_featured,
      });
      setItems(
        (kit.items ?? []).map((item) => ({
          id: item.id,
          supplement_id: item.supplement_id ?? "",
          dosage: item.dosage != null ? String(item.dosage) : "",
          dosage_unit: item.dosage_unit ?? "",
          frequency_per_day: item.frequency_per_day ?? 1,
          times_of_day: (item.times_of_day ?? []).join(", "),
          notes_pt: item.notes_pt ?? "",
          notes_en: item.notes_en ?? "",
        })),
      );
    } else {
      setForm(emptyForm);
      setItems([]);
    }
  }, [isOpen, kit]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const supplementLabel = (s?: SupplementRow | null) => {
    if (!s) return "";
    return locale === "pt-BR" ? s.name_pt : s.name_en;
  };

  function addItem() {
    if (!selectedSupplement) return;
    if (items.some((i) => i.supplement_id === selectedSupplement)) return;
    setItems((prev) => [
      ...prev,
      {
        supplement_id: selectedSupplement,
        dosage: "",
        dosage_unit: "",
        frequency_per_day: 1,
        times_of_day: "",
        notes_pt: "",
        notes_en: "",
      },
    ]);
    setSelectedSupplement("");
  }

  function updateItem(index: number, key: keyof KitItemDraft, value: any) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const res = await saveSupplementKitAction({
        kit: {
          revision: kit?.revision,
          id: form.id,
          name_pt: form.name_pt,
          name_en: form.name_en,
          goal_pt: form.goal_pt || null,
          goal_en: form.goal_en || null,
          short_desc_pt: form.short_desc_pt || null,
          short_desc_en: form.short_desc_en || null,
          description_pt: form.description_pt || null,
          description_en: form.description_en || null,
          cover_image_url: form.cover_image_url || null,
          tags,
          is_published: form.is_published,
          is_featured: form.is_featured,
        },
        items: items.map((item, index) => ({
          id: item.id,
          supplement_id: item.supplement_id,
          dosage: item.dosage ? Number(item.dosage) : null,
          dosage_unit: item.dosage_unit || null,
          frequency_per_day: Number(item.frequency_per_day) || 1,
          times_of_day: item.times_of_day
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          notes_pt: item.notes_pt || null,
          notes_en: item.notes_en || null,
          order_index: index,
        })),
      });

      if (res.success) {
        setStatus({ type: "ok", msg: t("saved") });
        onSaved?.();
      } else {
        setStatus({ type: "err", msg: res.message || t("saveError") });
      }
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) onClose();
      }}
      className="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>{kit ? t("editKit") : t("newKit")}</ModalTitle>
        <ModalClose disabled={isPending} onClick={onClose} />
      </ModalHeader>
      {kit && (
        <a
          className="block mb-3 text-sm text-primary underline"
          href={`/${locale}/admin/historico?kind=supplement_kits&record=${kit.id}`}
        >
          {locale === "en-US"
            ? "Compare saved versions"
            : "Comparar versões salvas"}
        </a>
      )}
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("namePt")}
              </label>
              <Input
                value={form.name_pt}
                onChange={(e) => update("name_pt", e.target.value)}
                placeholder={t("summarize")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("nameEn")}
              </label>
              <Input
                value={form.name_en}
                onChange={(e) => update("name_en", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("goalPt")}
              </label>
              <Input
                value={form.goal_pt}
                onChange={(e) => update("goal_pt", e.target.value)}
                placeholder="Emagrecimento"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("goalEn")}
              </label>
              <Input
                value={form.goal_en}
                onChange={(e) => update("goal_en", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("shortDescPt")}
              </label>
              <Input
                value={form.short_desc_pt}
                onChange={(e) => update("short_desc_pt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("shortDescEn")}
              </label>
              <Input
                value={form.short_desc_en}
                onChange={(e) => update("short_desc_en", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {t("descPt")}
            </label>
            <Textarea
              value={form.description_pt}
              onChange={(e) => update("description_pt", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">
              {t("descEn")}
            </label>
            <Textarea
              value={form.description_en}
              onChange={(e) => update("description_en", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("coverUrl")}
              </label>
              <Input
                value={form.cover_image_url}
                onChange={(e) => update("cover_image_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("tags")}
              </label>
              <Input
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
                placeholder={t("tagsHint")}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => update("is_published", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-text">{t("publishedField")}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => update("is_featured", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-text">{t("featuredField")}</span>
            </label>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-primary" />
                <span className="text-sm font-semibold text-text">
                  {t("kitItems")}
                </span>
                <Badge variant="outline">{items.length}</Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                className="flex-1"
                value={selectedSupplement}
                onChange={(e) => setSelectedSupplement(e.target.value)}
              >
                <option value="">{t("selectSupplement")}</option>
                {supplements.map((s) => (
                  <option key={s.id} value={s.id}>
                    {supplementLabel(s)}
                    {s.brand ? ` · ${s.brand}` : ""}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={addItem}
                disabled={!selectedSupplement}
              >
                <Plus size={16} className="mr-2" />
                {t("addSupplement")}
              </Button>
            </div>

            {supplements.length === 0 && (
              <p className="text-xs text-text-secondary">
                {t("noSupplementsAvailable")}
              </p>
            )}

            {items.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("noItemsDesc")}</p>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const supplement = supplements.find(
                    (s) => s.id === item.supplement_id,
                  );
                  return (
                    <div
                      key={item.supplement_id}
                      className="rounded-lg border border-border bg-surface-secondary/30 p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-text">
                          {supplementLabel(supplement) ||
                            item.supplement_id.slice(0, 8)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                          title={t("remove")}
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary">
                            {t("dosage")}
                          </label>
                          <Input
                            value={item.dosage}
                            onChange={(e) =>
                              updateItem(index, "dosage", e.target.value)
                            }
                            placeholder="5"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary">
                            {t("dosageUnit")}
                          </label>
                          <Input
                            value={item.dosage_unit}
                            onChange={(e) =>
                              updateItem(index, "dosage_unit", e.target.value)
                            }
                            placeholder="g"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary">
                            {t("frequency")}
                          </label>
                          <Input
                            type="number"
                            min={1}
                            value={item.frequency_per_day}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "frequency_per_day",
                                Number(e.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary">
                            {t("timesOfDay")}
                          </label>
                          <Input
                            value={item.times_of_day}
                            onChange={(e) =>
                              updateItem(index, "times_of_day", e.target.value)
                            }
                            placeholder="08:00, 20:00"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-secondary">
                          {t("notes")}
                        </label>
                        <Input
                          value={item.notes_pt}
                          onChange={(e) =>
                            updateItem(index, "notes_pt", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                status.type === "ok"
                  ? "border-green-500/30 bg-green-500/10 text-green-500"
                  : "border-red-500/30 bg-red-500/10 text-red-500"
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
            {isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                {tCommon("loading")}
              </>
            ) : (
              tCommon("save")
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default SupplementKitModal;
