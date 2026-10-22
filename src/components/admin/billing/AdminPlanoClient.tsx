"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { BILLING_CYCLE_OPTIONS, PLAN_CURRENCIES } from "@/schemas/plans";
import type { PlanRow } from "@/lib/supabase/types";

interface AdminPlanoClientProps {
  plan: PlanRow | null;
}

type FormState = {
  name_pt: string;
  name_en: string;
  slug: string;
  description_pt: string;
  description_en: string;
  price: string;
  currency: string;
  billing_cycle_days: string;
  trial_days: string;
  grace_days: string;
  highlight_hex: string;
  badge_pt: string;
  badge_en: string;
  is_active: boolean;
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildForm(plan: PlanRow | null): FormState {
  return {
    name_pt: plan?.name_pt ?? "",
    name_en: plan?.name_en ?? "",
    slug: plan?.slug ?? "",
    description_pt: plan?.description_pt ?? "",
    description_en: plan?.description_en ?? "",
    price: plan ? (plan.price_cents / 100).toFixed(2) : "",
    currency: plan?.currency ?? "BRL",
    billing_cycle_days: String(plan?.billing_cycle_days ?? 30),
    trial_days: String(plan?.trial_days ?? 0),
    grace_days: String(plan?.grace_days ?? 3),
    highlight_hex: plan?.highlight_hex ?? "",
    badge_pt: plan?.badge_pt ?? "",
    badge_en: plan?.badge_en ?? "",
    is_active: plan?.is_active ?? true,
  };
}

export function AdminPlanoClient({ plan }: AdminPlanoClientProps) {
  const t = useTranslations("adminPlans");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [slugEdited, setSlugEdited] = useState(!!plan);
  const [form, setForm] = useState<FormState>(() => buildForm(plan));

  const update = (key: keyof FormState, value: any) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const priceCents = Math.round(parseFloat((form.price || "0").replace(",", ".")) * 100);

    startTransition(async () => {
      const { savePlanAction } = await import("@/app/actions/billing");
      const result = await savePlanAction({
        name_pt: form.name_pt,
        name_en: form.name_en,
        slug: form.slug || slugify(form.name_pt),
        description_pt: form.description_pt || null,
        description_en: form.description_en || null,
        price_cents: Number.isFinite(priceCents) ? priceCents : 0,
        currency: form.currency as any,
        billing_cycle_days: Number(form.billing_cycle_days),
        trial_days: Number(form.trial_days),
        grace_days: Number(form.grace_days),
        highlight_hex: form.highlight_hex || null,
        badge_pt: form.badge_pt || null,
        badge_en: form.badge_en || null,
        is_active: form.is_active,
      });
      if (!result.success) {
        setError(result.message ?? t("saveError"));
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      {/* Aviso: acesso total */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <Sparkles size={18} className="text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-text-secondary">{t("fullAccessNote")}</p>
      </div>

      {/* Identificação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">
            {t("sectionIdentity")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("namePt")}</label>
              <Input
                value={form.name_pt}
                onChange={(e) => {
                  const value = e.target.value;
                  setSaved(false);
                  setForm((prev) => ({
                    ...prev,
                    name_pt: value,
                    slug: slugEdited ? prev.slug : slugify(value),
                  }));
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("nameEn")}</label>
              <Input
                value={form.name_en}
                onChange={(e) => update("name_en", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("slug")}</label>
            <Input
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                update("slug", slugify(e.target.value));
              }}
              placeholder="plano-completo"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("descriptionPt")}</label>
              <Textarea
                value={form.description_pt}
                onChange={(e) => update("description_pt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("descriptionEn")}</label>
              <Textarea
                value={form.description_en}
                onChange={(e) => update("description_en", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preços e cobrança */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">
            {t("sectionPricing")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("price")}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("currency")}</label>
              <Select value={form.currency} onChange={(e) => update("currency", e.target.value)}>
                {PLAN_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("billingCycle")}</label>
              <Select
                value={form.billing_cycle_days}
                onChange={(e) => update("billing_cycle_days", e.target.value)}
              >
                {BILLING_CYCLE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {t(`cycle_${d}` as any)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("graceDays")}</label>
              <Input
                type="number"
                min="0"
                max="30"
                value={form.grace_days}
                onChange={(e) => update("grace_days", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("trialDays")}</label>
              <Input
                type="number"
                min="0"
                max="60"
                value={form.trial_days}
                onChange={(e) => update("trial_days", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("highlightHex")}</label>
              <Input
                value={form.highlight_hex}
                onChange={(e) => update("highlight_hex", e.target.value)}
                placeholder="#FFD400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("badgePt")}</label>
              <Input
                value={form.badge_pt}
                onChange={(e) => update("badge_pt", e.target.value)}
                placeholder={t("badgePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">{t("badgeEn")}</label>
              <Input
                value={form.badge_en}
                onChange={(e) => update("badge_en", e.target.value)}
                placeholder={t("badgePlaceholder")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => update("is_active", e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm text-text">{t("active")}</span>
        </label>

        <div className="flex-1" />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && !error && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-500">
            <Check size={15} />
            {tCommon("save")}
          </span>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? tCommon("loading") : tCommon("save")}
        </Button>
      </div>
    </form>
  );
}

export default AdminPlanoClient;
