import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PublicShell } from "@/components/public/PublicShell";
import { PlanBanners } from "@/components/shared/PlanBanners";
import { PlanCheckoutButton } from "@/components/shared/PlanCheckoutButton";
import { Card } from "@/components/ui/Card";
import {
  Check,
  Sparkles,
  RefreshCcw,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { PlanService } from "@/services/PlanService";
import { createClientSSR } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/i18n/format";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "Assinatura única com acesso completo a treinos, dietas, hidratação, suplementação, exames, e-books e mentoria 1:1.",
};

const perkIcons = [RefreshCcw, ShieldCheck, Headphones];
const perkKeys = ["noCommitment", "securePayment", "support"] as const;

export default async function PlanosPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { checkout?: string };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("plans");
  const tn = await getTranslations("nav");

  const plan = await PlanService.getPrimary();

  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);
  const autoStartCheckout = searchParams?.checkout === "1";

  const isPt = locale === "pt-BR";
  const name = plan ? (isPt ? plan.name_pt : plan.name_en) : "";
  const description = plan
    ? isPt
      ? plan.description_pt
      : plan.description_en
    : "";
  const badge = plan ? (isPt ? plan.badge_pt : plan.badge_en) : null;

  const banners = (plan?.banners ?? []).filter(
    (b) => b.is_active !== false && b.image_url,
  );

  const featureFlags: Array<[boolean, string]> = plan
    ? [
        [plan.custom_exercises, t("features.workouts")],
        [plan.include_meal_plan, t("features.diets")],
        [plan.include_hydration, t("features.hydration")],
        [plan.include_sleep, t("features.sleep")],
        [plan.include_supplements, t("features.supplements")],
        [plan.include_exams, t("features.exams")],
        [plan.include_ebooks, t("features.ebooks")],
        [plan.chat_support, t("features.chat")],
        [plan.coach_direct_access, t("features.mentoring")],
        [plan.video_meetings_month > 0, t("features.calls")],
      ]
    : [];
  const features = featureFlags
    .filter(([enabled]) => enabled)
    .map(([, label]) => label);

  const cycleLabel = plan ? t(`cycle_${plan.billing_cycle_days}` as any) : "";
  const accent = plan?.highlight_hex ?? undefined;
  const isAvailable = Boolean(plan && plan.is_active);

  return (
    <>
      <PublicShell locale={locale}>
        <main className="animate-fade-in">
          {/* Hero */}
          <section className="public-plan-intro px-5 sm:px-8 pt-16 pb-10 md:pt-20 md:pb-12">
            <div className="mx-auto max-w-5xl space-y-5">
              <div className="inline-flex items-center gap-2 text-primary text-sm font-medium tracking-wider uppercase">
                <span className="w-8 h-px bg-primary/30"></span>
                {tn("plans")}
                <span className="w-8 h-px bg-primary/30"></span>
              </div>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-text">
                {t("heroTitle")}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
                {t("heroSubtitle")}
              </p>
            </div>
          </section>

          {/* Banners */}
          {banners.length > 0 && (
            <section className="px-4 md:px-6 pb-12 md:pb-16">
              <div className="mx-auto max-w-6xl animate-slide-up [animation-fill-mode:both] [animation-delay:100ms]">
                <PlanBanners
                  banners={banners}
                  locale={locale}
                  prevLabel={t("bannerPrev")}
                  nextLabel={t("bannerNext")}
                />
              </div>
            </section>
          )}

          {/* Plano */}
          <section className="px-4 md:px-6 pb-24">
            <div className="mx-auto max-w-5xl">
              {!isAvailable ? (
                <Card className="mx-auto max-w-xl text-center space-y-4 py-10 animate-slide-up [animation-fill-mode:both]">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Sparkles size={24} className="text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-text">
                    {t("noPlanTitle")}
                  </h2>
                  <p className="text-text-secondary">{t("noPlanDesc")}</p>
                  <Link
                    href={`/${locale}/cadastro`}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_45px_hsl(var(--primary)/0.5)]"
                  >
                    {t("cta")}
                  </Link>
                </Card>
              ) : (
                <Card
                  className="overflow-hidden p-0"
                  style={accent ? { borderColor: accent } : undefined}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-5">
                    {/* Identidade e recursos */}
                    <div className="lg:col-span-3 p-6 md:p-10 space-y-6">
                      <div className="space-y-2">
                        {badge && (
                          <span
                            className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-[#050505]"
                            style={{ backgroundColor: accent ?? "#FFD400" }}
                          >
                            {badge}
                          </span>
                        )}
                        <h2 className="text-3xl font-bold text-text">{name}</h2>
                        {description && (
                          <p className="text-text-secondary leading-relaxed">
                            {description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2">
                        <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
                          {t("included")}
                        </h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                          {features.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-3"
                            >
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                <Check size={13} className="text-primary" />
                              </span>
                              <span className="text-sm text-text-secondary">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Preço e CTA */}
                    <div className="lg:col-span-2 flex flex-col justify-center gap-6 border-t border-white/[0.08] bg-gradient-to-br from-primary/[0.06] to-transparent p-6 md:p-10 lg:border-l lg:border-t-0">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span
                            className="text-4xl md:text-5xl font-bold text-text"
                            style={accent ? { color: accent } : undefined}
                          >
                            {formatCurrency(
                              plan!.price_cents / 100,
                              plan!.currency,
                              locale as Locale,
                            )}
                          </span>
                          <span className="text-text-secondary">
                            /{cycleLabel}
                          </span>
                        </div>
                        {plan!.trial_days > 0 && (
                          <p className="text-sm text-primary">
                            {t("trialNote", { days: plan!.trial_days })}
                          </p>
                        )}
                      </div>

                      <PlanCheckoutButton
                        planId={plan?.id ?? null}
                        isAuthenticated={isAuthenticated}
                        locale={locale}
                        autoStart={autoStartCheckout}
                        label={t("checkout.label")}
                        unavailableLabel={t("checkout.unavailable")}
                      />

                      <ul className="space-y-3 pt-2">
                        {perkKeys.map((key, i) => {
                          const Icon = perkIcons[i];
                          return (
                            <li key={key} className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Icon size={16} className="text-primary" />
                              </span>
                              <span className="text-sm text-text-secondary">
                                {t(`perks.${key}`)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </section>
          <section className="mx-auto -mt-12 max-w-5xl px-5 pb-16 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5 sm:p-6">
              <div>
                <h2 className="text-base font-medium">
                  {isPt ? "Ainda tem alguma dúvida?" : "Still have a question?"}
                </h2>
                <p className="mt-2 text-xs text-zinc-500">
                  {isPt
                    ? "Entenda como funciona o acompanhamento antes de dar seu próximo passo."
                    : "Understand how the coaching works before taking your next step."}
                </p>
              </div>
              <Link href={`/${locale}/faq`} className="public-cta-secondary">
                {isPt ? "Consultar dúvidas" : "Read the FAQ"}
              </Link>
            </div>
          </section>
        </main>
      </PublicShell>
    </>
  );
}
