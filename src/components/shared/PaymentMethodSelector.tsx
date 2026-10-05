"use client";

import { CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaymentMethodSelectorProps {
  value: "credit_card" | "pix";
  onChange: (value: "credit_card" | "pix") => void;
  showPix?: boolean;
  locale: "pt-BR" | "en-US";
}

const labels = {
  "pt-BR": {
    credit_card: "Cartao de Credito",
    pix: "PIX",
  },
  "en-US": {
    credit_card: "Credit Card",
    pix: "PIX",
  },
};

export function PaymentMethodSelector({
  value,
  onChange,
  showPix = true,
  locale,
}: PaymentMethodSelectorProps) {
  const text = labels[locale];
  const methods: Array<{ key: "credit_card" | "pix"; label: string; icon: typeof CreditCard }> = [
    { key: "credit_card", label: text.credit_card, icon: CreditCard },
  ];
  if (showPix) {
    methods.push({ key: "pix", label: text.pix, icon: QrCode });
  }

  const baseButton =
    "flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <div
      role="tablist"
      aria-label={locale === "pt-BR" ? "Metodo de pagamento" : "Payment method"}
      className={cn(
        "grid gap-2 rounded-xl p-1 bg-surface-secondary border border-border",
        methods.length === 2 ? "grid-cols-2" : "grid-cols-1"
      )}
    >
      {methods.map(({ key, label, icon: Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={cn(
              baseButton,
              active
                ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                : "text-text-secondary hover:text-text hover:bg-surface"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-sm">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default PaymentMethodSelector;
