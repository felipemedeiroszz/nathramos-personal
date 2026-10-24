"use client";

import { useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  updateProfileAction,
  changePasswordAction,
  uploadPhotoAction,
  removePhotoAction,
  logoutAction,
} from "@/app/actions/account";
import { NotificationPreferencesPanel } from "@/components/shared/NotificationPreferencesPanel";
import type { NotificationPreferences, NotifySettings } from "@/services/NotificationService";
import { cn } from "@/lib/utils";
import { locales } from "@/i18n/config";
import {
  User,
  Upload,
  X,
  Lock,
  CreditCard,
  LogOut,
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Settings,
  Mail,
  MapPin,
  Calendar,
  Ruler,
  Scale,
  Phone as PhoneIcon,
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
    <div className={cn("rounded-xl border px-4 py-3 flex items-start gap-3 text-sm animate-in slide-in-from-top-2 fade-in duration-300", styles[type])}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{text}</span>
    </div>
  );
}

type TabType = "profile" | "security" | "notifications" | "subscription" | "settings";

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-text-secondary hover:text-text hover:bg-surface-secondary/50"
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

export function AccountPageClient({
  locale,
  profile,
  subscription,
  notificationPreferences,
  notificationSettings,
  notificationDevices,
}: {
  locale: LocaleKey;
  profile: ProfileData;
  subscription: SubscriptionSummary | null;
  notificationPreferences: NotificationPreferences;
  notificationSettings: NotifySettings;
  notificationDevices: number;
}) {
  const t = useTranslations("account");
  const tn = useTranslations("studentNotifications");
  const s = useTranslations("subscription");
  const p = useTranslations("payments");
  const nav = useTranslations("navigation");
  const common = useTranslations("common");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [, startTransition] = useTransition();

  const [profileState, profileAction] = useFormState(updateProfileAction, null);
  const [passwordState, passwordAction] = useFormState(changePasswordAction, null);
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

  const tabs: { id: TabType; icon: any; label: string }[] = [
    { id: "profile", icon: User, label: t("profile") },
    { id: "security", icon: Lock, label: t("security") },
    { id: "notifications", icon: Bell, label: tn("tabLabel") },
    { id: "subscription", icon: CreditCard, label: t("subscription") },
    { id: "settings", icon: Settings, label: t("dangerZone") },
  ];

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-5xl mx-auto">
      <header className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar
            size="xl"
            src={profile.avatar_url ?? undefined}
            fallback={initials}
            alt={initials}
            className="h-20 w-20 text-2xl ring-4 ring-border shadow-lg"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-text-secondary text-sm">{profile.email}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} /> {t("profile")}
              </CardTitle>
              <CardDescription>{t("profileDesc")}</CardDescription>
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

              <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-surface-secondary/50 border border-border">
                <Avatar
                  size="lg"
                  src={profile.avatar_url ?? undefined}
                  fallback={initials}
                  alt={initials}
                  className="h-16 w-16 text-lg ring-2 ring-border"
                />
                <div className="flex flex-col sm:flex-row gap-2">
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

              <form action={profileAction} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text flex items-center gap-2">
                      <User size={14} className="text-text-secondary" />
                      {t("firstName")}
                    </label>
                    <Input name="first_name" defaultValue={profile.first_name ?? undefined} required maxLength={100} placeholder="João" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text flex items-center gap-2">
                      <User size={14} className="text-text-secondary" />
                      {t("lastName")}
                    </label>
                    <Input name="last_name" defaultValue={profile.last_name ?? undefined} required maxLength={100} placeholder="Silva" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text flex items-center gap-2">
                      <PhoneIcon size={14} className="text-text-secondary" />
                      {t("phone")}
                    </label>
                    <Input name="phone" defaultValue={profile.phone ?? undefined} maxLength={50} placeholder="(11) 99999-9999" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text flex items-center gap-2">
                      <Calendar size={14} className="text-text-secondary" />
                      {t("birthDate")}
                    </label>
                    <Input name="birth_date" type="date" defaultValue={profile.birth_date ?? undefined} />
                  </div>
                  <div className="space-y-2">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text flex items-center gap-2">
                      <Ruler size={14} className="text-text-secondary" />
                      {t("height")}
                    </label>
                    <Input name="height_cm" type="number" min={50} max={260} step={1} defaultValue={profile.height_cm ?? undefined} placeholder="175" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text flex items-center gap-2">
                      <Scale size={14} className="text-text-secondary" />
                      {t("weight")}
                    </label>
                    <Input name="weight_kg" type="number" min={20} max={400} step={0.1} defaultValue={profile.weight_kg ?? undefined} placeholder="75.5" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text flex items-center gap-2">
                      <MapPin size={14} className="text-text-secondary" />
                      {t("country")}
                    </label>
                    <Input name="country" defaultValue={profile.country ?? undefined} maxLength={100} placeholder="Brasil" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text flex items-center gap-2">
                      <Globe size={14} className="text-text-secondary" />
                      {t("language")}
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
                </div>
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button type="submit" size="lg" className="min-w-[120px]">
                    {profileState?.success ? (
                      <>
                        <CheckCircle2 size={18} className="mr-2" />
                        {common("success")}
                      </>
                    ) : (
                      <>
                        {common("save")}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "security" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock size={20} /> {t("security")}
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
              <form action={passwordAction} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text">{t("currentPassword")}</label>
                    <Input name="current_password" type="password" required minLength={6} autoComplete="current-password" placeholder="••••••" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text">{t("newPassword")}</label>
                    <Input name="new_password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text">{t("confirmPassword")}</label>
                    <Input name="confirm_password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="••••••••" />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button type="submit" variant="secondary" size="lg" className="min-w-[140px]">
                    {passwordState?.success ? (
                      <>
                        <CheckCircle2 size={18} className="mr-2" />
                        {common("success")}
                      </>
                    ) : (
                      <>
                        <Lock size={18} className="mr-2" />
                        {t("changePassword")}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "notifications" && (
          <NotificationPreferencesPanel
            preferences={notificationPreferences}
            settings={notificationSettings}
            devices={notificationDevices}
          />
        )}

        {activeTab === "subscription" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard size={20} /> {t("subscription")}
              </CardTitle>
              <CardDescription>{t("subscriptionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-border bg-gradient-to-br from-surface-secondary/50 to-surface-secondary/30 p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">{s("plan")}</p>
                    <p className="text-xl font-bold text-text">
                      {subscription?.plan_name || "Sem plano ativo"}
                    </p>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
                    subscription?.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  )}>
                    <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
                    {subscription?.status ? p(`status${subscription.status[0].toUpperCase()}${subscription.status.slice(1)}`) : p("statusExpired")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-text-secondary">{s("price")}</p>
                    <p className="text-lg font-semibold text-text">
                      {subscription?.amount_cents != null
                        ? new Intl.NumberFormat(profile.language === "en-US" ? "en-US" : "pt-BR", {
                            style: "currency",
                            currency: profile.language === "en-US" ? "USD" : "BRL",
                          }).format(subscription.amount_cents / 100)
                        : "-"}
                      {subscription?.billing_cycle_days ? (
                        <span className="text-sm text-text-secondary ml-2">
                          /{p("everyNDays").replace("{n}", String(subscription.billing_cycle_days))}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-text-secondary">{s("nextCharge")}</p>
                    <p className="text-lg font-semibold text-text">
                      {subscription?.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString(profile.language === "en-US" ? "en-US" : "pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-text-secondary">{s("method")}</p>
                    <p className="text-lg font-semibold text-text capitalize">{subscription?.payment_method || "-"}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 justify-end">
                <Button variant="secondary" size="lg" asChild>
                  <a href={`/${locale}/planos`}>
                    <CreditCard size={18} className="mr-2" />
                    {s("manageInStripe")}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut size={20} /> {t("logout")}
              </CardTitle>
              <CardDescription>Sair da sua conta atual.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={logoutAction as any} className="flex flex-wrap gap-4 justify-between items-center p-4 rounded-xl bg-surface-secondary/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-surface-secondary">
                    <LogOut size={20} className="text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{nav("logout")}</p>
                    <p className="text-xs text-text-secondary">Sair da sua conta atual</p>
                  </div>
                </div>
                <Button type="submit" variant="secondary" size="lg">
                  {t("logout")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
