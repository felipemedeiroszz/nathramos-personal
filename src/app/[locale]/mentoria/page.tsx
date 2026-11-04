import Link from "next/link";
import "@/components/mentoring/mentoring.css";
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
  ArrowUpRight,
  MessageCircle,
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

export default async function MentoriaPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);

  const t = await getTranslations("mentoringPage");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");

  return (
    <>
      <PublicShell locale={locale}>
        <main className="mentoring-public">
          <section className="mentoring-hero border-b border-white/[.07]">
            <div className="public-wrap grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-24">
              <div>
                <p className="public-eyebrow">
                  {locale === "en-US"
                    ? "MENTORING · PERSONAL GUIDANCE"
                    : "MENTORIA · ACOMPANHAMENTO DE PERTO"}
                </p>
                <h1 className="text-[clamp(2.7rem,5vw,4.7rem)] leading-[1.06]">
                  {locale === "en-US" ? "Every step," : "Em cada passo,"}
                  <br />
                  <span className="text-yellow-300">
                    {locale === "en-US"
                      ? "a little closer."
                      : "mais perto de você."}
                  </span>
                </h1>
                <p className="public-copy mt-6 max-w-lg">{t("heroSubtitle")}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={`/${locale}/cadastro`} className="public-cta">
                    {t("ctaButton")}
                    <ArrowUpRight size={17} />
                  </Link>
                  <Link
                    href={`/${locale}/conversas`}
                    className="public-cta-secondary"
                  >
                    {locale === "en-US"
                      ? "I’m already a student"
                      : "Já sou aluno"}
                    <MessageCircle size={16} />
                  </Link>
                </div>
                <p className="mt-6 text-xs text-zinc-500">
                  {locale === "en-US"
                    ? "Conversations, meetings and guidance in one space."
                    : "Conversas, encontros e orientação em um só espaço."}
                </p>
              </div>
              <div className="mentoring-chat-preview" data-reveal>
                <div className="flex items-center gap-3 border-b border-white/[.08] p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-yellow-300/20 bg-yellow-300/5 text-yellow-300">
                    <MessageCircle size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {locale === "en-US"
                        ? "Your coaching space"
                        : "Seu espaço de acompanhamento"}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {locale === "en-US"
                        ? "Illustrative conversation"
                        : "Conversa ilustrativa"}
                    </p>
                  </div>
                </div>
                <div className="space-y-5 p-6 sm:p-8">
                  <p className="text-center text-[9px] uppercase tracking-widest text-zinc-600">
                    {locale === "en-US"
                      ? "GUIDANCE THAT FITS YOUR DAY"
                      : "ORIENTAÇÃO QUE CABE NO SEU DIA"}
                  </p>
                  <div className="ml-8 rounded-2xl rounded-br-sm border border-yellow-300/15 bg-yellow-300/10 p-4 text-sm leading-7 text-zinc-200">
                    {locale === "en-US"
                      ? "How can I organize my workouts this week? 💪"
                      : "Como posso organizar meus treinos nesta semana? 💪"}
                  </div>
                  <div className="mr-8 rounded-2xl rounded-bl-sm border border-white/[.08] bg-white/[.03] p-4 text-sm leading-7 text-zinc-400">
                    {locale === "en-US"
                      ? "Tell me about your available days so we can review your routine together. 🎯"
                      : "Me conte quais dias você tem disponíveis para revisarmos sua rotina juntos. 🎯"}
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-black/20 px-4 py-3 text-xs text-zinc-600">
                    <MessageCircle size={15} />
                    {locale === "en-US"
                      ? "Questions, progress and your next steps…"
                      : "Dúvidas, avanços e seus próximos passos…"}
                  </div>
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
