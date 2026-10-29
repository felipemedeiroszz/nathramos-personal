import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicShell } from "@/components/public/PublicShell";
import { PlatformPreview } from "@/components/public/PlatformPreview";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  UserRound,
  ChartNoAxesCombined,
  MessageCircle,
  Smartphone,
  Sparkles,
} from "lucide-react";
import "@/components/public/how-it-works.css";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const en = locale === "en-US";
  return {
    title: en ? "How coaching works" : "Como funciona o acompanhamento",
    description: en
      ? "Explore your coaching journey: assessment, personalized planning, guidance and progress."
      : "Conheça as etapas do acompanhamento: avaliação, planejamento personalizado, orientação e evolução.",
    alternates: { canonical: `/${locale}/como-funciona` },
  };
}

export default async function ComoFuncionaPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("howItWorksPage");
  const en = locale === "en-US";
  const copy = (pt: string, english: string) => (en ? english : pt);
  const steps = [
    {
      icon: UserRound,
      title: copy("Primeiro, você.", "First, you."),
      label: copy("Seu ponto de partida", "Your starting point"),
      short: copy("Cadastro e questionário", "Registration and questionnaire"),
      note: copy(
        "Conhecer sua rotina é o começo de um plano que faz sentido para você.",
        "Understanding your routine is the start of a plan that makes sense for you.",
      ),
    },
    {
      icon: ClipboardList,
      title: copy("Um plano com direção.", "A plan with direction."),
      label: copy("Planejamento individual", "Individual planning"),
      short: copy("Avaliação e planejamento", "Assessment and planning"),
      note: copy(
        "Suas respostas ajudam a orientar as escolhas do acompanhamento.",
        "Your answers help guide the choices made throughout your coaching.",
      ),
    },
    {
      icon: MessageCircle,
      title: copy("Presença na sua rotina.", "Support in your routine."),
      label: copy("Execução e orientação", "Practice and guidance"),
      short: copy("Treino e acompanhamento", "Training and coaching"),
      note: copy(
        "Registre seu dia e mantenha suas orientações sempre à mão.",
        "Log your day and keep your guidance close at hand.",
      ),
    },
    {
      icon: ChartNoAxesCombined,
      title: copy("Evoluir é continuar.", "Progress means keeping going."),
      label: copy("Revisão e próximos passos", "Review and next steps"),
      short: copy("Resultados e evolução", "Results and progress"),
      note: copy(
        "Seus registros dão contexto para avaliar o caminho e ajustar a direção.",
        "Your logs provide context to review your journey and adjust direction.",
      ),
    },
  ];
  return (
    <PublicShell locale={locale}>
      <main className="how-page">
        <section className="how-hero relative overflow-hidden border-b border-white/[0.07]">
          <div className="public-wrap grid gap-12 py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20 lg:py-24">
            <div className="self-center">
              <p className="public-eyebrow">
                {copy(
                  "COMO FUNCIONA · NATH RAMOS",
                  "HOW IT WORKS · NATH RAMOS",
                )}
              </p>
              <h1 className="how-heading">
                {copy("Um caminho claro.", "A clear path.")}
                <br />
                <span className="text-yellow-300">
                  {copy("Do seu jeito.", "Your way.")}
                </span>
              </h1>
              <p className="public-copy mt-6 max-w-md">
                {copy(
                  "Da primeira conversa aos próximos objetivos: entenda como sua rotina se transforma em um acompanhamento pensado para você.",
                  "From your first conversation to your next goals: discover how your routine shapes coaching designed around you.",
                )}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/${locale}/planos`} className="public-cta">
                  {copy("Conhecer o plano", "Explore the plan")}
                  <ArrowUpRight size={17} />
                </Link>
                <Link href="#jornada" className="public-cta-secondary">
                  {copy("Explorar as etapas", "Explore the steps")}
                  <ArrowDown size={15} />
                </Link>
              </div>
              <p className="mt-7 flex items-center gap-2 text-xs text-zinc-500">
                <Smartphone size={14} className="text-yellow-300/70" />
                {copy(
                  "Acompanhamento online. Orientação de perto.",
                  "Online coaching. Personal guidance.",
                )}
              </p>
            </div>
            <nav
              aria-label={copy("Etapas do acompanhamento", "Coaching steps")}
              className="how-roadmap"
              data-reveal
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
                <span className="text-[9px] font-medium uppercase tracking-[.2em] text-zinc-400">
                  {copy("SUA JORNADA, EM 4 ETAPAS", "YOUR JOURNEY IN 4 STEPS")}
                </span>
                <span className="how-status" aria-hidden="true" />
              </div>
              <ol className="px-4 py-3">
                {steps.map(({ icon: Icon, short, label }, i) => (
                  <li key={short}>
                    <Link
                      href={`#etapa-${i + 1}`}
                      className="how-roadmap-link group"
                    >
                      <span className="how-roadmap-icon">
                        <Icon size={18} strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 block text-[9px] uppercase tracking-[.12em] text-zinc-500">
                          0{i + 1} / {label}
                        </span>
                        <span className="block text-sm font-medium text-zinc-200">
                          {short}
                        </span>
                      </span>
                      <ArrowDownRight
                        size={16}
                        className="shrink-0 text-zinc-600 transition group-hover:text-yellow-300"
                      />
                    </Link>
                  </li>
                ))}
              </ol>
              <div className="flex items-center gap-2 border-t border-white/[0.08] px-6 py-4 text-[10px] text-zinc-500">
                <Sparkles size={13} className="text-yellow-300/70" />
                {copy(
                  "Você no centro de cada decisão.",
                  "You at the center of every decision.",
                )}
              </div>
            </nav>
          </div>
        </section>
        <section id="jornada" className="public-section">
          <div className="public-wrap grid items-start gap-12 lg:grid-cols-[.65fr_1.35fr] lg:gap-20">
            <div className="lg:sticky lg:top-32">
              <p className="public-eyebrow">
                {copy("DO COMEÇO À EVOLUÇÃO", "FROM THE START TO PROGRESS")}
              </p>
              <h2 className="public-title">
                {copy("Cada etapa tem", "Every step has")}
                <br />
                <span className="text-zinc-500">
                  {copy("um propósito.", "a purpose.")}
                </span>
              </h2>
              <p className="public-copy mt-5 max-w-sm">
                {copy(
                  "Um processo organizado para você saber o que acontece agora e o que vem depois.",
                  "An organized process so you know what happens now and what comes next.",
                )}
              </p>
              <div className="mt-8 inline-flex items-center gap-3 border-t border-white/10 pt-5 text-[11px] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-300" />
                {copy(
                  "Uma jornada contínua, construída com você.",
                  "An ongoing journey, built with you.",
                )}
              </div>
            </div>
            <ol className="how-timeline">
              {steps.map(({ icon: Icon, title, label, note }, i) => (
                <li
                  id={`etapa-${i + 1}`}
                  key={title}
                  className="how-step"
                  data-reveal
                >
                  <span className="how-step-number" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <article className="how-step-card">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[9px] font-medium uppercase tracking-[.16em] text-yellow-300/80">
                        {label}
                      </p>
                      <Icon
                        size={22}
                        strokeWidth={1.4}
                        className="shrink-0 text-zinc-500"
                      />
                    </div>
                    <h3 className="mt-5 text-[1.55rem] font-medium leading-tight text-zinc-100 sm:text-[1.85rem]">
                      {title}
                    </h3>
                    <p className="public-copy mt-4">{t(`step${i + 1}Desc`)}</p>
                    <ul className="mt-6 grid gap-3 border-t border-white/[0.07] pt-6">
                      {[1, 2, 3].map((d) => (
                        <li
                          key={d}
                          className="flex items-start gap-3 text-xs leading-relaxed text-zinc-400"
                        >
                          <Check
                            size={14}
                            className="mt-0.5 shrink-0 text-yellow-300/80"
                          />
                          {t(`step${i + 1}Detail${d}`)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 border-l border-yellow-300/30 pl-3 text-[11px] leading-relaxed text-zinc-500">
                      {note}
                    </p>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="public-section border-y border-white/[0.07] bg-[#0d1012]">
          <div className="public-wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="public-eyebrow">
                {copy("O ACOMPANHAMENTO NA PRÁTICA", "COACHING IN PRACTICE")}
              </p>
              <h2 className="public-title">
                {copy("Menos dispersão.", "Less distraction.")}
                <br />
                <span className="text-yellow-300">
                  {copy("Mais direção.", "More direction.")}
                </span>
              </h2>
              <p className="public-copy mt-5 max-w-md">
                {copy(
                  "Treinos, rotina e evolução reunidos em um espaço. Explore a prévia e veja como a plataforma ajuda a organizar seu dia.",
                  "Workouts, routine and progress in one space. Explore the preview and see how the platform helps organize your day.",
                )}
              </p>
              <Link
                href={`/${locale}/treinos`}
                className="mt-6 inline-flex min-h-11 items-center gap-3 text-xs font-medium text-yellow-300"
              >
                {copy("Conhecer os treinos", "Explore the workouts")}
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div data-reveal>
              <PlatformPreview locale={locale} />
            </div>
          </div>
        </section>
        <section className="public-wrap py-16 sm:py-24">
          <div
            className="how-final grid items-center gap-8 p-7 sm:p-12 lg:grid-cols-[1fr_auto]"
            data-reveal
          >
            <div>
              <p className="mb-4 text-[9px] font-semibold uppercase tracking-[.18em] text-black/50">
                {copy("SEU PRÓXIMO PASSO", "YOUR NEXT STEP")}
              </p>
              <h2 className="max-w-xl text-3xl text-[#15180b] sm:text-4xl">
                {t("ctaTitle")}
              </h2>
              <p className="mt-4 max-w-lg text-sm text-black/60">
                {copy(
                  "Conheça o plano e escolha como começar seu acompanhamento.",
                  "Explore the plan and choose how to start your coaching.",
                )}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3">
              <Link
                href={`/${locale}/cadastro`}
                className="inline-flex min-h-[52px] items-center justify-center gap-6 rounded-xl bg-[#13170e] px-6 py-4 text-sm font-medium text-yellow-300 transition hover:bg-[#29301c]"
              >
                {t("ctaButton")}
                <ArrowUpRight size={17} />
              </Link>
              <Link
                href={`/${locale}/planos`}
                className="inline-flex min-h-11 items-center gap-2 px-1 text-xs text-black/65 underline-offset-4 hover:underline"
              >
                {copy("Ver os detalhes do plano", "View plan details")}
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
