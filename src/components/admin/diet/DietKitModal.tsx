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
  Plus,
  Trash2,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { saveDietKitAction } from "@/app/actions/content";
import type { DietKitWithItems, DietFoodRow } from "@/types";
import type { MealTypeT } from "@/lib/supabase/types";

const MEAL_TYPE_OPTIONS: { value: MealTypeT; pt: string; en: string }[] = [
  { value: "breakfast", pt: "Café da manhã", en: "Breakfast" },
  { value: "morning_snack", pt: "Lanche da manhã", en: "Morning snack" },
  { value: "lunch", pt: "Almoço", en: "Lunch" },
  { value: "afternoon_snack", pt: "Lanche da tarde", en: "Afternoon snack" },
  { value: "dinner", pt: "Jantar", en: "Dinner" },
  { value: "supper", pt: "Ceia", en: "Supper" },
  { value: "pre_workout", pt: "Pré-treino", en: "Pre-workout" },
  { value: "post_workout", pt: "Pós-treino", en: "Post-workout" },
  { value: "water", pt: "Água", en: "Water" },
  { value: "other", pt: "Outro", en: "Other" },
];

interface KitItemDraft {
  id?: string;
  uid: string;
  food_id: string;
  quantity: string;
  unit: string;
  meal_type: MealTypeT;
  time_of_day: string;
  notes_pt: string;
  notes_en: string;
}

interface DietKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  kit?: DietKitWithItems | null;
  foods?: DietFoodRow[];
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

function newUid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function DietKitModal({
  isOpen,
  onClose,
  kit,
  foods = [],
  onSaved,
}: DietKitModalProps) {
  const t = useTranslations("adminDietKits");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useAsyncTransition();

  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<KitItemDraft[]>([]);
  const [selectedFood, setSelectedFood] = useState("");
  const [status, setStatus] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    setSelectedFood("");
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
          uid: newUid(),
          id: item.id,
          food_id: item.food_id ?? "",
          quantity: item.quantity != null ? String(item.quantity) : "",
          unit: item.unit ?? "",
          meal_type: item.meal_type ?? "other",
          time_of_day: item.time_of_day ?? "",
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

  const foodLabel = (id?: string | null) => {
    const f = foods.find((x) => x.id === id);
    if (!f) return id ? `${id.slice(0, 8)}...` : "";
    return locale === "pt-BR" ? f.name_pt : f.name_en;
  };

  function addItem() {
    if (!selectedFood) return;
    setItems((prev) => [
      ...prev,
      {
        uid: newUid(),
        food_id: selectedFood,
        quantity: "",
        unit: "g",
        meal_type: "other",
        time_of_day: "",
        notes_pt: "",
        notes_en: "",
      },
    ]);
    setSelectedFood("");
  }

  function updateItem(uid: string, key: keyof KitItemDraft, value: any) {
    setItems((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, [key]: value } : item)),
    );
  }

  function removeItem(uid: string) {
    setItems((prev) => prev.filter((item) => item.uid !== uid));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const res = await saveDietKitAction({
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
          food_id: item.food_id,
          quantity: item.quantity ? Number(item.quantity) : null,
          unit: item.unit || null,
          meal_type: item.meal_type,
          time_of_day: item.time_of_day || null,
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
          href={`/${locale}/admin/historico?kind=diet_kits&record=${kit.id}`}
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
                <UtensilsCrossed size={16} className="text-primary" />
                <span className="text-sm font-semibold text-text">
                  {t("kitItems")}
                </span>
                <Badge variant="outline">{items.length}</Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                className="flex-1"
                value={selectedFood}
                onChange={(e) => setSelectedFood(e.target.value)}
              >
                <option value="">{t("selectFood")}</option>
                {foods.map((f) => (
                  <option key={f.id} value={f.id}>
                    {foodLabel(f.id)}
                    {f.category_pt ? ` · ${f.category_pt}` : ""}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                onClick={addItem}
                disabled={!selectedFood}
              >
                <Plus size={16} className="mr-2" />
                {t("addFood")}
              </Button>
            </div>

            {foods.length === 0 && (
              <p className="text-xs text-text-secondary">
                {t("noFoodsAvailable")}
              </p>
            )}

            {items.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("noItemsDesc")}</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.uid}
                    className="rounded-lg border border-border bg-surface-secondary/30 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-text">
                        {foodLabel(item.food_id) || item.food_id.slice(0, 8)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-500"
                        title={t("remove")}
                        onClick={() => removeItem(item.uid)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-text-secondary">
                          {t("quantity")}
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.uid, "quantity", e.target.value)
                          }
                          placeholder="100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-secondary">
                          {t("unit")}
                        </label>
                        <Input
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(item.uid, "unit", e.target.value)
                          }
                          placeholder="g"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-secondary">
                          {t("mealType")}
                        </label>
                        <Select
                          value={item.meal_type}
                          onChange={(e) =>
                            updateItem(item.uid, "meal_type", e.target.value)
                          }
                        >
                          {MEAL_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {locale === "pt-BR" ? opt.pt : opt.en}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-secondary">
                          {t("timeOfDay")}
                        </label>
                        <Input
                          value={item.time_of_day}
                          onChange={(e) =>
                            updateItem(item.uid, "time_of_day", e.target.value)
                          }
                          placeholder="12:30"
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
                          updateItem(item.uid, "notes_pt", e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
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

export default DietKitModal;
