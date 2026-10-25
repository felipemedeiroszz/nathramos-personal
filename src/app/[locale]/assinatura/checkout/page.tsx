import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { CheckoutClient } from "@/components/payments/CheckoutClient";
import { PlanService } from "@/services/PlanService";
import { createClientSSR } from "@/lib/supabase/server";
import { canAccessPlatform } from "@/lib/auth/access";
import { formatCurrency } from "@/lib/i18n/format";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);

  const t = await getTranslations("payments");
  const tp = await getTranslations("plans");

  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const access = await canAccessPlatform(user.id);
  if (access.allowed) {
    redirect(`/${locale}/treinos`);
  }

  const plan = await PlanService.getPrimary();

  const isPt = locale === "pt-BR";
  const planName = plan ? (isPt ? plan.name_pt : plan.name_en) : "";

  const cardAvailable = Boolean(
    plan?.stripe_price_id &&
      process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
  const pixAvailable = Boolean(process.env.ASAAS_API_KEY);
  const planAvailable = Boolean(plan && plan.is_active && (cardAvailable || pixAvailable));

  const priceLabel = plan
    ? formatCurrency(plan.price_cents / 100, plan.currency, locale as Locale)
    : "";
  const totalTodayLabel =
    plan && plan.trial_days > 0
      ? formatCurrency(0, plan.currency, locale as Locale)
      : priceLabel;
  const cycleLabel = plan ? tp(`cycle_${plan.billing_cycle_days}` as any) : "";

  return (
    <>
      <PublicHeader locale={locale} />

      <main className="animate-fade-in px-4 md:px-6 pt-20 pb-20 md:pt-28">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="mx-auto max-w-2xl text-center space-y-3 animate-slide-up [animation-fill-mode:both]">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t("checkoutTitle")}
            </h1>
            <p className="text-base text-text-secondary">{t("checkoutSubtitle")}</p>
          </div>

          {!planAvailable || !plan ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-border/60 bg-surface p-8 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <ShieldAlert size={24} className="text-primary" />
              </div>
              <p className="text-text-secondary">{t("paymentError")}</p>
            </div>
          ) : (
            <div className="animate-slide-up [animation-fill-mode:both] [animation-delay:120ms]">
              <CheckoutClient
                locale={locale}
                planId={plan.id}
                planName={planName}
                priceLabel={priceLabel}
                totalTodayLabel={totalTodayLabel}
                cycleLabel={cycleLabel}
                trialDays={plan.trial_days}
                cardAvailable={cardAvailable}
                pixAvailable={pixAvailable}
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
          )}
        </div>
      </main>

      <PublicFooter locale={locale} />
    </>
  );
}
