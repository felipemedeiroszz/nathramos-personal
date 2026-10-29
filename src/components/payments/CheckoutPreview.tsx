"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  Info,
  Loader2,
  QrCode,
} from "lucide-react";
import { CardPreviewForm } from "./CardPreviewForm";
import type { CheckoutLabels } from "./CheckoutClient";
import { cn } from "@/lib/utils";
import { CheckoutSummary } from "./CheckoutSummary";

const DEMO_PIX_CODE =
  "00020126580014BR.GOV.BCB.PIX0136demo-checkout-preview-00000000-0000-0000-0000-0000000000005204000053039865802BR5913NATH RAMOS6009SAO PAULO62070503***6304ABCD";

interface CheckoutPreviewProps {
  locale: string;
  planName: string;
  priceLabel: string;
  totalTodayLabel: string;
  cycleLabel: string;
  trialDays: number;
  labels: CheckoutLabels;
  notice: string;
}

type Tab = "card" | "pix";

export function CheckoutPreview({
  locale,
  planName,
  priceLabel,
  totalTodayLabel,
  cycleLabel,
  trialDays,
  labels,
  notice,
}: CheckoutPreviewProps) {
  const [tab, setTab] = useState<Tab>("card");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_PIX_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard indisponível
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof CreditCard }> = [
    { id: "card", label: labels.creditCard, icon: CreditCard },
    { id: "pix", label: labels.pix, icon: QrCode },
  ];

  return (
    <div className="checkout-grid">
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
        <div className="flex items-start gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-xs text-primary">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>

        <div
          className="checkout-methods"
          role="group"
          aria-label={labels.method}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-pressed={tab === id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300",
                tab === id
                  ? "bg-primary text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
                  : "text-text-secondary hover:text-text",
              )}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        <div className="checkout-payment-panel">
          {tab === "card" ? (
            <CardPreviewForm labels={labels.card} notice={notice} />
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-primary">
                <QrCode size={18} />
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                  {labels.pixPanel.title}
                </h3>
              </div>

              <p className="text-sm leading-relaxed text-text-secondary">
                {labels.pixPanel.instructions}
              </p>

              <div className="flex justify-center">
                <div className="flex h-52 w-52 flex-col items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-white text-black/40 shadow-[0_0_35px_hsl(var(--primary)/0.15)]">
                  <QrCode size={72} />
                  <span className="text-xs uppercase tracking-widest">
                    QR Code PIX
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  {labels.pixPanel.copyPaste}
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-background/60 px-3 py-3">
                    <p className="truncate font-mono text-xs text-text-secondary">
                      {DEMO_PIX_CODE}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-300",
                      copied
                        ? "bg-primary/15 text-primary"
                        : "bg-primary text-primary-foreground hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)]",
                    )}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span className="hidden sm:inline">
                      {copied ? labels.pixPanel.copied : labels.pixPanel.copy}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-text-secondary/80">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span>{labels.pixPanel.awaiting}</span>
              </div>
            </div>
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

      <CheckoutSummary
        locale={locale}
        planName={planName}
        priceLabel={priceLabel}
        totalTodayLabel={totalTodayLabel}
        cycleLabel={cycleLabel}
        trialDays={trialDays}
        method={tab}
        labels={labels}
        preview
      />
    </div>
  );
}

export default CheckoutPreview;
