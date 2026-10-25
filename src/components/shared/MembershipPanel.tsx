"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { Callout } from "@/components/ui/Callout";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  CalendarClock,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Loader2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  History,
  Wallet,
  Repeat,
  ArrowRight,
} from "lucide-react";

const DAY_MS = 86_400_000;

export interface MembershipSubscription {
  id: string;
  status: string;
  plan_name: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  last_paid_at: string | null;
  last_failed_at: string | null;
  billing_cycle_days: number | null;
  amount_cents: number | null;
  currency: string | null;
  provider: string | null;
  payment_method: string | null;
  card_last4: string | null;
  card_brand: string | null;
  grace_days: number | null;
}

export interface MembershipPayment {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  method: string;
  created_at: string;
  paid_at: string | null;
  due_at: string | null;
  failed_at: string | null;
  pix_copy_paste: string | null;
  card_last4: string | null;
  card_brand: string | null;
  description_pt: string | null;
  description_en: string | null;
}

export interface MembershipAccess {
  allowed: boolean;
  status: string;
  reason: string;
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Mapeia o status da assinatura para as classes do badge (somente paleta oficial). */
const STATUS_STYLES: Record<string, string> = {
  active: "bg-primary/10 text-primary border border-primary/30",
  trialing: "bg-primary/10 text-primary border border-primary/30",
  past_due: "bg-text/[0.08] text-text border border-text/25",
  canceled: "bg-surface-secondary text-text-secondary border border-border",
  inactive: "bg-surface-secondary text-text-secondary border border-border",
  expired: "bg-surface-secondary text-text-secondary border border-border",
  blocked: "bg-text/[0.08] text-text border border-text/25",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: "bg-primary text-primary-foreground border border-primary",
  pending: "bg-primary/10 text-primary border border-primary/40",
  expired: "bg-surface-secondary text-text-secondary border border-border",
  canceled: "bg-surface-secondary text-text-secondary border border-border",
  refunded: "bg-surface-secondary text-text-secondary border border-border",
  failed: "bg-text/[0.08] text-text border border-text/25",
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Mapeia o status da assinatura para a chave de tradução em `payments`. */
const SUBSCRIPTION_STATUS_KEY: Record<string, string> = {
  active: "statusActive",
  trialing: "statusTrialing",
  past_due: "statusPastDue",
  canceled: "statusCanceled",
  blocked: "statusBlocked",
  expired: "statusExpired",
  inactive: "statusInactive",
};

/** Mapeia o status do pagamento para a chave de tradução em `subscription`. */
const PAYMENT_STATUS_KEY: Record<string, string> = {
  paid: "historyStatusPaid",
  pending: "historyStatusPending",
  expired: "historyStatusExpired",
  canceled: "historyStatusCanceled",
  refunded: "historyStatusRefunded",
  failed: "historyStatusFailed",
};

export function MembershipPanel({
  locale,
  language,
  subscription,
  payments,
  access,
}: {
  locale: string;
  language: string | null;
  subscription: MembershipSubscription | null;
  payments: MembershipPayment[];
  access: MembershipAccess;
}) {
  const t = useTranslations("subscription");
  const p = useTranslations("payments");
  const router = useRouter();

  const [busy, setBusy] = useState<null | "cancel" | "reactivate" | "card">(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isEn = (language ?? locale) === "en-US";
  const numberLocale = isEn ? "en-US" : "pt-BR";
  const currency = subscription?.currency || (isEn ? "USD" : "BRL");

  const fmtMoney = (cents: number, curr = currency) =>
    new Intl.NumberFormat(numberLocale, { style: "currency", currency: curr }).format(cents / 100);

  const fmtDate = (iso: string | null, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" }) => {
    const d = parseDate(iso);
    return d ? d.toLocaleDateString(numberLocale, opts) : "-";
  };

  // Datas e cálculos derivados do ciclo da assinatura
  const derived = useMemo(() => {
    if (!subscription) return null;
    const now = new Date();
    const periodEnd = parseDate(subscription.current_period_end);
    const periodStart = parseDate(subscription.current_period_start);
    const cycleTotal = subscription.billing_cycle_days ?? 30;

    const chargeDay = periodEnd ? periodEnd.getDate() : null;
    const daysUntil = periodEnd ? Math.ceil((periodEnd.getTime() - now.getTime()) / DAY_MS) : null;

    let countdown: string | null = null;
    if (!subscription.cancel_at_period_end && daysUntil !== null) {
      if (daysUntil > 1) countdown = t("nextChargeIn", { days: daysUntil });
      else if (daysUntil === 1) countdown = t("nextChargeTomorrow");
      else if (daysUntil === 0) countdown = t("nextChargeToday");
      else countdown = t("nextChargeOverdue", { days: Math.abs(daysUntil) });
    }

    const cycleUsed = periodStart
      ? Math.min(Math.max(Math.ceil((now.getTime() - periodStart.getTime()) / DAY_MS), 0), cycleTotal)
      : 0;

    return { chargeDay, daysUntil, countdown, cycleTotal, cycleUsed };
  }, [subscription, t]);

  const accessReasonText = useMemo(() => {
    const reason = access.reason ?? "";
    if (reason.startsWith("active_until_") || reason.startsWith("staff_")) return t("accessReasonActive");
    if (reason.startsWith("trial_active_until_")) return t("accessReasonTrial");
    if (reason.startsWith("grace_period_until_")) return t("accessReasonGrace", { days: subscription?.grace_days ?? 3 });
    if (reason.startsWith("access_until_end_")) return t("accessReasonCanceled");
    if (reason === "no_subscription" || reason === "profile_not_found") return t("accessReasonNone");
    return t("accessReasonBlocked");
  }, [access.reason, subscription?.grace_days, t]);

  const statusLabel = subscription
    ? p(SUBSCRIPTION_STATUS_KEY[subscription.status] ?? "statusInactive")
    : "";

  const paymentMethodText = useMemo(() => {
    if (!subscription) return t("noPaymentMethod");
    if (subscription.card_last4) {
      return t("cardEnding", {
        brand: subscription.card_brand ? capitalize(subscription.card_brand) : t("cardGeneric"),
        last4: subscription.card_last4,
      });
    }
    if (subscription.payment_method === "pix") return t("pixMethod");
    if (subscription.payment_method) return t("cardGeneric");
    return t("noPaymentMethod");
  }, [subscription, t]);

  const runAction = async (
    kind: "cancel" | "reactivate",
    endpoint: string,
    successText: string
  ) => {
    if (!subscription) return;
    setBusy(kind);
    setFeedback(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: subscription.id, action: kind }),
      });
      if (!res.ok) throw new Error("request_failed");
      setFeedback({ type: "success", text: successText });
      setCancelOpen(false);
      router.refresh();
    } catch {
      setFeedback({ type: "error", text: t("actionError") });
    } finally {
      setBusy(null);
    }
  };

  const handleUpdateCard = async () => {
    setBusy("card");
    setFeedback(null);
    try {
      const res = await fetch("/api/payments/stripe/update-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.href, use_portal: true }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.type === "billing_portal" && data?.url) {
        window.location.href = data.url;
        return;
      }
      setFeedback({ type: "error", text: t("actionError") });
    } catch {
      setFeedback({ type: "error", text: t("actionError") });
    } finally {
      setBusy(null);
    }
  };

  const copyPix = async (paymentId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(paymentId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  // Sem assinatura: convida a assinar
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={20} /> {t("title")}
          </CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<CreditCard size={28} className="text-text-secondary" />}
            title={t("noPlanTitle")}
            description={t("noPlanDesc")}
            className="rounded-2xl border border-border bg-surface-secondary/30"
            action={
              <Button asChild size="lg">
                <a href={`/${locale}/planos`}>
                  {t("viewPlans")}
                  <ArrowRight size={18} className="ml-2" />
                </a>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <Callout variant={feedback.type === "success" ? "success" : "danger"}>{feedback.text}</Callout>
      )}

      {/* Visão geral do plano */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <CreditCard size={20} /> {subscription.plan_name || t("plan")}
              </CardTitle>
              <CardDescription>{t("subtitle")}</CardDescription>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
                STATUS_STYLES[subscription.status] ?? STATUS_STYLES.inactive
              )}
            >
              <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
              {statusLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold text-text">
              {subscription.amount_cents != null ? fmtMoney(subscription.amount_cents) : "-"}
            </span>
            {subscription.billing_cycle_days ? (
              <span className="text-sm text-text-secondary">
                /{p("everyNDays").replace("{n}", String(subscription.billing_cycle_days))}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Alerta de cancelamento agendado */}
      {subscription.cancel_at_period_end && (
        <Callout
          variant="neutral"
          icon={<XCircle size={18} />}
          title={t("cancelScheduledTitle")}
        >
          {t("cancelScheduledDesc", { date: fmtDate(subscription.current_period_end) })}
        </Callout>
      )}

      {/* Alerta de último pagamento recusado */}
      {subscription.last_failed_at && !subscription.cancel_at_period_end && (
        <Callout
          variant="danger"
          icon={<AlertTriangle size={18} />}
          title={t("failedTitle")}
        >
          <div className="space-y-3">
            <p>{t("failedDesc", { date: fmtDate(subscription.last_failed_at) })}</p>
            <Button size="sm" variant="secondary" onClick={handleUpdateCard} disabled={busy === "card"}>
              {busy === "card" ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
              {t("regularize")}
            </Button>
          </div>
        </Callout>
      )}

      {/* Informações-chave: cobrança, ciclo e acesso */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-3">
            <CalendarClock size={18} className="text-primary" />
            <span className="text-sm font-medium">{t("chargeDay")}</span>
          </div>
          <p className="text-xl font-bold text-text">
            {derived?.chargeDay ? t("chargeDayValue", { day: derived.chargeDay }) : "-"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {subscription.cancel_at_period_end ? t("noNextCharge") : derived?.countdown ?? t("noNextCharge")}
          </p>
          {!subscription.cancel_at_period_end && subscription.current_period_end && (
            <p className="mt-1 text-xs text-text-secondary">{fmtDate(subscription.current_period_end, { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-3">
            <Repeat size={18} className="text-primary" />
            <span className="text-sm font-medium">{t("cycleTitle")}</span>
          </div>
          <Progress value={derived?.cycleUsed ?? 0} max={derived?.cycleTotal ?? 30} className="mb-2" />
          <p className="text-sm text-text-secondary">
            {t("cycleProgress", { used: derived?.cycleUsed ?? 0, total: derived?.cycleTotal ?? 30 })}
          </p>
          <p className="mt-1 text-sm font-medium text-text">
            {subscription.cancel_at_period_end
              ? t("cycleEndsOn", { date: fmtDate(subscription.current_period_end) })
              : t("cycleRenewsOn", { date: fmtDate(subscription.current_period_end) })}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-3">
            {access.allowed ? (
              <ShieldCheck size={18} className="text-primary" />
            ) : (
              <ShieldAlert size={18} className="text-text" />
            )}
            <span className="text-sm font-medium">{t("accessTitle")}</span>
          </div>
          <p className={cn("text-lg font-bold", access.allowed ? "text-primary" : "text-text")}>
            {access.allowed ? t("accessGranted") : t("accessBlocked")}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{accessReasonText}</p>
          {access.allowed && subscription.current_period_end && (
            <p className="mt-1 text-xs text-text-secondary">
              {t("accessUntil", { date: fmtDate(subscription.current_period_end, { day: "2-digit", month: "2-digit", year: "numeric" }) })}
            </p>
          )}
        </Card>
      </div>

      {/* Forma de pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet size={20} /> {t("paymentMethodTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-secondary/30 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-secondary">
                <CreditCard size={20} className="text-text-secondary" />
              </div>
              <div>
                <p className="font-medium text-text">{paymentMethodText}</p>
                {subscription.provider && (
                  <p className="text-xs text-text-secondary uppercase tracking-wide">{subscription.provider}</p>
                )}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleUpdateCard} disabled={busy === "card"}>
              {busy === "card" ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
              {t("changePayment")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={20} /> {t("historyTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-text-secondary py-6 text-center">{t("historyEmpty")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((item) => {
                const isPix = item.method === "pix";
                const methodLabel = isPix ? t("historyMethodPix") : t("historyMethodCard");
                const methodDetail = !isPix && item.card_last4
                  ? ` • ${item.card_brand ? capitalize(item.card_brand) : t("cardGeneric")} •••• ${item.card_last4}`
                  : "";
                const dateValue = item.paid_at ?? item.due_at ?? item.failed_at ?? item.created_at;
                const canCopy = isPix && item.status === "pending" && !!item.pix_copy_paste;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">
                        {fmtMoney(item.amount_cents, item.currency)}
                        <span className="ml-2 text-sm font-normal text-text-secondary">
                          {methodLabel}
                          {methodDetail}
                        </span>
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">{fmtDate(dateValue)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canCopy && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyPix(item.id, item.pix_copy_paste as string)}
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check size={14} className="mr-1.5" /> {t("historyCopied")}
                            </>
                          ) : (
                            <>
                              <Copy size={14} className="mr-1.5" /> {t("historyCopyPix")}
                            </>
                          )}
                        </Button>
                      )}
                      <span
                        className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
                          PAYMENT_STATUS_STYLES[item.status] ?? PAYMENT_STATUS_STYLES.pending
                        )}
                      >
                        {t(PAYMENT_STATUS_KEY[item.status] ?? "historyStatusPending")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" size="lg" asChild>
          <a href={`/${locale}/planos`}>
            <CreditCard size={18} className="mr-2" />
            {t("viewPlans")}
          </a>
        </Button>
        {subscription.cancel_at_period_end ? (
          <Button
            size="lg"
            onClick={() => runAction("reactivate", "/api/payments/stripe/reactivate", t("reactivateSuccess"))}
            disabled={busy === "reactivate"}
          >
            {busy === "reactivate" ? (
              <Loader2 size={18} className="mr-2 animate-spin" />
            ) : (
              <RefreshCw size={18} className="mr-2" />
            )}
            {t("reactivate")}
          </Button>
        ) : (
          <Button variant="destructive" size="lg" onClick={() => setCancelOpen(true)}>
            <XCircle size={18} className="mr-2" />
            {t("cancel")}
          </Button>
        )}
      </div>

      {/* Confirmação de cancelamento */}
      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)}>
        <ModalHeader>
          <ModalTitle>{t("cancelConfirmTitle")}</ModalTitle>
          <ModalClose onClick={() => setCancelOpen(false)} />
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-text-secondary">
            {t("cancelConfirmDesc", { date: fmtDate(subscription.current_period_end) })}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={busy === "cancel"}>
            {t("cancelKeep")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => runAction("cancel", "/api/payments/stripe/cancel", t("cancelSuccess"))}
            disabled={busy === "cancel"}
          >
            {busy === "cancel" ? <Loader2 size={16} className="mr-2 animate-spin" /> : <XCircle size={16} className="mr-2" />}
            {t("cancelConfirm")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
