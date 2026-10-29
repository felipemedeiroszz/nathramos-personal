"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  LifeBuoy,
  Loader2,
  Save,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { savePlatformSettingsAction } from "@/app/actions/settings";
import type {
  MaintenanceUnit,
  PlatformSettingsForm,
} from "@/services/PlatformSettingsService";

interface AdminSettingsClientProps {
  settings: PlatformSettingsForm;
}

type Feedback = { type: "success" | "error"; text: string } | null;

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-surface-secondary/30 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-background transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function AdminSettingsClient({ settings }: AdminSettingsClientProps) {
  const t = useTranslations("adminSettings");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<PlatformSettingsForm>(settings);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const setText =
    (key: keyof PlatformSettingsForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const setBool = (key: keyof PlatformSettingsForm) => (value: boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const formatUntil = (iso: string | null): string | null => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  const handleSubmit = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await savePlatformSettingsAction(form);
      if (result.success) {
        setFeedback({ type: "success", text: t("saved") });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: result.message ?? t("error") });
      }
    });
  };

  return (
    <div className="space-y-6">
      <nav
        aria-label={
          locale === "en-US" ? "Settings sections" : "Seções das configurações"
        }
        className="flex flex-wrap gap-2"
      >
        <a
          href="#admin-brand-settings"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-xs text-text-secondary transition hover:border-primary/30 hover:text-primary"
        >
          {locale === "en-US" ? "Brand & support" : "Marca e suporte"}
        </a>
        <a
          href="#admin-preferences-settings"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-xs text-text-secondary transition hover:border-primary/30 hover:text-primary"
        >
          {locale === "en-US" ? "Access & maintenance" : "Acesso e manutenção"}
        </a>
      </nav>
      <Card id="admin-brand-settings" className="scroll-mt-24">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </span>
            <div>
              <CardTitle>{t("generalTitle")}</CardTitle>
              <CardDescription>{t("generalDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-settings-brandNamePt"
                className="text-xs font-medium text-text-secondary"
              >
                {t("brandNamePt")}
              </label>
              <Input
                id="admin-settings-brandNamePt"
                value={form.brand_name_pt}
                onChange={setText("brand_name_pt")}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="admin-settings-brandNameEn"
                className="text-xs font-medium text-text-secondary"
              >
                {t("brandNameEn")}
              </label>
              <Input
                id="admin-settings-brandNameEn"
                value={form.brand_name_en}
                onChange={setText("brand_name_en")}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="admin-settings-brandTaglinePt"
                className="text-xs font-medium text-text-secondary"
              >
                {t("brandTaglinePt")}
              </label>
              <Input
                id="admin-settings-brandTaglinePt"
                value={form.brand_tagline_pt}
                onChange={setText("brand_tagline_pt")}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="admin-settings-brandTaglineEn"
                className="text-xs font-medium text-text-secondary"
              >
                {t("brandTaglineEn")}
              </label>
              <Input
                id="admin-settings-brandTaglineEn"
                value={form.brand_tagline_en}
                onChange={setText("brand_tagline_en")}
              />
            </div>
          </div>

          <div className="pt-2 space-y-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <LifeBuoy size={16} />
              <span className="text-xs font-semibold uppercase tracking-wide">
                {t("supportTitle")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-settings-supportEmail"
                  className="text-xs font-medium text-text-secondary"
                >
                  {t("supportEmail")}
                </label>
                <Input
                  id="admin-settings-supportEmail"
                  type="email"
                  value={form.support_email}
                  onChange={setText("support_email")}
                  placeholder="contato@exemplo.com"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-settings-supportWhatsapp"
                  className="text-xs font-medium text-text-secondary"
                >
                  {t("supportWhatsapp")}
                </label>
                <Input
                  id="admin-settings-supportWhatsapp"
                  value={form.support_whatsapp}
                  onChange={setText("support_whatsapp")}
                  placeholder="+55 11 99999-0000"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-settings-supportHoursPt"
                  className="text-xs font-medium text-text-secondary"
                >
                  {t("supportHoursPt")}
                </label>
                <Input
                  id="admin-settings-supportHoursPt"
                  value={form.support_hours_pt}
                  onChange={setText("support_hours_pt")}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-settings-supportHoursEn"
                  className="text-xs font-medium text-text-secondary"
                >
                  {t("supportHoursEn")}
                </label>
                <Input
                  id="admin-settings-supportHoursEn"
                  value={form.support_hours_en}
                  onChange={setText("support_hours_en")}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="admin-preferences-settings" className="scroll-mt-24">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <SlidersHorizontal size={20} />
            </span>
            <div>
              <CardTitle>{t("prefsTitle")}</CardTitle>
              <CardDescription>{t("prefsDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Toggle
              checked={form.maintenance_mode}
              onChange={setBool("maintenance_mode")}
              label={t("maintenanceMode")}
              description={t("maintenanceModeDesc")}
            />
            <Toggle
              checked={form.signup_open}
              onChange={setBool("signup_open")}
              label={t("signupOpen")}
              description={t("signupOpenDesc")}
            />
          </div>

          {form.maintenance_mode && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Wrench size={16} />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {t("maintenanceWindowTitle")}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-settings-maintenanceDuration"
                    className="text-xs font-medium text-text-secondary"
                  >
                    {t("maintenanceDuration")}
                  </label>
                  <Input
                    id="admin-settings-maintenanceDuration"
                    type="number"
                    min={1}
                    max={8760}
                    value={form.maintenance_duration}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maintenance_duration: Number(e.target.value) || 1,
                      }))
                    }
                  />
                  <p className="text-xs text-text-secondary">
                    {t("maintenanceDurationDesc")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text">
                    {t("maintenanceDurationUnit")}
                  </label>
                  <Select
                    value={form.maintenance_duration_unit}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maintenance_duration_unit: e.target
                          .value as MaintenanceUnit,
                      }))
                    }
                  >
                    <option value="hours">{t("maintenanceUnitHours")}</option>
                    <option value="days">{t("maintenanceUnitDays")}</option>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg bg-surface-secondary/40 border border-border/60 p-3 text-xs text-text-secondary">
                {formatUntil(form.maintenance_until) ? (
                  <>
                    <span
                      className={
                        form.maintenance_active
                          ? "text-primary font-medium"
                          : "text-text font-medium"
                      }
                    >
                      {form.maintenance_active
                        ? t("maintenanceActiveNow")
                        : t("maintenanceExpired")}
                    </span>{" "}
                    {t("maintenanceUntil", {
                      date: formatUntil(form.maintenance_until) as string,
                    })}
                  </>
                ) : (
                  <span>{t("maintenanceNoDeadline")}</span>
                )}
              </div>
            </div>
          )}

          <div className="max-w-xs space-y-1.5">
            <label
              htmlFor="admin-settings-trialDaysDefault"
              className="text-xs font-medium text-text-secondary"
            >
              {t("trialDaysDefault")}
            </label>
            <Input
              id="admin-settings-trialDaysDefault"
              type="number"
              min={0}
              max={365}
              value={form.trial_days_default}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  trial_days_default: Number(e.target.value) || 0,
                }))
              }
            />
            <p className="text-xs text-text-secondary">
              {t("trialDaysDefaultDesc")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-xl border border-white/10 bg-surface/95 p-3 backdrop-blur-xl sm:flex-row sm:items-center">
        <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
          {isPending ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          {isPending ? t("saving") : t("save")}
        </Button>

        {feedback && (
          <span
            className={`inline-flex items-center gap-2 text-sm ${
              feedback.type === "success" ? "text-green-400" : "text-red-400"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {feedback.text}
          </span>
        )}
      </div>
    </div>
  );
}

export default AdminSettingsClient;
