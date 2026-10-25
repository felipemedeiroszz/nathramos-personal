"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Sparkles, ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ProductImageField } from "@/components/admin/content/ProductImageField";
import { BILLING_CYCLE_OPTIONS, PLAN_CURRENCIES } from "@/schemas/plans";
import type { PlanRow } from "@/lib/supabase/types";

interface AdminPlanoClientProps {
  plan: PlanRow | null;
}

type BannerForm = {
  id: string;
  image_url: string;
  title_pt: string;
  title_en: string;
  subtitle_pt: string;
  subtitle_en: string;
  cta_label_pt: string;
  cta_label_en: string;
  cta_href: string;
  badge_pt: string;
  badge_en: string;
  is_active: boolean;
};

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
  banners: BannerForm[];
};

function newBannerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
    banners: (plan?.banners ?? []).map((b) => ({
      id: b.id,
      image_url: b.image_url ?? "",
      title_pt: b.title_pt ?? "",
      title_en: b.title_en ?? "",
      subtitle_pt: b.subtitle_pt ?? "",
      subtitle_en: b.subtitle_en ?? "",
      cta_label_pt: b.cta_label_pt ?? "",
      cta_label_en: b.cta_label_en ?? "",
      cta_href: b.cta_href ?? "",
      badge_pt: b.badge_pt ?? "",
      badge_en: b.badge_en ?? "",
      is_active: b.is_active ?? true,
    })),
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

  const addBanner = () => {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      banners: [
        ...prev.banners,
        {
          id: newBannerId(),
          image_url: "",
          title_pt: "",
          title_en: "",
          subtitle_pt: "",
          subtitle_en: "",
          cta_label_pt: "",
          cta_label_en: "",
          cta_href: "",
          badge_pt: "",
          badge_en: "",
          is_active: true,
        },
      ],
    }));
  };

  const updateBanner = (id: string, patch: Partial<BannerForm>) => {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      banners: prev.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const removeBanner = (id: string) => {
    setSaved(false);
    setForm((prev) => ({
      ...prev,
      banners: prev.banners.filter((b) => b.id !== id),
    }));
  };

  const moveBanner = (index: number, direction: -1 | 1) => {
    setSaved(false);
    setForm((prev) => {
      const banners = [...prev.banners];
      const target = index + direction;
      if (target < 0 || target >= banners.length) return prev;
      [banners[index], banners[target]] = [banners[target], banners[index]];
      return { ...prev, banners };
    });
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
        banners: form.banners
          .filter((b) => b.image_url.trim())
          .map((b) => ({
            id: b.id,
            image_url: b.image_url.trim(),
            title_pt: b.title_pt.trim() || null,
            title_en: b.title_en.trim() || null,
            subtitle_pt: b.subtitle_pt.trim() || null,
            subtitle_en: b.subtitle_en.trim() || null,
            cta_label_pt: b.cta_label_pt.trim() || null,
            cta_label_en: b.cta_label_en.trim() || null,
            cta_href: b.cta_href.trim() || null,
            badge_pt: b.badge_pt.trim() || null,
            badge_en: b.badge_en.trim() || null,
            is_active: b.is_active,
          })),
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

      {/* Banners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wide">
            {t("sectionBanners")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <p className="text-sm text-text-secondary max-w-xl">{t("bannersNote")}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addBanner}
              className="shrink-0 gap-2"
            >
              <Plus size={15} />
              {t("addBanner")}
            </Button>
          </div>

          {form.banners.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-text-secondary">
              {t("emptyBanners")}
            </p>
          ) : (
            <div className="space-y-4">
              {form.banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className="rounded-xl border border-border/60 bg-surface-secondary/30 p-4 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-text">
                      {t("banner")} {index + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveBanner(index, -1)}
                        disabled={index === 0}
                        aria-label={t("moveUp")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBanner(index, 1)}
                        disabled={index === form.banners.length - 1}
                        aria-label={t("moveDown")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBanner(banner.id)}
                        aria-label={t("removeBanner")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-text-secondary transition-colors hover:border-red-500/60 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                    <ProductImageField
                      value={banner.image_url}
                      onChange={(url) => updateBanner(banner.id, { image_url: url })}
                    />

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text">{t("bannerTitlePt")}</label>
                          <Input
                            value={banner.title_pt}
                            onChange={(e) => updateBanner(banner.id, { title_pt: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text">{t("bannerTitleEn")}</label>
                          <Input
                            value={banner.title_en}
                            onChange={(e) => updateBanner(banner.id, { title_en: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text">{t("bannerSubtitlePt")}</label>
                          <Input
                            value={banner.subtitle_pt}
                            onChange={(e) => updateBanner(banner.id, { subtitle_pt: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text">{t("bannerSubtitleEn")}</label>
                          <Input
                            value={banner.subtitle_en}
                            onChange={(e) => updateBanner(banner.id, { subtitle_en: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text">{t("bannerBadgePt")}</label>
                          <Input
                            value={banner.badge_pt}
                            onChange={(e) => updateBanner(banner.id, { badge_pt: e.target.value })}
                            placeholder={t("badgePlaceholder")}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text">{t("bannerBadgeEn")}</label>
                          <Input
                            value={banner.badge_en}
                            onChange={(e) => updateBanner(banner.id, { badge_en: e.target.value })}
                            placeholder={t("badgePlaceholder")}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text">{t("bannerCtaPt")}</label>
                          <Input
                            value={banner.cta_label_pt}
                            onChange={(e) => updateBanner(banner.id, { cta_label_pt: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text">{t("bannerCtaEn")}</label>
                          <Input
                            value={banner.cta_label_en}
                            onChange={(e) => updateBanner(banner.id, { cta_label_en: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text">{t("bannerCtaHref")}</label>
                          <Input
                            value={banner.cta_href}
                            onChange={(e) => updateBanner(banner.id, { cta_href: e.target.value })}
                            placeholder="/cadastro"
                          />
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={banner.is_active}
                          onChange={(e) => updateBanner(banner.id, { is_active: e.target.checked })}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <span className="text-sm text-text">{t("bannerActive")}</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
