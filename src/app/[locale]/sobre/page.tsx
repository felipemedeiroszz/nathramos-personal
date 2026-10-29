import { TrainerPortrait } from "@/components/public/TrainerPortrait";
import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PublicShell } from "@/components/public/PublicShell";
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
  Target,
  Eye,
  Heart,
  Award,
  GraduationCap,
  Dumbbell,
  MessageCircle,
  Calendar,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Conheça Nath Ramos, educadora física e mentora fitness com mais de 10 anos de experiência em transformar vidas através do movimento e da nutrição.",
};

export default async function SobrePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("about");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  const valueIcons = [Target, Eye, Heart];
  const valueKeys = ["mission", "vision", "valuesTitle2"];

  const credentials = [
    { icon: GraduationCap, label: t("teamCredentials").split(", ")[0] },
    { icon: Award, label: t("teamCredentials").split(", ")[1] },
    { icon: Dumbbell, label: t("teamCredentials").split(", ")[2] },
    { icon: MessageCircle, label: t("teamCredentials").split(", ")[3] },
  ];

  return (
    <>
      <PublicShell locale={locale}>
        <main className="animate-fade-in">
          <section className="public-inner-hero relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28 relative">
              <div className="max-w-3xl space-y-6">
                <Badge variant="outline">{tn("about")}</Badge>
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
                    <Link href={`/${locale}/mentoria`}>{tn("mentoring")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
              <div className="lg:col-span-2 lg:sticky lg:top-28">
                <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-surface">
                  <TrainerPortrait className="aspect-[.8]" />
                  <div className="border-t border-white/[0.07] p-5">
                    <h2 className="text-xl font-medium">{t("teamTitle")}</h2>
                    <p className="mt-2 text-xs text-zinc-500">
                      {t("teamRole")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 space-y-10">
                <div>
                  <Badge variant="outline">{t("storyTitle")}</Badge>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text mt-4 mb-6">
                    {t("storyTitle")}
                  </h2>
                </div>
                <div className="space-y-5 text-text-secondary leading-relaxed text-base md:text-lg">
                  <p>{t("storyParagraph1")}</p>
                  <p>{t("storyParagraph2")}</p>
                  <p>{t("storyParagraph3")}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  {credentials
                    .filter((c) => Boolean(c.label))
                    .map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-4 rounded-xl bg-surface-secondary/60 border border-border/60"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                          <c.icon size={18} className="text-primary" />
                        </div>
                        <span className="text-sm text-text">{c.label}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-surface border-y border-border">
            <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
              <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                <Badge variant="outline">{t("valuesTitle")}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                  {t("valuesTitle")}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => {
                  const Icon = valueIcons[i];
                  const k = valueKeys[i];
                  return (
                    <Card
                      key={k}
                      className="hover:-translate-y-1 transition-transform duration-300"
                    >
                      <CardHeader>
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                          <Icon size={22} className="text-primary" />
                        </div>
                        <CardTitle>{t(`${k}Title`)}</CardTitle>
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
            </div>
          </section>

          <section className="mx-auto max-w-4xl px-4 md:px-6 py-16 md:py-20">
            <Card className="bg-gradient-to-br from-primary/15 via-surface to-surface border-primary/30">
              <CardContent className="p-10 md:p-14 text-center space-y-6">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary shadow-[0_0_30px_hsl(var(--primary)/0.25)] flex items-center justify-center mx-auto">
                  <Calendar size={26} className="text-primary-foreground" />
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
          </section>
        </main>
      </PublicShell>
    </>
  );
}
