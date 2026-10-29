"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { ArrowLeft, CreditCard, Loader2, QrCode } from "lucide-react";
import { CardCheckoutForm, type CardFormLabels } from "./CardCheckoutForm";
import { PixCheckoutPanel, type PixLabels } from "./PixCheckoutPanel";
import { cn } from "@/lib/utils";
import { CheckoutSummary } from "./CheckoutSummary";

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
  initialMethod?: "card" | "pix";
  planId: string;
  planName: string;
  priceLabel: string;
  totalTodayLabel: string;
  cycleLabel: string;
  trialDays: number;
  cardAvailable: boolean;
  pixAvailable: boolean;
  pixNeedsDocument?: boolean;
  labels: CheckoutLabels;
}

type Tab = "card" | "pix";

export function CheckoutClient({
  locale,
  initialMethod,
  planId,
  planName,
  priceLabel,
  totalTodayLabel,
  cycleLabel,
  trialDays,
  cardAvailable,
  pixAvailable,
  pixNeedsDocument,
  labels,
}: CheckoutClientProps) {
  const router = useRouter();
  const en = locale === "en-US";
  const [tab, setTab] = useState<Tab>(
    initialMethod === "pix" && pixAvailable
      ? "pix"
      : cardAvailable
        ? "card"
        : "pix",
  );
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
          setIntentError(
            typeof data?.error === "string" ? data.error : labels.paymentError,
          );
        } else {
          setClientSecret(String(data.client_secret));
        }
      } catch {
        setIntentError(labels.paymentError);
      } finally {
        setIntentLoading(false);
      }
    })();
  }, [
    tab,
    cardAvailable,
    clientSecret,
    intentAttempt,
    planId,
    labels.paymentError,
  ]);

  const handleSuccess = () => {
    router.push(`/${locale}/assinatura/sucesso`);
  };

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: typeof CreditCard;
    enabled: boolean;
  }> = [
    {
      id: "card",
      label: labels.creditCard,
      icon: CreditCard,
      enabled: cardAvailable,
    },
    { id: "pix", label: labels.pix, icon: QrCode, enabled: pixAvailable },
  ];

  return (
    <div className="checkout-grid">
      {/* Métodos */}
      <div className="lg:col-span-3 space-y-6">
        <div>
          <p className="checkout-eyebrow">
            01 / {locale === "en-US" ? "Payment method" : "Forma de pagamento"}
          </p>
          <h2 className="mt-3 text-xl font-medium tracking-tight text-zinc-100">
            {locale === "en-US"
              ? "How would you like to pay?"
              : "Como você prefere pagar?"}
          </h2>
        </div>
        <div
          className="checkout-methods"
          role="group"
          aria-label={labels.method}
        >
          {tabs.map(({ id, label, icon: Icon, enabled }) => (
            <button
              key={id}
              aria-pressed={tab === id}
              type="button"
              disabled={!enabled}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300",
                tab === id
                  ? "bg-primary text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
                  : "text-text-secondary hover:text-text",
                !enabled &&
                  "cursor-not-allowed opacity-40 hover:text-text-secondary",
              )}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        <div className="checkout-payment-panel">
          <div className="checkout-terms-note">
            <strong>
              {tab === "pix"
                ? en
                  ? "One-off payment"
                  : "Pagamento avulso"
                : en
                  ? "Recurring subscription"
                  : "Assinatura recorrente"}
            </strong>
            <p className="mt-2 text-text-secondary">
              {tab === "pix"
                ? en
                  ? "Pay the full amount shown. Access starts after confirmation and ends with the paid period. PIX does not renew automatically and has no free trial."
                  : "Pague o valor integral exibido. O acesso começa após a confirmação e termina ao vencer o período pago. PIX não renova automaticamente e não inclui teste gratuito."
                : en
                  ? "Your card will be charged each billing cycle. Complete any authentication requested by your bank. Manage or cancel renewal in your billing center."
                  : "O cartão será cobrado a cada ciclo contratado. Conclua a autenticação solicitada pelo seu banco. Gerencie ou cancele a renovação na central de pagamentos."}
            </p>
          </div>
          {tab === "card" ? (
            intentLoading ? (
              <div
                role="status"
                className="flex flex-col items-center justify-center gap-3 py-16 text-text-secondary"
              >
                <Loader2 size={26} className="animate-spin text-primary" />
                <p className="text-sm">{labels.preparing}</p>
              </div>
            ) : intentError || !clientSecret ? (
              <div className="space-y-4 py-10 text-center">
                <p role="alert" className="text-sm text-red-400">
                  {intentError ?? labels.paymentError}
                </p>
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
            <PixCheckoutPanel
              needsDocument={pixNeedsDocument}
              locale={locale}
              planId={planId}
              labels={labels.pixPanel}
              onSuccess={handleSuccess}
            />
          )}
        </div>

        <Link
          href={`/${locale}/assinatura`}
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-primary"
        >
          <ArrowLeft size={15} />
          {en ? "Back to billing center" : "Voltar à central de pagamentos"}
        </Link>
      </div>

      {/* Resumo */}
      <CheckoutSummary
        locale={locale}
        planName={planName}
        priceLabel={priceLabel}
        totalTodayLabel={totalTodayLabel}
        cycleLabel={cycleLabel}
        trialDays={trialDays}
        method={tab}
        labels={labels}
      />
    </div>
  );
}

export default CheckoutClient;
