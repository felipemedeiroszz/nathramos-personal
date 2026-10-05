"use client";

import { useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  updateProfileAction,
  changePasswordAction,
  deleteAccountAction,
  uploadPhotoAction,
  removePhotoAction,
  logoutAction,
} from "@/app/actions/account";
import { cn } from "@/lib/utils";
import { locales } from "@/i18n/config";
import {
  User,
  Upload,
  X,
  Lock,
  ShieldAlert,
  CreditCard,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
} from "lucide-react";

type LocaleKey = (typeof locales)[number];

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  country: string | null;
  language: string | null;
  avatar_url: string | null;
}

interface SubscriptionSummary {
  status: string;
  plan_name: string | null;
  current_period_end: string | null;
  payment_method: string | null;
  amount_cents: number | null;
  billing_cycle_days: number | null;
}

function initialsOf(firstName: string | null, lastName: string | null): string {
  const first = (firstName ?? "").trim()[0];
  const last = (lastName ?? "").trim()[0];
  return (first ?? "") + (last ?? "") || "U";
}

function AlertLine({ type, text }: { type: "success" | "error" | "info"; text: string }) {
  const styles = {
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
    info: "bg-primary/10 border-primary/30 text-primary",
  } as const;
  const Icon = type === "success" ? CheckCircle2 : type === "error" ? AlertCircle : CheckCircle2;
  return (
    <div className={cn("rounded-xl border px-3 py-2 flex items-start gap-2 text-sm", styles[type])}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

export function AccountPageClient({
  locale,
  profile,
  subscription,
}: {
  locale: LocaleKey;
  profile: ProfileData;
  subscription: SubscriptionSummary | null;
}) {
  const t = useTranslations("account");
  const s = useTranslations("subscription");
  const p = useTranslations("payments");
  const nav = useTranslations("navigation");
  const common = useTranslations("common");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  const [profileState, profileAction] = useFormState(updateProfileAction, null);
  const [passwordState, passwordAction] = useFormState(changePasswordAction, null);
  const [deleteState, deleteAction] = useFormState(deleteAccountAction, null);
  const [uploadState, uploadAction] = useFormState(uploadPhotoAction, null);

  const handleFilePick = () => fileInputRef.current?.click();

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploadBusy(true);
    setUploadMsg(null);
    startTransition(async () => {
      const res: any = await uploadAction(fd);
      setUploadBusy(false);
      if (res?.success) {
        setUploadMsg({ type: "success", text: t("photoUploaded") });
        router.refresh();
      } else {
        setUploadMsg({ type: "error", text: res?.message || common("error") });
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const handleRemovePhoto = async () => {
    setUploadBusy(true);
    setUploadMsg(null);
    startTransition(async () => {
      const res: any = await removePhotoAction();
      setUploadBusy(false);
      if (res?.success) {
        setUploadMsg({ type: "success", text: t("photoRemoved") });
        router.refresh();
      } else {
        setUploadMsg({ type: "error", text: res?.message || common("error") });
      }
    });
  };

  const initials = initialsOf(profile.first_name, profile.last_name);

  return (
    <div className="space-y-6 md:space-y-8 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{t("title")}</h1>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User size={18} /> {t("profile")}
              </CardTitle>
              <CardDescription>{t("profileDesc")}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Avatar
                size="lg"
                src={profile.avatar_url ?? undefined}
                fallback={initials}
                alt={initials}
                className="h-16 w-16 text-lg ring-2 ring-border"
              />
              <div className="flex flex-col items-start gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleFilePick}
                  disabled={uploadBusy}
                  className="relative"
                >
                  {uploadBusy ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Upload size={16} className="mr-2" />
                  )}
                  {profile.avatar_url ? t("changePhoto") : t("uploadPhoto")}
                </Button>
                {profile.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={uploadBusy}
                    className="text-text-secondary"
                  >
                    <X size={16} className="mr-2" />
                    {t("removePhoto")}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onFileSelected}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {profileState?.success ? (
            <div className="mb-4">
              <AlertLine type="success" text={t("profileSaved")} />
            </div>
          ) : profileState?.success === false && profileState.message && profileState.message !== "validation" ? (
            <div className="mb-4">
              <AlertLine type="error" text={common(profileState.message) || profileState.message} />
            </div>
          ) : null}
          {uploadMsg && (
            <div className="mb-4">
              <AlertLine type={uploadMsg.type} text={uploadMsg.text} />
            </div>
          )}
          <form action={profileAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("firstName")}</label>
              <Input name="first_name" defaultValue={profile.first_name ?? undefined} required maxLength={100} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("lastName")}</label>
              <Input name="last_name" defaultValue={profile.last_name ?? undefined} required maxLength={100} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("email")}</label>
              <Input name="email" defaultValue={profile.email ?? undefined} type="email" readOnly className="opacity-70 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("phone")}</label>
              <Input name="phone" defaultValue={profile.phone ?? undefined} maxLength={50} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("birthDate")}</label>
              <Input name="birth_date" type="date" defaultValue={profile.birth_date ?? undefined} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("gender")}</label>
              <select
                name="gender"
                defaultValue={profile.gender ?? ""}
                className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-text placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                <option value="">-</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("height")}</label>
              <Input name="height_cm" type="number" min={50} max={260} step={1} defaultValue={profile.height_cm ?? undefined} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("weight")}</label>
              <Input name="weight_kg" type="number" min={20} max={400} step={0.1} defaultValue={profile.weight_kg ?? undefined} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("country")}</label>
              <Input name="country" defaultValue={profile.country ?? undefined} maxLength={100} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text flex items-center gap-1.5">
                <Globe size={14} /> {t("language")}
              </label>
              <select
                name="language"
                defaultValue={profile.language ?? ""}
                className="flex h-11 w-full rounded-xl border border-border bg-surface px-4 py-2 text-text placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                <option value="">-</option>
                <option value="pt-BR">{t("languagePt")}</option>
                <option value="en-US">{t("languageEn")}</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end pt-2">
              <Button type="submit">{common("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={18} /> {t("security")}
          </CardTitle>
          <CardDescription>{t("securityDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {passwordState?.success ? (
            <div className="mb-4">
              <AlertLine type="success" text={t("passwordChanged")} />
            </div>
          ) : passwordState?.success === false && passwordState.message && passwordState.message !== "validation" ? (
            <div className="mb-4">
              <AlertLine type="error" text={passwordState.message === "wrong_password" ? common(passwordState.message) : passwordState.message} />
            </div>
          ) : null}
          <form action={passwordAction} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("currentPassword")}</label>
              <Input name="current_password" type="password" required minLength={6} autoComplete="current-password" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("newPassword")}</label>
              <Input name="new_password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">{t("confirmPassword")}</label>
              <Input name="confirm_password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
            </div>
            <div className="md:col-span-3 flex justify-end pt-2">
              <Button type="submit" variant="secondary">
                {t("changePassword")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard size={18} /> {t("subscription")}
              </CardTitle>
              <CardDescription>{t("subscriptionDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border bg-surface-secondary/50 p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-text-secondary">{s("plan")}</span>
              <span className="font-semibold text-text">
                {subscription?.plan_name || " - "}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-text-secondary">{s("status")}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {subscription?.status ? p(`status${subscription.status[0].toUpperCase()}${subscription.status.slice(1)}`) : p("statusExpired")}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-text-secondary">{s("price")}</span>
              <span className="font-semibold text-text">
                {subscription?.amount_cents != null
                  ? new Intl.NumberFormat(profile.language === "en-US" ? "en-US" : "pt-BR", {
                      style: "currency",
                      currency: profile.language === "en-US" ? "USD" : "BRL",
                    }).format(subscription.amount_cents / 100)
                  : "-"}
                {subscription?.billing_cycle_days ? (
                  <span className="text-xs text-text-secondary ml-2">
                    /{p("everyNDays").replace("{n}", String(subscription.billing_cycle_days))}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-text-secondary">{s("nextCharge")}</span>
              <span className="font-medium text-text">
                {subscription?.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString(profile.language === "en-US" ? "en-US" : "pt-BR")
                  : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-text-secondary">{s("method")}</span>
              <span className="font-medium text-text">{subscription?.payment_method || "-"}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 justify-end">
            <Button variant="secondary" size="sm" asChild>
              <a href={`/${locale}/planos`}>{s("manageInStripe")}</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-500/20 bg-red-500/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <ShieldAlert size={18} /> {t("dangerZone")}
          </CardTitle>
          <CardDescription>{t("dangerDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={logoutAction as any} className="flex flex-wrap gap-3 justify-between items-center">
            <div className="text-sm text-text-secondary flex items-center gap-2">
              <LogOut size={16} className="text-text-secondary" />
              {nav("logout")}
            </div>
            <Button type="submit" variant="secondary" size="sm">
              {t("logout")}
            </Button>
          </form>
          <div className="border-t border-border pt-4 space-y-4">
            {deleteState?.success === false && deleteState.message && deleteState.message !== "validation" ? (
              <AlertLine type="error" text={deleteState.message === "wrong_password" ? common(deleteState.message) : deleteState.message} />
            ) : null}
            {!confirmDelete ? (
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-text flex items-center gap-2">
                    <Trash2 size={16} /> {t("deleteAccount")}
                  </div>
                  <p className="text-xs text-text-secondary max-w-2xl">{t("deleteWarning")}</p>
                </div>
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                  {t("deleteAccount")}
                </Button>
              </div>
            ) : (
              <form action={deleteAction} className="space-y-4">
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-semibold">
                    <ShieldAlert size={18} /> {t("deleteConfirm")}
                  </div>
                  <p className="text-sm text-text-secondary">{t("deleteWarning")}</p>
                  <div className="space-y-1 pt-2">
                    <label className="text-sm font-medium text-text">{t("deletePasswordRequired")}</label>
                    <Input name="password" type="password" required minLength={6} autoComplete="current-password" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    {common("cancel")}
                  </Button>
                  <Button type="submit" variant="destructive" size="sm">
                    {t("deleteAccount")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
