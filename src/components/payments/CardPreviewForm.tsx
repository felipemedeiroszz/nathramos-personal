"use client";

import { useState } from "react";
import { Info, Lock, ShieldCheck } from "lucide-react";
import { AnimatedCard, type CardBrand, type CardField } from "./AnimatedCard";
import type { CardFormLabels } from "./CardCheckoutForm";
import { cn } from "@/lib/utils";

interface CardPreviewFormProps {
  labels: CardFormLabels;
  notice: string;
}

function detectBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^(34|37)/.test(digits)) return "amex";
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (/^6011/.test(digits)) return "discover";
  if (/^(606282|3841)/.test(digits)) return "hipercard";
  if (/^(4011|4312|4389|5041|5066|5090|6277|6362|6363|650)/.test(digits)) return "elo";
  return null;
}

function groupsFor(brand: CardBrand) {
  return brand === "amex" ? [4, 6, 5] : [4, 4, 4, 4];
}

function formatNumber(digits: string, brand: CardBrand) {
  const groups = groupsFor(brand);
  const max = groups.reduce((total, size) => total + size, 0);
  const value = digits.slice(0, max);
  const parts: string[] = [];
  let index = 0;
  for (const size of groups) {
    if (index >= value.length) break;
    parts.push(value.slice(index, index + size));
    index += size;
  }
  return parts.join(" ");
}

function formatExpiry(digits: string) {
  const value = digits.slice(0, 4);
  return value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value;
}

export function CardPreviewForm({ labels, notice }: CardPreviewFormProps) {
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [focusedField, setFocusedField] = useState<CardField>(null);
  const [showNotice, setShowNotice] = useState(false);

  const digits = number.replace(/\D/g, "");
  const brand = detectBrand(digits);
  const groups = groupsFor(brand);
  const maxDigits = groups.reduce((total, size) => total + size, 0);
  const numberComplete = digits.length === maxDigits;

  const fieldWrapper = (field: CardField) =>
    cn(
      "rounded-xl border bg-background/60 px-4 py-3 transition-all duration-300",
      focusedField === field
        ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
        : "border-border/60 hover:border-primary/30"
    );

  const inputClass = (field: CardField) =>
    cn(
      "w-full rounded-xl border bg-background/60 px-4 py-3 text-base text-text outline-none transition-all duration-300 placeholder:text-text-secondary/50",
      focusedField === field
        ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
        : "border-border/60 hover:border-primary/30"
    );

  return (
    <div className="space-y-6">
      <AnimatedCard
        holder={holder}
        brand={brand}
        flipped={focusedField === "cvv"}
        focusedField={focusedField}
        numberComplete={numberComplete}
        number={number}
        expiry={expiry}
        cvv={cvv}
        expiresLabel={labels.expiresLabel}
        holderLabel={labels.holderLabel}
        cvvLabel={labels.cvvLabel}
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary" htmlFor="previewHolder">
            {labels.holder}
          </label>
          <input
            id="previewHolder"
            type="text"
            value={holder}
            onChange={(e) => setHolder(e.target.value.toUpperCase())}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
            placeholder={labels.holderPlaceholder}
            autoComplete="off"
            className={inputClass("name")}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary" htmlFor="previewNumber">
            {labels.number}
          </label>
          <div className={fieldWrapper("number")}>
            <input
              id="previewNumber"
              type="text"
              inputMode="numeric"
              value={formatNumber(digits, brand)}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
              onFocus={() => setFocusedField("number")}
              onBlur={() => setFocusedField(null)}
              placeholder="0000 0000 0000 0000"
              autoComplete="off"
              className="w-full bg-transparent font-mono text-base tracking-wide text-text outline-none placeholder:text-text-secondary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary" htmlFor="previewExpiry">
              {labels.expiry}
            </label>
            <div className={fieldWrapper("expiry")}>
              <input
                id="previewExpiry"
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value.replace(/\D/g, "")))}
                onFocus={() => setFocusedField("expiry")}
                onBlur={() => setFocusedField(null)}
                placeholder="MM/YY"
                autoComplete="off"
                className="w-full bg-transparent font-mono text-base text-text outline-none placeholder:text-text-secondary/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary" htmlFor="previewCvv">
              {labels.cvv}
            </label>
            <div className={fieldWrapper("cvv")}>
              <input
                id="previewCvv"
                type="text"
                inputMode="numeric"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onFocus={() => setFocusedField("cvv")}
                onBlur={() => setFocusedField(null)}
                placeholder="\u2022\u2022\u2022"
                autoComplete="off"
                className="w-full bg-transparent font-mono text-base text-text outline-none placeholder:text-text-secondary/50"
              />
            </div>
          </div>
        </div>
      </div>

      {showNotice && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2.5 text-xs text-primary" role="status">
          <Info size={15} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowNotice(true)}
        className="group relative inline-flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-[0_0_35px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_0_55px_hsl(var(--primary)/0.5)]"
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
        <Lock size={18} className="relative" />
        <span className="relative">{labels.submit}</span>
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-text-secondary/80">
        <ShieldCheck size={14} className="text-primary" />
        <span>{labels.secureNote}</span>
      </div>
    </div>
  );
}

export default CardPreviewForm;
