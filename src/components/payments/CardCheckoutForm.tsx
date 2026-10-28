"use client";

import { useState } from "react";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeCardNumberElementChangeEvent } from "@stripe/stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { AnimatedCard, type CardBrand, type CardField } from "./AnimatedCard";
import { cn } from "@/lib/utils";

const elementStyle = {
  base: {
    color: "#f5f5f5",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSize: "16px",
    fontSmoothing: "antialiased",
    "::placeholder": { color: "#6b6b6b" },
    iconColor: "#FFD400",
  },
  invalid: { color: "#f87171", iconColor: "#f87171" },
};

export interface CardFormLabels {
  number: string;
  holder: string;
  holderPlaceholder: string;
  expiry: string;
  cvv: string;
  submit: string;
  processing: string;
  secureNote: string;
  invalidName: string;
  paymentError: string;
  expiresLabel: string;
  holderLabel: string;
  cvvLabel: string;
}

interface CardCheckoutFormProps {
  planId: string;
  clientSecret: string;
  labels: CardFormLabels;
  onSuccess: () => void;
}

const brandMap: Record<string, CardBrand> = {
  visa: "visa",
  mastercard: "mastercard",
  amex: "amex",
  discover: "discover",
  elo: "elo",
  hipercard: "hipercard",
};

export function CardCheckoutForm({
  planId,
  clientSecret,
  labels,
  onSuccess,
}: CardCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [holder, setHolder] = useState("");
  const [brand, setBrand] = useState<CardBrand>(null);
  const [numberComplete, setNumberComplete] = useState(false);
  const [focusedField, setFocusedField] = useState<CardField>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret || submitting) return;

    setError(null);

    if (!holder.trim()) {
      setError(labels.invalidName);
      return;
    }

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setError(labels.paymentError);
      return;
    }

    setSubmitting(true);

    try {
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardNumber,
            billing_details: { name: holder },
          },
        },
      );

      if (setupError) {
        setError(setupError.message ?? labels.paymentError);
        setSubmitting(false);
        return;
      }

      const paymentMethodId =
        typeof setupIntent?.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id;

      if (!paymentMethodId) {
        setError(labels.paymentError);
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/payments/checkout/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          payment_method_id: paymentMethodId,
          setup_intent_id: setupIntent?.id,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          typeof data?.error === "string" ? data.error : labels.paymentError,
        );
        setSubmitting(false);
        return;
      }

      if (data?.requires_action && data?.client_secret) {
        const { error: confirmError, paymentIntent } =
          await stripe.confirmCardPayment(data.client_secret as string);
        if (
          confirmError ||
          (paymentIntent && paymentIntent.status !== "succeeded")
        ) {
          setError(confirmError?.message ?? labels.paymentError);
          setSubmitting(false);
          return;
        }
      }

      const verification = await fetch("/api/payments/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: data.subscription_id }),
      });
      const verified = await verification.json();
      if (
        !verification.ok ||
        !["active", "trialing"].includes(verified.status)
      ) {
        throw new Error(labels.paymentError);
      }
      onSuccess();
    } catch {
      setError(labels.paymentError);
      setSubmitting(false);
    }
  };

  const fieldWrapper = (field: CardField) =>
    cn(
      "rounded-xl border bg-background/60 px-4 py-3 transition-all duration-300",
      focusedField === field
        ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
        : "border-border/60 hover:border-primary/30",
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AnimatedCard
        holder={holder}
        brand={brand}
        flipped={focusedField === "cvv"}
        focusedField={focusedField}
        numberComplete={numberComplete}
        expiresLabel={labels.expiresLabel}
        holderLabel={labels.holderLabel}
        cvvLabel={labels.cvvLabel}
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-text-secondary"
            htmlFor="cardHolder"
          >
            {labels.holder}
          </label>
          <input
            id="cardHolder"
            type="text"
            value={holder}
            onChange={(e) => setHolder(e.target.value.toUpperCase())}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
            placeholder={labels.holderPlaceholder}
            autoComplete="cc-name"
            className={cn(
              "w-full rounded-xl border bg-background/60 px-4 py-3 text-base text-text outline-none transition-all duration-300 placeholder:text-text-secondary/50",
              focusedField === "name"
                ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                : "border-border/60 hover:border-primary/30",
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">
            {labels.number}
          </label>
          <div className={fieldWrapper("number")}>
            <CardNumberElement
              options={{
                style: elementStyle,
                showIcon: true,
                placeholder: "0000 0000 0000 0000",
              }}
              onChange={(event: StripeCardNumberElementChangeEvent) => {
                setBrand(brandMap[event.brand] ?? null);
                setNumberComplete(event.complete);
              }}
              onFocus={() => setFocusedField("number")}
              onBlur={() => setFocusedField(null)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">
              {labels.expiry}
            </label>
            <div className={fieldWrapper("expiry")}>
              <CardExpiryElement
                options={{ style: elementStyle }}
                onFocus={() => setFocusedField("expiry")}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">
              {labels.cvv}
            </label>
            <div className={fieldWrapper("cvv")}>
              <CardCvcElement
                options={{ style: elementStyle, placeholder: "•••" }}
                onFocus={() => setFocusedField("cvv")}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !stripe}
        className="group relative inline-flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-[0_0_35px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_0_55px_hsl(var(--primary)/0.5)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {!submitting && (
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
        )}
        {submitting ? (
          <>
            <Loader2 size={18} className="relative animate-spin" />
            <span className="relative">{labels.processing}</span>
          </>
        ) : (
          <>
            <Lock size={18} className="relative" />
            <span className="relative">{labels.submit}</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-text-secondary/80">
        <ShieldCheck size={14} className="text-primary" />
        <span>{labels.secureNote}</span>
      </div>
    </form>
  );
}

export default CardCheckoutForm;
