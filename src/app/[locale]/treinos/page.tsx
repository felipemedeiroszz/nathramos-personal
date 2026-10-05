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
  Dumbbell,
  Flame,
  Gauge,
  Activity,
  Check,
  CalendarDays,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Treinos",
  description:
    "Programas de treino personalizados: hipertrofia, emagrecimento, força e funcional. Adaptados ao seu nível e objetivos.",
};

const typeIcons = [Dumbbell, Flame, Gauge, Activity];
const typeKeys = ["hypertrophy", "fatLoss", "strength", "functional"];

export default async function TreinosPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("workoutsPage");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  const benefitKeys = Array.from({ length: 6 }, (_, i) => `benefit${i + 1}`);
  const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];

  return (
    <>
      <PublicHeader locale={locale} />

      <main className="animate-fade-in">
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28 relative">
            <div className="max-w-3xl space-y-6">
              <Badge variant="outline">{tn("workouts")}</Badge>
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
                  <Link href={`/${locale}/como-funciona`}>{tn("howItWorks")}</Link>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1, 2, 3].map((i) => {
              const Icon = typeIcons[i];
              const k = typeKeys[i];
              return (
                <Card
                  key={k}
                  className="group hover:-translate-y-1 transition-transform duration-300 border-border/60"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon size={22} className="text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-xl mt-3">
                      {t(`${k}Title`)}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
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
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <Badge variant="outline">{t("benefitsTitle")}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                {t("benefitsTitle")}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefitKeys.map((k) => (
                <div
                  key={k}
                  className="flex items-start gap-4 p-6 rounded-2xl bg-surface-secondary/60 border border-border/60"
                >
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-primary" />
                  </div>
                  <span className="text-text-secondary leading-relaxed">
                    {t(k)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <Badge variant="outline">
              <span className="flex items-center gap-2">
                <CalendarDays size={14} />
                {t("exampleTitle")}
              </span>
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              {t("exampleTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {days.map((d, idx) => (
              <Card key={d} className={idx === 6 ? "lg:col-span-4" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t(d)}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {idx === 6 ? "Rest" : `Dia ${idx + 1}`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {t(`${d}Content`)}
                  </p>
                </CardContent>
              </Card>
            ))}
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
                <Button asChild size="lg">
                  <Link href={`/${locale}/cadastro`}>{t("ctaButton")}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </>
  );
}
