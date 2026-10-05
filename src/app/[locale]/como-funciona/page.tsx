import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  UserPlus,
  ClipboardList,
  Users,
  Trophy,
  Check,
  Rocket,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Como Funciona",
  description:
    "Entenda todo o processo de acompanhamento da Nath Ramos: cadastro, avaliação, plano personalizado e resultados.",
};

const stepIcons = [UserPlus, ClipboardList, Users, Trophy];

export default async function ComoFuncionaPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("howItWorksPage");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  return (
    <>
      <PublicHeader locale={locale} />

      <main className="animate-fade-in">
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28 relative">
            <div className="max-w-3xl space-y-6">
              <Badge variant="outline">{tn("howItWorks")}</Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text text-balance leading-tight">
                {t("heroTitle")}
              </h1>
              <p className="text-lg md:text-xl text-text-secondary max-w-2xl">
                {t("heroSubtitle")}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <Badge variant="outline">{t("timelineTitle")}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t("timelineTitle")}
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px hidden sm:block" />

            <div className="space-y-16">
              {[1, 2, 3, 4].map((step, idx) => {
                const Icon = stepIcons[step - 1];
                const isLeft = idx % 2 === 0;

                return (
                  <div
                    key={step}
                    className={`relative sm:grid sm:grid-cols-2 sm:gap-12 ${isLeft ? "" : "sm:[&>*:first-child]:order-2"}`}
                  >
                    <div className="absolute left-6 md:left-1/2 top-0 -translate-x-1/2 z-10 hidden sm:block">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold text-lg text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.25)] border-4 border-background">
                        {step}
                      </div>
                    </div>

                    <div className={`sm:pr-16 ${isLeft ? "" : "sm:pl-16 sm:pr-0"} pl-20 sm:pl-0`}>
                      <div className="sm:hidden mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold text-lg text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.25)]">
                          {step}
                        </div>
                      </div>
                      <Card className="border-border/60 hover:-translate-y-1 transition-transform duration-300">
                        <CardHeader>
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                            <Icon size={22} className="text-primary" />
                          </div>
                          <CardTitle className="text-xl">
                            {t(`step${step}Title`)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <p className="text-text-secondary leading-relaxed">
                            {t(`step${step}Desc`)}
                          </p>
                          <ul className="space-y-3">
                            {[1, 2, 3].map((d) => (
                              <li key={d} className="flex items-start gap-3">
                                <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                  <Check size={14} className="text-primary" />
                                </div>
                                <span className="text-sm text-text-secondary">
                                  {t(`step${step}Detail${d}`)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="hidden sm:block" />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-surface border-t border-border">
          <div className="mx-auto max-w-4xl px-4 md:px-6 py-16 md:py-20">
            <Card className="bg-gradient-to-br from-primary/15 via-surface to-surface border-primary/30">
              <CardContent className="p-10 md:p-14 text-center space-y-6">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary shadow-[0_0_30px_hsl(var(--primary)/0.25)] flex items-center justify-center">
                  <Rocket size={26} className="text-primary-foreground" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                  {t("ctaTitle")}
                </h2>
                <p className="text-lg text-text-secondary max-w-xl mx-auto">
                  {t("ctaSubtitle")}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Button asChild size="lg">
                    <Link href={`/${locale}/cadastro`}>{t("ctaButton")}</Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href={`/${locale}/planos`}>{tn("plans")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </>
  );
}
