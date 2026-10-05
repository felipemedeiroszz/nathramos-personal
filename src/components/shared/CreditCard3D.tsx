"use client";

import { cn } from "@/lib/utils";

export interface CreditCard3DProps {
  number?: string;
  holderName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  focusedField?: "number" | "holder" | "expiry" | "cvv" | null;
  brand?: "visa" | "mastercard" | "elo" | "amex" | "hipercard" | null;
}

const placeholders: Record<"number" | "holder" | "expiry" | "cvv", string> = {
  number: "0000 0000 0000 0000",
  holder: "NOME DO TITULAR",
  expiry: "MM/AA",
  cvv: "000",
};

function formatCardNumber(raw: string | undefined, brand: CreditCard3DProps["brand"]): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (brand === "amex") {
    const g1 = digits.slice(0, 4);
    const g2 = digits.slice(4, 10);
    const g3 = digits.slice(10, 15);
    return [g1, g2, g3].filter(Boolean).join(" ");
  }
  return digits.match(/.{1,4}/g)?.join(" ") || "";
}

function formatExpiry(
  month: string | undefined,
  year: string | undefined
): string {
  const m = (month || "").padStart(2, "0").slice(0, 2);
  const y = (year || "").slice(-2);
  if (!m && !y) return "";
  if (m && !y) return m;
  return `${m}/${y}`;
}

function BrandLogo({ brand }: { brand: CreditCard3DProps["brand"] }) {
  if (!brand) return null;
  const base = "h-8 select-none";
  switch (brand) {
    case "visa":
      return (
        <span className={cn(base, "font-black italic text-white tracking-wider text-xl")}>
          VISA
        </span>
      );
    case "mastercard":
      return (
        <div className={cn(base, "flex items-center -space-x-3")}>
          <div className="w-8 h-8 rounded-full bg-red-600 opacity-90" />
          <div className="w-8 h-8 rounded-full bg-yellow-400 opacity-90 mix-blend-multiply" />
        </div>
      );
    case "elo":
      return (
        <span className={cn(base, "flex items-center text-white font-black text-xl tracking-tight")}>
          <span className="text-red-500">e</span>
          <span className="text-yellow-400">l</span>
          <span className="text-blue-500">o</span>
        </span>
      );
    case "amex":
      return (
        <span className={cn(base, "text-white font-black tracking-tighter text-lg")}>
          AMEX
        </span>
      );
    case "hipercard":
      return (
        <span className={cn(base, "text-white font-black text-sm tracking-wide")}>
          HIPERCARD
        </span>
      );
    default:
      return null;
  }
}

const gradientByBrand: Record<NonNullable<CreditCard3DProps["brand"]>, string> = {
  visa: "from-indigo-900 via-indigo-800 to-slate-900",
  mastercard: "from-orange-700 via-red-700 to-rose-900",
  elo: "from-emerald-700 via-teal-700 to-slate-900",
  amex: "from-slate-700 via-slate-600 to-slate-900",
  hipercard: "from-rose-800 via-red-800 to-red-950",
};

export function CreditCard3D({
  number,
  holderName,
  expiryMonth,
  expiryYear,
  cvv,
  focusedField,
  brand,
}: CreditCard3DProps) {
  const isFlipped = focusedField === "cvv";
  const cardNumber = number
    ? formatCardNumber(number, brand)
    : placeholders.number;
  const expiry =
    expiryMonth || expiryYear
      ? formatExpiry(expiryMonth, expiryYear)
      : placeholders.expiry;
  const holder = holderName ? holderName.toUpperCase() : placeholders.holder;
  const cvvDisplay = cvv || placeholders.cvv;
  const gradient = brand ? gradientByBrand[brand] : "from-zinc-800 via-zinc-700 to-zinc-900";

  const focusRing =
    "ring-2 ring-primary/80 ring-offset-0 shadow-[0_0_24px_hsl(var(--primary)/0.35)] border-primary/80";

  return (
    <div
      className="w-full perspective-[1000px] flex justify-center"
      aria-label="Cartao de credito visual"
    >
      <div
        className={cn(
          "relative w-full max-w-[430px] h-[270px] max-md:max-w-[310px] max-md:h-[200px]",
          "transition-transform duration-700 ease-out [transform-style:preserve-3d]",
          isFlipped && "[transform:rotateY(180deg)]"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-2xl bg-gradient-to-br",
            gradient,
            "p-6 shadow-2xl border border-white/10 overflow-hidden",
            "[backface-visibility:hidden]",
            "flex flex-col justify-between"
          )}
          style={{ transform: "rotateY(0deg)" }}
        >
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 w-60 h-60 rounded-full bg-black/30 blur-3xl" />

          <div className="relative flex items-start justify-between">
            <div
              className={cn(
                "w-12 h-9 rounded-md bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-800 border border-yellow-900/40 relative overflow-hidden shadow-inner"
              )}
            >
              <div className="absolute inset-1 grid grid-cols-3 grid-rows-3 gap-0.5 opacity-60">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-yellow-900/60 rounded-[1px]" />
                ))}
              </div>
            </div>
            <BrandLogo brand={brand} />
          </div>

          <div className="relative space-y-3">
            <div
              className={cn(
                "rounded-lg px-3 py-2 transition-all duration-300 border border-transparent",
                focusedField === "number" && focusRing
              )}
            >
              <p
                className={cn(
                  "font-mono tracking-[0.2em] text-white/95 drop-shadow-sm",
                  "text-xl max-md:text-base"
                )}
                aria-label="Numero do cartao"
              >
                {cardNumber || "\u00A0"}
              </p>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div
                className={cn(
                  "flex-1 min-w-0 rounded-lg px-3 py-1.5 transition-all duration-300 border border-transparent",
                  focusedField === "holder" && focusRing
                )}
              >
                <p className="text-[10px] uppercase tracking-widest text-white/50 max-md:text-[9px]">
                  Titular
                </p>
                <p
                  className={cn(
                    "font-medium text-white/95 truncate",
                    "text-sm max-md:text-xs"
                  )}
                  aria-label="Nome do titular"
                >
                  {holder || "\u00A0"}
                </p>
              </div>

              <div
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 transition-all duration-300 border border-transparent",
                  focusedField === "expiry" && focusRing
                )}
              >
                <p className="text-[10px] uppercase tracking-widest text-white/50 max-md:text-[9px]">
                  Validade
                </p>
                <p
                  className={cn(
                    "font-mono font-medium text-white/95",
                    "text-sm max-md:text-xs"
                  )}
                  aria-label="Validade do cartao"
                >
                  {expiry || "\u00A0"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 rounded-2xl bg-gradient-to-br",
            gradient,
            "shadow-2xl border border-white/10 overflow-hidden",
            "[backface-visibility:hidden]",
            "flex flex-col"
          )}
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="mt-6 h-12 w-full bg-black/90" />
          <div className="px-6 pt-5 flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 flex-1 bg-neutral-200 rounded px-4 flex items-center justify-end border border-neutral-300">
                <span
                  className={cn(
                    "font-mono tracking-widest text-neutral-800",
                    "text-lg max-md:text-base"
                  )}
                  aria-label="Codigo de seguranca CVV"
                >
                  {cvvDisplay}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "self-end rounded-lg px-3 py-1.5 transition-all duration-300 border border-transparent",
                focusedField === "cvv" && focusRing
              )}
            >
              <p className="text-[10px] uppercase tracking-widest text-white/50 max-md:text-[9px]">
                CVV
              </p>
            </div>
          </div>
          <div className="px-6 pb-5 flex justify-end">
            <BrandLogo brand={brand} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreditCard3D;
