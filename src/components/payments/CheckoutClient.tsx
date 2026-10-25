"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { ArrowLeft, CreditCard, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { CardCheckoutForm, type CardFormLabels } from "./CardCheckoutForm";
import { PixCheckoutPanel, type PixLabels } from "./PixCheckoutPanel";
import { cn } from "@/lib/utils";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export interface CheckoutLabels {
  planSummary: string;
  plan: string;
  price: string;
  billingCycle: string;
  method: string;
  creditCard: string;
  pix: string;
  backToPlans: string;
  preparing: string;
  retry: string;
  paymentError: string;
  secureNote: string;
  totalDueToday: string;
  trialNote: string;
  card: CardFormLabels;
  pixPanel: PixLabels;
}

interface CheckoutClientProps {
  locale: string;
  planId: string;
  planName: string;
  priceLabel: string;
  totalTodayLabel: string;
  cycleLabel: string;
  trialDays: number;
  cardAvailable: boolean;
  pixAvailable: boolean;
  labels: CheckoutLabels;
}

type Tab = "card" | "pix";

export function CheckoutClient({
  locale,
  planId,
  planName,
  priceLabel,
  totalTodayLabel,
  cycleLabel,
  trialDays,
  cardAvailable,
  pixAvailable,
  labels,
}: CheckoutClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(cardAvailable ? "card" : "pix");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [intentAttempt, setIntentAttempt] = useState(0);

  useEffect(() => {
    if (tab !== "card" || !cardAvailable || clientSecret) return;

    setIntentLoading(true);
    setIntentError(null);

    (async () => {
      try {
        const res = await fetch("/api/payments/checkout/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_id: planId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.client_secret) {
          setIntentError(typeof data?.error === "string" ? data.error : labels.paymentError);
        } else {
          setClientSecret(String(data.client_secret));
        }
      } catch {
        setIntentError(labels.paymentError);
      } finally {
        setIntentLoading(false);
      }
    })();
  }, [tab, cardAvailable, clientSecret, intentAttempt, planId, labels.paymentError]);

  const handleSuccess = () => {
    router.push(`/${locale}/assinatura/sucesso`);
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof CreditCard; enabled: boolean }> = [
    { id: "card", label: labels.creditCard, icon: CreditCard, enabled: cardAvailable },
    { id: "pix", label: labels.pix, icon: QrCode, enabled: pixAvailable },
  ];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      {/* Métodos */}
      <div className="lg:col-span-3 space-y-6">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-surface p-1.5">
          {tabs.map(({ id, label, icon: Icon, enabled }) => (
            <button
              key={id}
              type="button"
              disabled={!enabled}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300",
                tab === id
                  ? "bg-primary text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
                  : "text-text-secondary hover:text-text",
                !enabled && "cursor-not-allowed opacity-40 hover:text-text-secondary"
              )}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-surface p-5 md:p-7">
          {tab === "card" ? (
            intentLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-secondary">
                <Loader2 size={26} className="animate-spin text-primary" />
                <p className="text-sm">{labels.preparing}</p>
              </div>
            ) : intentError || !clientSecret ? (
              <div className="space-y-4 py-10 text-center">
                <p className="text-sm text-red-400">{intentError ?? labels.paymentError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setIntentError(null);
                    setIntentAttempt((n) => n + 1);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border/60 bg-background/40 px-6 text-sm font-semibold text-text transition-all duration-300 hover:border-primary/60 hover:text-primary"
                >
                  {labels.retry}
                </button>
              </div>
            ) : (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#FFD400",
                      colorBackground: "#0b0b0b",
                      colorText: "#f5f5f5",
                    },
                  },
                }}
              >
                <CardCheckoutForm
                  planId={planId}
                  clientSecret={clientSecret}
                  labels={labels.card}
                  onSuccess={handleSuccess}
                />
              </Elements>
            )
          ) : (
            <PixCheckoutPanel planId={planId} labels={labels.pixPanel} onSuccess={handleSuccess} />
          )}
        </div>

        <Link
          href={`/${locale}/planos`}
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft size={15} />
          {labels.backToPlans}
        </Link>
      </div>

      {/* Resumo */}
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-24 space-y-5 rounded-2xl border border-border/60 bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
            {labels.planSummary}
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-text-secondary">{labels.plan}</span>
              <span className="text-sm font-semibold text-text">{planName}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-text-secondary">{labels.billingCycle}</span>
              <span className="text-sm font-semibold text-text">{cycleLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-text-secondary">{labels.method}</span>
              <span className="text-sm font-semibold text-text">
                {tab === "card" ? labels.creditCard : labels.pix}
              </span>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text-secondary">{labels.totalDueToday}</span>
              <span className="text-2xl font-bold text-primary">{totalTodayLabel}</span>
            </div>
            {trialDays > 0 && (
              <p className="text-xs leading-relaxed text-primary/90">
                {labels.trialNote.replace("{days}", String(trialDays))}
              </p>
            )}
            <p className="text-xs text-text-secondary/70">
              {priceLabel} / {cycleLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2.5 text-xs text-text-secondary">
            <ShieldCheck size={15} className="shrink-0 text-primary" />
            <span>{labels.secureNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutClient;
