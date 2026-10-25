import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { CheckoutPreview } from "@/components/payments/CheckoutPreview";
import { PlanService } from "@/services/PlanService";
import { formatCurrency } from "@/lib/i18n/format";
import type { CurrencyT, PlanRow } from "@/lib/supabase/types";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout preview",
  robots: { index: false, follow: false },
};

const KNOWN_CYCLES = [7, 30, 90, 180, 365];

export default async function CheckoutPreviewPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("payments");
  const tp = await getTranslations("plans");

  const isPt = locale === "pt-BR";

  let plan: PlanRow | null = null;
  try {
    plan = await PlanService.getPrimary();
  } catch {
    plan = null;
  }

  const planName = plan
    ? isPt
      ? plan.name_pt
      : plan.name_en
    : isPt
    ? "Plano Completo"
    : "Full Access Plan";

  const currency = (plan?.currency ?? (isPt ? "BRL" : "USD")) as CurrencyT;
  const priceCents = plan?.price_cents ?? (isPt ? 9700 : 1900);
  const billingCycleDays = plan?.billing_cycle_days ?? 30;
  const trialDays = plan?.trial_days ?? 7;

  const cycleKey = KNOWN_CYCLES.includes(billingCycleDays) ? billingCycleDays : 30;

  const priceLabel = formatCurrency(priceCents / 100, currency, locale as Locale);
  const totalTodayLabel = trialDays > 0 ? formatCurrency(0, currency, locale as Locale) : priceLabel;
  const cycleLabel = tp(`cycle_${cycleKey}` as any);

  return (
    <>
      <PublicHeader locale={locale} />

      <main className="animate-fade-in px-4 md:px-6 pt-20 pb-20 md:pt-28">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="mx-auto max-w-2xl text-center space-y-3 animate-slide-up [animation-fill-mode:both]">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("previewTitle")}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t("checkoutTitle")}
            </h1>
            <p className="text-base text-text-secondary">{t("checkoutSubtitle")}</p>
          </div>

          <div className="animate-slide-up [animation-fill-mode:both] [animation-delay:120ms]">
            <CheckoutPreview
              locale={locale}
              planName={planName}
              priceLabel={priceLabel}
              totalTodayLabel={totalTodayLabel}
              cycleLabel={cycleLabel}
              trialDays={trialDays}
              notice={t("previewNotice")}
              labels={{
                planSummary: t("planSummary"),
                plan: t("plan"),
                price: t("price"),
                billingCycle: t("billingCycle"),
                method: t("method"),
                creditCard: t("creditCard"),
                pix: t("pix"),
                backToPlans: t("backToPlans"),
                preparing: t("preparing"),
                retry: t("retry"),
                paymentError: t("paymentError"),
                secureNote: t("secureNote"),
                totalDueToday: t("totalDueToday"),
                trialNote: t("trialNote"),
                card: {
                  number: t("cardNumber"),
                  holder: t("cardHolder"),
                  holderPlaceholder: t("cardHolderPlaceholder"),
                  expiry: t("cardExpiry"),
                  cvv: t("cardCvv"),
                  submit: t("subscribeNow"),
                  processing: t("processing"),
                  secureNote: t("secureNote"),
                  invalidName: t("invalidName"),
                  paymentError: t("paymentError"),
                  expiresLabel: t("cardExpiryShort"),
                  holderLabel: t("cardHolderShort"),
                  cvvLabel: t("cvvShort"),
                },
                pixPanel: {
                  title: t("pixTitle"),
                  qr: t("pixQr"),
                  copyPaste: t("pixCopyPaste"),
                  copy: t("pixCopy"),
                  copied: t("pixCopied"),
                  expires: t("pixExpires"),
                  expired: t("pixExpired"),
                  refresh: t("pixRefresh"),
                  instructions: t("pixInstructions"),
                  awaiting: t("awaitingPayment"),
                  paymentError: t("paymentError"),
                },
              }}
            />
          </div>
        </div>
      </main>

      <PublicFooter locale={locale} />
    </>
  );
}
