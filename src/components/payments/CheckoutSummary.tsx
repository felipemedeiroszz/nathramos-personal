import Link from "next/link";
import { ArrowUpRight, Check, ShieldCheck, ReceiptText } from "lucide-react";
import type { CheckoutLabels } from "./CheckoutClient";

export function CheckoutSummary({
  locale,
  planName,
  priceLabel,
  totalTodayLabel,
  cycleLabel,
  trialDays,
  method,
  labels,
  preview = false,
}: {
  locale: string;
  planName: string;
  priceLabel: string;
  totalTodayLabel: string;
  cycleLabel: string;
  trialDays: number;
  method: "card" | "pix";
  labels: CheckoutLabels;
  preview?: boolean;
}) {
  const en = locale === "en-US";
  return (
    <aside className="checkout-summary" aria-label={labels.planSummary}>
      <div className="checkout-summary-top">
        <p className="checkout-eyebrow">
          <ReceiptText size={14} />
          {labels.planSummary}
        </p>
        <h2 className="mt-5 text-2xl font-medium tracking-tight text-zinc-100">
          {planName}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          {priceLabel} <span className="text-xs">/ {cycleLabel}</span>
        </p>
      </div>
      <div className="p-6 sm:p-7">
        <dl className="space-y-4 text-xs">
          <div className="flex justify-between gap-5">
            <dt className="text-zinc-500">{labels.billingCycle}</dt>
            <dd className="text-right text-zinc-200">{cycleLabel}</dd>
          </div>
          <div className="flex justify-between gap-5">
            <dt className="text-zinc-500">{labels.method}</dt>
            <dd className="text-right text-zinc-200">
              {method === "card" ? labels.creditCard : labels.pix}
            </dd>
          </div>
        </dl>
        <div
          className="my-6 border-y border-white/[.08] py-6"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-xs text-zinc-400">{labels.totalDueToday}</p>
          <p className="mt-2 text-[2.5rem] font-medium leading-tight tracking-[-.05em] text-yellow-300">
            {method === "pix" ? priceLabel : totalTodayLabel}
          </p>
          {method === "card" && trialDays > 0 && (
            <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-yellow-300/80">
              <Check size={14} className="mt-1 shrink-0" />
              {labels.trialNote.replace("{days}", String(trialDays))}
            </p>
          )}
          <p className="mt-3 text-[11px] leading-6 text-zinc-500">
            {method === "pix"
              ? en
                ? "Single payment. No automatic renewal or free trial."
                : "Pagamento único. Sem renovação automática ou teste gratuito."
              : en
                ? `Then ${priceLabel} / ${cycleLabel}. Manage renewal in your billing center.`
                : `Depois, ${priceLabel} / ${cycleLabel}. Gerencie a renovação na central de pagamentos.`}
          </p>
        </div>
        <div className="flex items-start gap-3 text-[11px] leading-6 text-zinc-500">
          <ShieldCheck size={17} className="mt-1 shrink-0 text-yellow-300/70" />
          <p>{labels.secureNote}</p>
        </div>
        {!preview && (
          <details className="mt-6 border-t border-white/[.08] pt-5">
            <summary className="cursor-pointer text-xs text-zinc-400">
              {en
                ? "Already have a pending payment?"
                : "Já existe uma tentativa pendente?"}
            </summary>
            <p className="mt-3 text-[11px] leading-6 text-zinc-500">
              {en
                ? "Review the unpaid attempt before switching methods. Avoid paying twice."
                : "Consulte a tentativa não paga antes de trocar de meio. Evite pagar duas vezes."}
            </p>
            <Link
              href={`/${locale}/assinatura`}
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs text-yellow-300"
            >
              {en ? "Open billing center" : "Abrir central de pagamentos"}
              <ArrowUpRight size={14} />
            </Link>
          </details>
        )}
      </div>
    </aside>
  );
}
