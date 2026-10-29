"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Loader2,
  Moon,
  Save,
  Smartphone,
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
import { Switch } from "@/components/ui/Switch";
import {
  disablePush,
  enablePush,
  notificationPermission,
  pushAvailability,
  syncPushSubscription,
} from "@/lib/push/client";
import {
  saveNotificationPreferencesAction,
  saveNotifySettingsAction,
  getNotificationPreferencesAction,
} from "@/app/actions/notifications";
import { NOTIFICATION_TYPES } from "@/schemas/notifications";
import type {
  NotificationPreferences,
  NotifySettings,
} from "@/services/NotificationService";
import { cn } from "@/lib/utils";

interface NotificationPreferencesPanelProps {
  preferences: NotificationPreferences;
  settings: NotifySettings;
  devices: number;
}

type Feedback = { type: "success" | "error"; text: string } | null;

function toInputTime(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export function NotificationPreferencesPanel({
  preferences,
  settings,
  devices,
}: NotificationPreferencesPanelProps) {
  const t = useTranslations("studentNotifications");
  const common = useTranslations("common");
  const [isPending, setIsPending] = useState(false);
  const en = useLocale() === "en-US";
  const [registered, setRegistered] = useState(false);
  const [availability, setAvailability] =
    useState<ReturnType<typeof pushAvailability>>(null);

  const [pushEnabled, setPushEnabled] = useState(settings.push_enabled);
  const [quietEnabled, setQuietEnabled] = useState(
    Boolean(settings.quiet_hours_start && settings.quiet_hours_end),
  );
  const [quietStart, setQuietStart] = useState(
    toInputTime(settings.quiet_hours_start) || "22:00",
  );
  const [quietEnd, setQuietEnd] = useState(
    toInputTime(settings.quiet_hours_end) || "08:00",
  );
  const [email, setEmail] = useState<Record<string, boolean>>({
    ...preferences.email,
  } as Record<string, boolean>);
  const [push, setPush] = useState<Record<string, boolean>>({
    ...preferences.push,
  } as Record<string, boolean>);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [devicesCount, setDevicesCount] = useState(devices);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    let active = true;
    setPermission(notificationPermission());
    setAvailability(pushAvailability());
    syncPushSubscription().then(async (ok) => {
      if (!active) return;
      setRegistered(ok);
      if (ok) {
        try {
          const current = await getNotificationPreferencesAction();
          if (active) setDevicesCount(current.devices);
        } catch {
          /* Keep the server-rendered count when refresh fails. */
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleEnablePush = async () => {
    setBusy(true);
    try {
      const ok = await enablePush();
      setPermission(notificationPermission());
      if (ok) {
        const result = await saveNotifySettingsAction({
          push_enabled: true,
          quiet_hours_start: quietEnabled ? quietStart : null,
          quiet_hours_end: quietEnabled ? quietEnd : null,
        });
        if (!result.success) throw new Error();
        setPushEnabled(true);
        setRegistered(true);
        const current = await getNotificationPreferencesAction();
        setDevicesCount(current.devices);
        setFeedback({ type: "success", text: t("pushEnabled") });
      } else {
        setFeedback({ type: "error", text: t("pushDenied") });
      }
    } catch {
      setFeedback({ type: "error", text: common("error") });
    } finally {
      setBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setBusy(true);
    try {
      if (!(await disablePush())) throw new Error();
      setRegistered(false);
      const current = await getNotificationPreferencesAction();
      setDevicesCount(current.devices);
      setFeedback({ type: "success", text: t("pushDisabled") });
    } catch {
      setFeedback({ type: "error", text: common("error") });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setIsPending(true);
    setFeedback(null);
    try {
      const settingsResult = await saveNotifySettingsAction({
        push_enabled: pushEnabled,
        quiet_hours_start: quietEnabled ? quietStart : null,
        quiet_hours_end: quietEnabled ? quietEnd : null,
      });
      const prefsResult = await saveNotificationPreferencesAction({
        email,
        push,
      });
      if (settingsResult.success && prefsResult.success) {
        setFeedback({ type: "success", text: t("saved") });
      } else {
        setFeedback({
          type: "error",
          text:
            settingsResult.message ?? prefsResult.message ?? common("error"),
        });
      }
    } catch {
      setFeedback({ type: "error", text: common("error") });
    } finally {
      setIsPending(false);
    }
  };

  const supportsPush = !availability && permission !== "unsupported";
  const pushActive = pushEnabled && registered && permission === "granted";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone size={20} />
            </span>
            <div>
              <CardTitle>{t("devicesTitle")}</CardTitle>
              <CardDescription>{t("devicesDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {availability && (
            <p
              role="status"
              className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-text-secondary"
            >
              {availability === "install"
                ? en
                  ? "On iPhone/iPad, add this site to your Home Screen, open it from its icon, then enable notifications. Requires iOS/iPadOS 16.4 or later."
                  : "No iPhone/iPad, adicione este site à Tela de Início, abra pelo ícone e ative as notificações. Requer iOS/iPadOS 16.4 ou posterior."
                : availability === "insecure"
                  ? en
                    ? "Open the site over HTTPS to enable mobile notifications."
                    : "Abra o site por HTTPS para ativar as notificações no celular."
                  : availability === "unconfigured"
                    ? en
                      ? "Push notifications need to be configured on the server."
                      : "O envio push precisa ser configurado no servidor."
                    : t("pushUnsupported")}
            </p>
          )}
          {permission === "denied" && (
            <p role="status" className="text-sm text-text-secondary">
              {en
                ? "Notifications are blocked. Allow them in your browser or device settings, then reopen this page."
                : "As notificações estão bloqueadas. Libere nas configurações do navegador ou dispositivo e reabra esta página."}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-surface-secondary/30 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text">
                {pushActive ? t("pushActive") : t("pushInactive")}
              </p>
              <p className="text-xs text-text-secondary">
                {devicesCount > 0
                  ? t("devicesRegistered", { count: devicesCount })
                  : t("noDevices")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!supportsPush ? (
                <span className="text-xs text-text-secondary">
                  {t("pushUnsupported")}
                </span>
              ) : permission === "granted" ? (
                pushActive ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDisablePush}
                    disabled={busy || isPending}
                  >
                    {busy ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Bell size={16} className="mr-2" />
                    )}
                    {t("disablePush")}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleEnablePush}
                    disabled={busy || isPending}
                  >
                    {busy ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Bell size={16} className="mr-2" />
                    )}
                    {t("enablePush")}
                  </Button>
                )
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleEnablePush}
                  disabled={busy || isPending}
                >
                  {busy ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Bell size={16} className="mr-2" />
                  )}
                  {t("enablePush")}
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-surface-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Moon size={18} className="mt-0.5 shrink-0 text-text-secondary" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-text">
                  {t("quietHoursTitle")}
                </p>
                <p className="text-xs text-text-secondary">
                  {t("quietHoursDesc")}
                </p>
              </div>
            </div>
            <Switch
              checked={quietEnabled}
              onCheckedChange={setQuietEnabled}
              aria-label={t("quietHoursTitle")}
            />
          </div>

          {quietEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">
                  {t("quietStart")}
                </label>
                <Input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text">
                  {t("quietEnd")}
                </label>
                <Input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell size={20} />
            </span>
            <div>
              <CardTitle>{t("typesTitle")}</CardTitle>
              <CardDescription>{t("typesDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 hidden grid-cols-[1fr_auto_auto] items-center gap-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-secondary sm:grid">
            <span>{t("colType")}</span>
            <span className="w-14 text-center">{t("colPush")}</span>
            <span className="w-14 text-center">{t("colEmail")}</span>
          </div>
          <div className="divide-y divide-border/60">
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-2 py-3"
              >
                <span className={cn("text-sm text-text")}>
                  {t(`types.${type}`)}
                </span>
                <div className="flex w-14 justify-center">
                  <Switch
                    checked={push[type] ?? true}
                    onCheckedChange={(value) =>
                      setPush((prev) => ({ ...prev, [type]: value }))
                    }
                    aria-label={`${t(`types.${type}`)} push`}
                  />
                </div>
                <div className="flex w-14 justify-center">
                  <Switch
                    checked={email[type] ?? true}
                    onCheckedChange={(value) =>
                      setEmail((prev) => ({ ...prev, [type]: value }))
                    }
                    aria-label={`${t(`types.${type}`)} email`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={busy || isPending}
        >
          {isPending ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          {isPending ? t("saving") : common("save")}
        </Button>
        {feedback && (
          <span
            className={cn(
              "inline-flex items-center gap-2 text-sm",
              feedback.type === "success" ? "text-primary" : "text-text",
            )}
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

export default NotificationPreferencesPanel;
