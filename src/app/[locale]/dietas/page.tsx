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
  Scissors,
  TrendingUp,
  Scale,
  Calculator,
  Beef,
  Wheat,
  Droplets,
  Apple,
  Sparkles,
  Info,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dietas",
  description:
    "Planos alimentares personalizados: cutting, bulking e manutenção. Cálculo de TDEE, macros e estratégias nutricionais inteligentes.",
};

const typeIcons = [Scissors, TrendingUp, Scale];
const typeKeys = ["cutting", "bulking", "maintenance"];

const macroIcons = [Beef, Wheat, Droplets];
const macroKeys = ["protein", "carbs", "fats"];

export default async function DietasPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("dietsPage");
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
              <Badge variant="outline">{tn("diets")}</Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text text-balance leading-tight">
                {t("heroTitle")}
              </h1>
              <p className="text-lg md:text-xl text-text-secondary max-w-2xl">
                {t("heroSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button asChild size="lg">
                  <Link href={`/${locale}/cadastro`}>{tc("startNow")}</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/${locale}/treinos`}>{tn("workouts")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <Badge variant="outline">{t("typesTitle")}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t("typesSubtitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => {
              const Icon = typeIcons[i];
              const k = typeKeys[i];
              return (
                <Card
                  key={k}
                  className="group hover:-translate-y-1 transition-transform duration-300 border-border/60"
                >
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Icon size={22} className="text-primary" />
                    </div>
                    <CardTitle className="text-xl">
                      {t(`${k}Title`)}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed pt-1">
                      {t(`${k}Desc`)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="bg-surface border-y border-border">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <Badge variant="outline" className="inline-flex items-center gap-2">
                  <Calculator size={14} />
                  {t("tdeeTitle")}
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                  {t("tdeeSubtitle")}
                </h2>
                <p className="text-text-secondary leading-relaxed text-lg">
                  {t("tdeeExplanation")}
                </p>
                <Card className="bg-surface-secondary/50 border-border/60">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Info size={18} className="text-primary" />
                      </div>
                      <p className="text-text-secondary text-sm leading-relaxed">
                        {t("tdeeComponents")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card className="bg-gradient-to-br from-primary/10 via-surface-secondary/50 to-surface border-primary/20">
                <CardContent className="p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Calculator size={20} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-text">
                      {t("tdeeTitle")}
                    </h3>
                  </div>
                  <div className="space-y-3 pl-1">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm text-text-secondary">Sexo, idade, altura e peso</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm text-text-secondary">Nível de atividade diária</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm text-text-secondary">Efeito térmico dos alimentos</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm text-text-secondary">Ajuste para objetivo específico</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <Badge variant="outline" className="inline-flex items-center gap-2">
              <Apple size={14} />
              {t("macrosTitle")}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t("macrosTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => {
              const Icon = macroIcons[i];
              const k = macroKeys[i];
              return (
                <Card key={k} className="hover:-translate-y-1 transition-transform duration-300 border-border/60">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <Icon size={22} className="text-primary" />
                    </div>
                    <CardTitle className="text-xl">{t(`${k}Title`)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {t(`${k}Desc`)}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="bg-surface border-t border-border">
          <div className="mx-auto max-w-4xl px-4 md:px-6 py-16 md:py-20">
            <Card className="bg-gradient-to-br from-primary/15 via-surface to-surface border-primary/30">
              <CardContent className="p-10 md:p-14 text-center space-y-6">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary shadow-[0_0_30px_hsl(var(--primary)/0.25)] flex items-center justify-center">
                  <Sparkles size={26} className="text-primary-foreground" />
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
                    <Link href={`/${locale}/como-funciona`}>{tn("howItWorks")}</Link>
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
