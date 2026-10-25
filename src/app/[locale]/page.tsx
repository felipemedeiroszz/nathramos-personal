import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Target,
  Dumbbell,
  UtensilsCrossed,
  Droplet,
  MessageSquare,
  TrendingUp,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { HowItWorksCarousel } from "@/components/shared/HowItWorksCarousel";

export const metadata: Metadata = {
  title: "Início",
  description:
    "Acompanhamento fitness personalizado com treinos, dietas, hidratação, suplementação e mentoria 1:1 com Nath Ramos.",
};

const benefitsIcons = [
  Target,
  Dumbbell,
  UtensilsCrossed,
  Droplet,
  MessageSquare,
  TrendingUp,
];

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tn = await getTranslations("nav");

  const heroImages = {
    desktop: locale === "en-US" ? "/hero-ingles-desktop.png" : "/hero-desktop.png",
    mobile: locale === "en-US" ? "/hero-ingles-mobile.png" : "/hero-mobile.png",
  };

  const steps = [
    { title: t("step1Title"), description: t("step1Desc") },
    { title: t("step2Title"), description: t("step2Desc") },
    { title: t("step3Title"), description: t("step3Desc") },
  ];

  return (
    <>
      <PublicHeader locale={locale} />

      <main className="animate-fade-in">
        <section className="relative overflow-hidden min-h-dvh">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
            style={{ backgroundImage: `url('${heroImages.desktop}')`, backgroundSize: 'cover' }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat block md:hidden"
            style={{ backgroundImage: `url('${heroImages.mobile}')`, backgroundSize: 'cover' }}
          />
          <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-6 h-full min-h-dvh flex flex-col justify-end pb-20 md:pb-32">
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 sm:gap-5">
              <div className="w-full sm:w-auto animate-slide-up [animation-delay:120ms] [animation-fill-mode:both]">
                <Link
                  href={`/${locale}/cadastro`}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-8 h-13 text-base font-semibold text-primary-foreground shadow-[0_0_35px_hsl(var(--primary)/0.35)] transition-all duration-300 hover:shadow-[0_0_65px_hsl(var(--primary)/0.6)] hover:scale-[1.04] hover:-translate-y-1 active:scale-[0.99] md:h-14 md:px-10 md:text-lg lg:h-16 lg:px-12 lg:text-xl"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                  <span className="relative">{t("primaryCta")}</span>
                  <ArrowRight className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Link>
              </div>
              <div className="w-full sm:w-auto animate-slide-up [animation-delay:240ms] [animation-fill-mode:both]">
                <Link
                  href={`/${locale}/planos`}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/30 px-8 h-13 text-base font-semibold text-text backdrop-blur-md transition-all duration-300 hover:border-primary/60 hover:bg-background/50 hover:text-primary hover:scale-[1.04] hover:-translate-y-1 active:scale-[0.99] md:h-14 md:px-10 md:text-lg lg:h-16 lg:px-12 lg:text-xl"
                >
                  <span>{t("secondaryCta")}</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="beneficios"
          className="relative overflow-hidden px-4 md:px-6 py-24 md:py-32"
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
            style={{ backgroundImage: "url('/beneficios-desktop.png')", backgroundSize: 'cover' }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat block md:hidden"
            style={{ backgroundImage: "url('/beneficios-mobile.png')", backgroundSize: 'cover' }}
          />
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 text-primary text-sm font-medium tracking-wider uppercase">
                <span className="w-8 h-px bg-primary/30"></span>
                {t("benefitsTitle")}
                <span className="w-8 h-px bg-primary/30"></span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-text">
                {t("benefitsSubtitle")}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => {
                const Icon = benefitsIcons[i - 1];
                return (
                <div
                  key={i}
                  className="group relative p-8 rounded-2xl bg-surface/30 border border-border/40 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="absolute top-6 right-6 text-6xl font-bold text-primary/5 group-hover:text-primary/10 transition-colors">
                    0{i}
                  </div>
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/15 transition-colors">
                      <Icon size={24} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-text mb-3">
                      {t(`benefit${i}Title`)}
                    </h3>
                    <p className="text-text-secondary leading-relaxed">
                      {t(`benefit${i}Desc`)}
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="relative overflow-hidden px-4 md:px-6 py-20 md:py-24"
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
            style={{ backgroundImage: "url('/funciona-desktop.png')", backgroundSize: 'cover' }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat block md:hidden"
            style={{ backgroundImage: "url('/funciona-mobile.png')", backgroundSize: 'cover' }}
          />
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 text-primary text-sm font-medium tracking-wider uppercase">
                <span className="w-8 h-px bg-primary/30"></span>
                {t("howItWorksTitle")}
                <span className="w-8 h-px bg-primary/30"></span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                {t("howItWorksSubtitle")}
              </h2>
            </div>
            <HowItWorksCarousel steps={steps} />
          </div>
        </section>

        <section
          id="faq"
          className="bg-surface border-t border-border"
        >
          <div className="mx-auto max-w-3xl px-4 md:px-6 py-20 md:py-24">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 text-primary text-sm font-medium tracking-wider uppercase">
                <span className="w-8 h-px bg-primary/30"></span>
                {t("faqTitle")}
                <span className="w-8 h-px bg-primary/30"></span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                {t("faqSubtitle")}
              </h2>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-border/40 bg-surface-secondary/30 overflow-hidden hover:border-primary/30 transition-colors"
                >
                  <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none text-text font-medium hover:bg-surface-secondary/50 transition-colors">
                    <span className="flex-1">{t(`faqQ${i}`)}</span>
                    <ChevronDown
                      size={18}
                      className="text-text-secondary shrink-0 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="px-6 pb-5 text-text-secondary leading-relaxed border-t border-border/40 pt-4">
                    {t(`faqA${i}`)}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-20">
          <div className="relative p-10 md:p-14 rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-surface border border-primary/30 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t("ctaTitle")}
            </h2>
            <p className="text-lg text-text-secondary max-w-xl mx-auto">
              {t("ctaSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="lg">
                <Link href={`/${locale}/cadastro`}>{t("primaryCta")}</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href={`/${locale}/sobre`}>{tn("about")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </>
  );
}
