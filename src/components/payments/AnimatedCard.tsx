"use client";

import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

const COVER_COUNT = 25;

/** Camada de fundo do cartão: imagem aleatória + gradiente preto→dourado. */
function CardCover({ index }: { index: number | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[#111111]">
      {index !== null && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/card-backgrounds/${index}.jpeg`}
          alt=""
          aria-hidden="true"
          className="h-full w-full animate-fade-in object-cover"
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.92),rgba(15,15,15,0.78),rgba(255,204,0,0.30))]" />
    </div>
  );
}

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "elo" | "hipercard" | null;

export type CardField = "number" | "name" | "expiry" | "cvv" | null;

interface AnimatedCardProps {
  holder: string;
  brand: CardBrand;
  flipped: boolean;
  focusedField: CardField;
  numberComplete: boolean;
  /** Somente para demonstração: quando informado, exibe os dígitos digitados em vez das máscaras. */
  number?: string;
  expiry?: string;
  cvv?: string;
  expiresLabel: string;
  holderLabel: string;
  cvvLabel: string;
  className?: string;
}

function BrandMark({ brand }: { brand: CardBrand }) {
  if (brand === "mastercard") {
    return (
      <div className="relative flex h-7 w-12 items-center">
        <span className="absolute left-0 h-7 w-7 rounded-full bg-[#EB001B]" />
        <span className="absolute left-5 h-7 w-7 rounded-full bg-[#F79E1B] opacity-90" />
      </div>
    );
  }

  const label =
    brand === "visa"
      ? "VISA"
      : brand === "amex"
      ? "AMEX"
      : brand === "discover"
      ? "DISCOVER"
      : brand === "elo"
      ? "ELO"
      : brand === "hipercard"
      ? "HIPERCARD"
      : null;

  if (!label) {
    return (
      <div className="flex h-7 w-12 items-center justify-center rounded-md border border-primary/25 bg-white/5">
        <span className="h-3.5 w-8 rounded-sm bg-primary/25" />
      </div>
    );
  }

  return (
    <div className="flex h-7 items-center rounded-md border border-primary/25 bg-white/5 px-2">
      <span className="text-[11px] font-extrabold italic tracking-wide text-primary">{label}</span>
    </div>
  );
}

function maskGroups(brand: CardBrand) {
  return brand === "amex"
    ? [4, 6, 5]
    : [4, 4, 4, 4];
}

export function AnimatedCard({
  holder,
  brand,
  flipped,
  focusedField,
  numberComplete,
  number,
  expiry,
  cvv,
  expiresLabel,
  holderLabel,
  cvvLabel,
  className,
}: AnimatedCardProps) {
  const groups = maskGroups(brand);
  const digits = (number ?? "").replace(/\D/g, "");
  const showReal = number !== undefined;

  const [cover, setCover] = useState<number | null>(null);

  useEffect(() => {
    setCover(Math.floor(Math.random() * COVER_COUNT) + 1);
  }, []);

  const groupText = (index: number) => {
    const length = groups[index];
    if (!showReal) return Array.from({ length }).map(() => "\u2022").join("");
    const start = groups.slice(0, index).reduce((total, size) => total + size, 0);
    return Array.from({ length }, (_, offset) => digits[start + offset] ?? "\u2022").join("");
  };

  return (
    <div className={cn("[perspective:1400px]", className)}>
      <div
        className={cn(
          "relative mx-auto h-[212px] w-full max-w-[380px] transition-transform duration-700 ease-out [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        {/* Frente */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-primary/25 bg-[#111111] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] [backface-visibility:hidden]">
          <CardCover index={cover} />

          <div className="relative flex h-full flex-col justify-between p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Chip */}
                <div className="relative h-9 w-12 rounded-md bg-gradient-to-br from-[#FFE680] via-[#FFD400] to-[#C79E00] shadow-inner">
                  <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-black/20" />
                  <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-black/20" />
                  <span className="absolute left-0 top-1/4 h-1/2 w-full rounded-sm border border-black/10" />
                </div>
                <Wifi size={18} className="rotate-90 text-primary/70" />
              </div>
              <BrandMark brand={brand} />
            </div>

            <div
              className={cn(
                "flex flex-col gap-1 rounded-lg px-2 py-1.5 transition-all duration-300",
                focusedField === "number" && "bg-primary/10 ring-1 ring-primary/40"
              )}
            >
              <div className="flex items-center gap-2 font-mono text-lg tracking-[0.18em] text-text sm:text-xl">
                {groups.map((_, gi) => (
                  <span
                    key={gi}
                    className={cn(
                      "transition-colors duration-300",
                      numberComplete
                        ? "text-primary"
                        : focusedField === "number"
                        ? "text-primary/80"
                        : "text-text-secondary/60"
                    )}
                  >
                    {groupText(gi)}
                  </span>
                ))}
              </div>
              <span className="text-[10px] uppercase tracking-widest text-text-secondary/70">
                {brand === "amex" ? "American Express" : brand === "visa" ? "Visa" : brand ? brand : "\u00A0"}
              </span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-lg px-2 py-1.5 transition-all duration-300",
                  focusedField === "name" && "bg-primary/10 ring-1 ring-primary/40"
                )}
              >
                <p className="text-[9px] uppercase tracking-widest text-text-secondary/70">{holderLabel}</p>
                <p className="truncate text-sm font-medium uppercase tracking-wide text-text">
                  {holder || <span className="text-text-secondary/50">—</span>}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg px-2 py-1.5 transition-all duration-300",
                  focusedField === "expiry" && "bg-primary/10 ring-1 ring-primary/40"
                )}
              >
                <p className="text-[9px] uppercase tracking-widest text-text-secondary/70">{expiresLabel}</p>
                <p className="font-mono text-sm text-text">{expiry || "MM/YY"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verso */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-primary/25 bg-[#111111] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CardCover index={cover} />

          <div className="relative flex h-full flex-col">
            <div className="mt-6 h-11 w-full bg-black" />

            <div className="px-5 pt-4">
              <div className="flex items-center gap-3">
                <div className="h-9 flex-1 rounded-sm bg-gradient-to-r from-white/85 to-white/60" />
                <div
                  className={cn(
                    "flex h-9 w-20 items-center justify-end rounded-sm bg-white/90 px-2 font-mono text-sm text-black transition-all duration-300",
                    focusedField === "cvv" && "ring-2 ring-primary/60"
                  )}
                >
                  {cvv ? "\u2022".repeat(cvv.length) : "\u2022\u2022\u2022"}
                </div>
              </div>
              <p className="mt-2 text-right text-[9px] uppercase tracking-widest text-text-secondary/70">
                {cvvLabel}
              </p>
            </div>

            <div className="mt-auto flex items-end justify-end p-5">
              <BrandMark brand={brand} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnimatedCard;
