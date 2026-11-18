import { paymentAvailability } from "@/lib/payments/availability";
import { paymentSupportHref } from "@/lib/payments/support";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import "@/components/payments/checkout.css";
import { CheckoutClient } from "@/components/payments/CheckoutClient";
import { ProfileService } from "@/lib/payments/services";
import { PlanService } from "@/services/PlanService";
import { createClientSSR } from "@/lib/supabase/server";
import { canAccessPlatform } from "@/lib/auth/access";
import { isAccountSuspended } from "@/lib/auth/suspension";
import { formatCurrency } from "@/lib/i18n/format";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage(props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ method?: string }>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const params = await props.params;

  const { locale } = params;

  setRequestLocale(locale);

  const t = await getTranslations("payments");
  const tp = await getTranslations("plans");

  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || isAccountSuspended(user)) {
    redirect(`/${locale}/login`);
  }

  const access = await canAccessPlatform(user.id);
  if (access.allowed) {
    redirect(`/${locale}/treino`);
  }

  const plan = await PlanService.getCheckoutPlan();

  const profile = await ProfileService.getProfile(user.id);
  const pixNeedsDocument = !profile?.asaas_customer_id && !profile?.cpf;
  const isPt = locale === "pt-BR";
  const planName = plan ? (isPt ? plan.name_pt : plan.name_en) : "";

  const {
    cardAvailable,
    pixAvailable,
    available: planAvailable,
  } = paymentAvailability(plan, process.env);
  const supportHref = planAvailable ? "" : await paymentSupportHref(locale);

  const priceLabel = plan
    ? formatCurrency(plan.price_cents / 100, plan.currency, locale as Locale)
    : "";
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
              <h2 className="text-lg font-semibold">
                {isPt
                  ? "Contratação online indisponível"
                  : "Online checkout unavailable"}
              </h2>
              <p className="text-text-secondary">
                {isPt
                  ? "Sua conta foi criada, mas o pagamento online ainda não está disponível. Entre em contato com o atendimento para saber como contratar ou renovar seu acompanhamento."
                  : "Your account has been created, but online payments are not currently available. Contact support to arrange your membership or renewal."}
              </p>
              <a className="block text-primary underline" href={supportHref}>
                {isPt ? "Atendimento e dúvidas" : "Support and questions"}
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

                cycleLabel={cycleLabel}

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
