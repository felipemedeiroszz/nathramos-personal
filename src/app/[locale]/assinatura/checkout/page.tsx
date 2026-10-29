import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import "@/components/payments/checkout.css";
import { CheckoutClient } from "@/components/payments/CheckoutClient";
import { ProfileService } from "@/lib/payments/services";
import { eligibleTrialDays } from "@/lib/payments/validation";
import { PlanService } from "@/services/PlanService";
import { createClientSSR } from "@/lib/supabase/server";
import { canAccessPlatform } from "@/lib/auth/access";
import { formatCurrency } from "@/lib/i18n/format";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage({
  params: { locale },
  searchParams = {},
}: {
  params: { locale: string };
  searchParams?: { method?: string };
}) {
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

  const availablePlan = await PlanService.getPrimary();
  const plan = availablePlan
    ? {
        ...availablePlan,
        trial_days: await eligibleTrialDays(user.id, availablePlan.trial_days),
      }
    : null;

  const profile = await ProfileService.getProfile(user.id);
  const pixNeedsDocument = !profile?.asaas_customer_id && !profile?.cpf;
  const isPt = locale === "pt-BR";
  const planName = plan ? (isPt ? plan.name_pt : plan.name_en) : "";

  const cardAvailable = Boolean(
    plan?.stripe_price_id &&
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
  const pixAvailable = Boolean(
    process.env.ASAAS_API_KEY && plan?.currency === "BRL",
  );
  const planAvailable = Boolean(
    plan && plan.is_active && (cardAvailable || pixAvailable),
  );

  const priceLabel = plan
    ? formatCurrency(plan.price_cents / 100, plan.currency, locale as Locale)
    : "";
  const totalTodayLabel =
    plan && plan.trial_days > 0
      ? formatCurrency(0, plan.currency, locale as Locale)
      : priceLabel;
  const cycleLabel = plan ? tp(`cycle_${plan.billing_cycle_days}` as any) : "";

  return (
    <PublicShell locale={locale}>
      <main className="checkout-page">
        <div className="space-y-8">
          <div className="checkout-heading space-y-3">
            <p className="checkout-eyebrow">
              {isPt ? "ASSINATURA · FINALIZAR" : "SUBSCRIPTION · CHECKOUT"}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t("checkoutTitle")}
            </h1>
            <p className="text-base text-text-secondary">
              {t("checkoutSubtitle")}
            </p>
          </div>

          {!planAvailable || !plan ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-border/60 bg-surface p-8 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <ShieldAlert size={24} className="text-primary" />
              </div>
              <p className="text-text-secondary">
                {isPt
                  ? "Nenhuma forma de pagamento está disponível para este plano no momento. Consulte a central ou entre em contato com o atendimento."
                  : "No payment method is available for this plan right now. Check your billing center or contact support."}
              </p>
              <a
                className="block text-primary underline"
                href={`/${locale}/assinatura`}
              >
                {isPt ? "Abrir central de pagamentos" : "Open billing center"}
              </a>
            </div>
          ) : (
            <div className="animate-slide-up [animation-fill-mode:both] [animation-delay:120ms]">
              <CheckoutClient
                locale={locale}
                initialMethod={searchParams.method === "pix" ? "pix" : "card"}
                planId={plan.id}
                planName={planName}
                priceLabel={priceLabel}
                totalTodayLabel={totalTodayLabel}
                cycleLabel={cycleLabel}
                trialDays={plan.trial_days}
                cardAvailable={cardAvailable}
                pixAvailable={pixAvailable}
                pixNeedsDocument={pixNeedsDocument}
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
                  trialNote: t("trialNote", { days: plan.trial_days }),
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
    </PublicShell>
  );
}
