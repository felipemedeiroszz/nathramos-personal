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
  Search,
  Target,
  RefreshCcw,
  Flag,
  Video,
  MessageSquare,
  Crown,
  Sparkles,
  Check,
  CalendarClock,
  ShieldCheck,
  Star,
  FileText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mentoria",
  description:
    "Mentoria 1:1 com Nath Ramos. Acompanhamento exclusivo, reuniões individuais, chat direto e benefícios premium para resultados profundos.",
};

const howItWorksIcons = [Search, Target, RefreshCcw, Flag];
const howItWorksKeys = ["step1", "step2", "step3", "step4"];

const meetingItems = ["meeting1", "meeting2", "meeting3", "meeting4"];
const chatItems = ["chat1", "chat2", "chat3", "chat4"];
const premiumItems = [
  "premium1",
  "premium2",
  "premium3",
  "premium4",
  "premium5",
  "premium6",
];

export default async function MentoriaPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);

  const t = await getTranslations("mentoringPage");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  return (
    <>
      <PublicShell locale={locale}>
        <main className="animate-fade-in">
          <section className="public-inner-hero relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/5 to-transparent pointer-events-none" />
            <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28 relative">
              <div className="max-w-3xl space-y-6">
                <Badge className="inline-flex items-center gap-2">
                  <Crown size={14} />
                  {tn("mentoring")}
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text text-balance leading-tight">
                  {t("heroTitle")}
                </h1>
                <p className="text-lg md:text-xl text-text-secondary max-w-2xl">
                  {t("heroSubtitle")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button asChild size="lg">
                    <Link href={`/${locale}/cadastro`}>{t("ctaButton")}</Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href={`/${locale}/sobre`}>{tc("contact")}</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Badge variant="outline" className="text-xs">
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-primary text-primary" />
                      10 vagas por ciclo
                    </span>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <span className="flex items-center gap-1">
                      <CalendarClock size={12} />
                      90 dias de imersão
                    </span>
                  </Badge>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <Badge variant="outline">{t("howItWorksTitle")}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                {t("howItWorksSubtitle")}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((i) => {
                const Icon = howItWorksIcons[i];
                const k = howItWorksKeys[i];
                return (
                  <Card
                    key={k}
                    className="group hover:-translate-y-1 transition-transform duration-300 border-border/60 relative"
                  >
                    <div className="absolute -top-4 left-6 w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-sm text-primary-foreground">
                      {i + 1}
                    </div>
                    <CardHeader className="pt-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                        <Icon size={22} className="text-primary" />
                      </div>
                      <CardTitle className="text-lg leading-snug">
                        {t(`${k}Title`)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">
                        {t(`${k}Desc`)}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="bg-surface border-y border-border">
            <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-6">
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-2"
                  >
                    <Video size={14} />
                    {t("meetingsTitle")}
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                    {t("meetingsTitle")}
                  </h2>
                  <p className="text-text-secondary text-lg leading-relaxed">
                    {t("meetingsDesc")}
                  </p>
                  <Card className="bg-surface-secondary/50 border-border/60">
                    <CardContent className="p-6 space-y-4">
                      {meetingItems.map((k) => (
                        <div key={k} className="flex items-start gap-3">
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <Video size={13} className="text-primary" />
                          </div>
                          <span className="text-sm text-text-secondary">
                            {t(k)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-2"
                  >
                    <MessageSquare size={14} />
                    {t("chatTitle")}
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                    {t("chatTitle")}
                  </h2>
                  <p className="text-text-secondary text-lg leading-relaxed">
                    {t("chatDesc")}
                  </p>
                  <Card className="bg-surface-secondary/50 border-border/60">
                    <CardContent className="p-6 space-y-4">
                      {chatItems.map((k) => (
                        <div key={k} className="flex items-start gap-3">
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <MessageSquare size={13} className="text-primary" />
                          </div>
                          <span className="text-sm text-text-secondary">
                            {t(k)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <Badge className="inline-flex items-center gap-2">
                <Crown size={14} />
                {t("premiumTitle")}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
                {t("premiumTitle")}
              </h2>
            </div>
            <Card className="bg-gradient-to-br from-primary/10 via-surface-secondary/50 to-surface border-primary/20">
              <CardContent className="p-8 md:p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {premiumItems.map((k, idx) => (
                    <div
                      key={k}
                      className="flex items-start gap-4 p-5 rounded-xl bg-background/40 border border-border/50"
                    >
                      <div className="mt-0.5 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Check size={14} className="text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {String(idx + 1).padStart(2, "0")}
                          </Badge>
                          {idx === 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5"
                            >
                              <span className="flex items-center gap-1">
                                <Crown size={10} className="text-primary" />
                                Top
                              </span>
                            </Badge>
                          )}
                        </div>
                        <span className="text-base text-text-secondary leading-relaxed">
                          {t(k)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="bg-surface border-t border-border">
            <div className="mx-auto max-w-4xl px-4 md:px-6 py-16 md:py-20">
              <Card className="bg-gradient-to-br from-primary/20 via-surface to-surface border-primary/40 shadow-[0_0_60px_hsl(var(--primary)/0.1)]">
                <CardContent className="p-10 md:p-14 text-center space-y-6">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary shadow-[0_0_40px_hsl(var(--primary)/0.35)] flex items-center justify-center">
                    <Crown size={30} className="text-primary-foreground" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={12} className="text-primary" />
                      Acompanhamento exclusivo
                    </span>
                  </Badge>
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
      </PublicShell>
    </>
  );
}
