import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Droplets,
  Dumbbell,
  HeartHandshake,
  MessageCircle,
  Pill,
  Plus,
  Smartphone,
  Utensils,
} from "lucide-react";
import { PublicShell } from "./PublicShell";
import { TrainerPortrait } from "./TrainerPortrait";
import { PlatformPreview } from "./PlatformPreview";
export function PublicHome({
  locale,
  faqs,
  steps,
}: {
  locale: string;
  faqs: { question: string; answer: string }[];
  steps: { title: string; description: string }[];
}) {
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt);
  const features = [
    {
      icon: Dumbbell,
      title: t("Treino com direção.", "Train with direction."),
      description: t(
        "Seus exercícios, orientações e registros de séries organizados para acompanhar cada treino.",
        "Your exercises, guidance and set logs organized to support every workout.",
      ),
      path: "treinos",
      label: t("Meus treinos", "My workouts"),
    },
    {
      icon: Utensils,
      title: t("Uma rotina que faz sentido.", "A routine that makes sense."),
      description: t(
        "Acompanhe suas refeições, consulte orientações e registre o que faz parte do seu dia.",
        "Track your meals, check guidance and log what is part of your day.",
      ),
      path: "dietas",
      label: t("Minha alimentação", "My nutrition"),
    },
    {
      icon: Droplets,
      title: t("Hidratação, no seu ritmo.", "Hydration at your pace."),
      description: t(
        "Meta, registros e lembretes em um espaço fácil de consultar.",
        "Your goal, logs and reminders in one easy-to-check space.",
      ),
      path: "como-funciona",
      label: t("Minha hidratação", "My hydration"),
    },
    {
      icon: Pill,
      title: t("Orientações à mão.", "Guidance at hand."),
      description: t(
        "Consulte os suplementos atribuídos e acompanhe suas doses.",
        "Check your assigned supplements and track your doses.",
      ),
      path: "como-funciona",
      label: t("Meus suplementos", "My supplements"),
    },
    {
      icon: Activity,
      title: t("Evolução que você vê.", "Progress you can see."),
      description: t(
        "Histórico de treinos e registros para acompanhar a sua jornada.",
        "Workout history and logs to follow your journey.",
      ),
      path: "desempenho",
      label: t("Minha evolução", "My progress"),
    },
    {
      icon: MessageCircle,
      title: t("Acompanhamento de perto.", "Coaching that stays close."),
      description: t(
        "Um canal com sua treinadora para orientações e encontros.",
        "A channel with your coach for guidance and meetings.",
      ),
      path: "mentoria",
      label: t("Minha treinadora", "My coach"),
    },
  ];
  return (
    <PublicShell locale={locale}>
      <main>
        <section className="relative isolate overflow-hidden border-b border-white/[0.06]">
          <div className="pointer-events-none absolute -left-56 top-20 -z-10 h-[600px] w-[600px] rounded-full bg-yellow-400/[0.025] blur-[120px]" />
          <div className="public-wrap grid items-center gap-8 pb-14 pt-12 md:grid-cols-[1.1fr_1fr] md:gap-4 md:pb-16 md:pt-16 lg:pt-20">
            <div className="relative z-10 min-w-0 py-4 md:pb-10">
              <p className="public-eyebrow">
                {t(
                  "PESSOAS REAIS. ROTINAS REAIS.",
                  "REAL PEOPLE. REAL ROUTINES.",
                )}
              </p>
              <h1 className="max-w-2xl text-[clamp(2.65rem,5.5vw,5rem)] leading-[1.02]">
                {t("Treine com", "Train with")}
                <br />
                {t("direção.", "direction.")}
                <br />
                <span className="text-yellow-300">
                  {t("Evolua com", "Grow with")}
                  <br />
                  {t("acompanhamento.", "support.")}
                </span>
              </h1>
              <p className="public-copy mt-6 max-w-[420px]">
                {t(
                  "Treinos, rotina e evolução em um só lugar. Com a orientação da Nath Ramos e uma plataforma que acompanha o seu dia.",
                  "Workouts, routine and progress in one place. With guidance from Nath Ramos and a platform that supports your day.",
                )}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/${locale}/planos`} className="public-cta">
                  {t("Conhecer o acompanhamento", "Explore the coaching")}
                  <ArrowUpRight size={17} />
                </Link>
                <Link href="#como-funciona" className="public-cta-secondary">
                  {t("Como funciona", "How it works")}
                  <ArrowDown size={15} />
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <CircleCheck size={12} className="text-yellow-300/70" />
                  {t("Orientação personalizada", "Personal guidance")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Smartphone size={12} className="text-yellow-300/70" />
                  {t(
                    "Sua rotina na plataforma",
                    "Your routine on the platform",
                  )}
                </span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[540px] md:ml-0">
              <div className="absolute right-2 top-3 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[8px] font-medium uppercase tracking-[0.15em] text-zinc-300 backdrop-blur">
                <span className="h-1 w-1 rounded-full bg-yellow-300" />
                {t("Acompanhamento online", "Online coaching")}
              </div>
              <TrainerPortrait
                priority
                className="aspect-[.82] w-full rounded-[24px]"
              />
              <div className="absolute bottom-7 left-5 right-5 z-20 flex items-end justify-between gap-4 border-t border-white/15 pt-4">
                <div>
                  <p className="text-xl font-medium tracking-tight text-zinc-100">
                    Nath Ramos
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                    Personal Trainer
                  </p>
                </div>
                <Link
                  href={`/${locale}/sobre`}
                  aria-label={t("Conheça Nath Ramos", "Meet Nath Ramos")}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-zinc-300 transition hover:border-yellow-400/50 hover:text-yellow-300"
                >
                  <ArrowUpRight size={17} />
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06]">
            <div className="public-wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-4 py-5 text-[9px] uppercase tracking-[0.17em] text-zinc-600">
              <span>
                {t(
                  "CUIDADO QUE FAZ PARTE DO SEU DIA",
                  "CARE THAT FITS YOUR DAY",
                )}
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {[
                  { icon: Dumbbell, title: t("Treino", "Training") },
                  { icon: Utensils, title: t("Rotina", "Routine") },
                  { icon: Activity, title: t("Evolução", "Progress") },
                  {
                    icon: HeartHandshake,
                    title: t("Acompanhamento", "Coaching"),
                  },
                ].map(({ icon: Icon, title }) => (
                  <span
                    key={title}
                    className="flex items-center gap-2 text-zinc-400"
                  >
                    <Icon size={12} className="text-zinc-600" />
                    {title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section id="beneficios" className="public-section">
          <div className="public-wrap">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="public-eyebrow">
                  {t(
                    "MUITO ALÉM DE UMA FICHA DE TREINO",
                    "BEYOND A WORKOUT PLAN",
                  )}
                </p>
                <h2 className="public-title">
                  {t(
                    "Cada parte da sua rotina.",
                    "Every part of your routine.",
                  )}
                  <br />
                  <span className="text-zinc-500">
                    {t("Um só acompanhamento.", "One coaching experience.")}
                  </span>
                </h2>
              </div>
              <p className="public-copy max-w-xs">
                {t(
                  "Menos informação espalhada. Mais clareza para cuidar da sua jornada.",
                  "Less scattered information. More clarity to take care of your journey.",
                )}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              {features.map(({ icon: Icon, title, description, path }, i) => (
                <Link
                  key={title}
                  href={`/${locale}/${path}`}
                  className={`public-feature group ${i < 2 ? "lg:col-span-6" : "lg:col-span-3"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] tracking-widest text-zinc-600">
                      0{i + 1}
                    </span>
                    <Icon
                      size={21}
                      strokeWidth={1.5}
                      className="text-yellow-300/80"
                    />
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <ArrowUpRight
                    size={15}
                    className="mt-5 shrink-0 self-end text-zinc-600 transition group-hover:text-yellow-300"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section
          id="plataforma"
          className="public-section border-y border-white/[0.06] bg-[#0d1012]"
        >
          <div className="public-wrap grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
            <PlatformPreview locale={locale} />
            <div className="lg:pl-6">
              <p className="public-eyebrow">
                {t(
                  "SIMPLES DE USAR. FÁCIL DE ACOMPANHAR.",
                  "SIMPLE TO USE. EASY TO FOLLOW.",
                )}
              </p>
              <h2 className="public-title">
                {t("O seu cuidado,", "Your care,")}
                <br />
                <span className="text-yellow-300">
                  {t("sempre com você.", "always with you.")}
                </span>
              </h2>
              <p className="public-copy mt-5">
                {t(
                  "Do treino ao registro de água, a plataforma reúne o que faz parte do seu acompanhamento. No computador ou no celular.",
                  "From workouts to water logs, the platform brings your coaching routine together. On your computer or phone.",
                )}
              </p>
              <ul className="my-7 space-y-4">
                {[
                  t(
                    "Seu dia organizado em uma visão clara",
                    "Your day organized in a clear view",
                  ),
                  t(
                    "Registros para acompanhar sua própria evolução",
                    "Logs to track your own progress",
                  ),
                  t(
                    "Orientações e conversas em um mesmo espaço",
                    "Guidance and conversations in one place",
                  ),
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-xs leading-relaxed text-zinc-400"
                  >
                    <Check
                      size={14}
                      className="mt-0.5 shrink-0 text-yellow-300"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/como-funciona`}
                className="inline-flex min-h-11 items-center gap-3 text-xs font-medium text-yellow-300"
              >
                {t("Conheça a experiência", "Explore the experience")}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
        <section id="como-funciona" className="public-section">
          <div className="public-wrap">
            <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr]">
              <div>
                <p className="public-eyebrow">
                  {t("SEU PRÓXIMO PASSO", "YOUR NEXT STEP")}
                </p>
                <h2 className="public-title">
                  {t("Começar pode", "Getting started can")}
                  <br />
                  {t("ser mais simples.", "be simpler.")}
                </h2>
                <p className="public-copy mt-5 max-w-sm">
                  {t(
                    "Entenda o processo e encontre o seu ponto de partida.",
                    "Understand the process and find your starting point.",
                  )}
                </p>
                <Link
                  href={`/${locale}/como-funciona`}
                  className="mt-6 inline-flex min-h-11 items-center gap-3 text-xs font-medium text-zinc-300 hover:text-yellow-300"
                >
                  {t("Ver todos os detalhes", "See all the details")}
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <ol className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {steps.map((step, i) => (
                  <li key={step.title} className="flex gap-5 py-7">
                    <span className="mt-1 text-xs font-medium text-yellow-300">
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-medium">{step.title}</h3>
                      <p className="public-copy mt-3 max-w-lg">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section className="border-y border-white/[0.06] bg-[#0d1012]">
          <div className="public-wrap grid gap-10 py-14 md:grid-cols-[1.2fr_1fr] sm:py-20">
            <div>
              <p className="public-eyebrow">
                {t("COM NATH RAMOS", "WITH NATH RAMOS")}
              </p>
              <h2 className="public-title">
                {t(
                  "A organização de uma plataforma.",
                  "The organization of a platform.",
                )}
                <br />
                <span className="text-zinc-500">
                  {t(
                    "A orientação de uma pessoa.",
                    "The guidance of a person.",
                  )}
                </span>
              </h2>
            </div>
            <div className="flex flex-col justify-center">
              <p className="public-copy">
                {t(
                  "Seu acompanhamento vai além das telas. Treinos e registros ajudam a organizar a rotina, enquanto a orientação da Nath dá contexto ao seu próximo passo.",
                  "Your coaching goes beyond the screen. Workouts and logs help organize your routine, while Nath's guidance adds context to your next step.",
                )}
              </p>
              <Link
                href={`/${locale}/sobre`}
                className="mt-6 inline-flex min-h-11 items-center gap-3 text-xs font-medium text-yellow-300"
              >
                {t("Conheça a Nath", "Meet Nath")}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </section>
        <section id="faq" className="public-section">
          <div className="public-wrap grid items-start gap-10 lg:grid-cols-[.85fr_1.15fr]">
            <div>
              <p className="public-eyebrow">
                {t("ANTES DE COMEÇAR", "BEFORE YOU BEGIN")}
              </p>
              <h2 className="public-title">
                {t("Clareza para", "Clarity for")}
                <br />
                {t("o seu próximo passo.", "your next step.")}
              </h2>
              <p className="public-copy mt-5 max-w-sm">
                {t(
                  "Algumas respostas para você conhecer melhor o acompanhamento.",
                  "A few answers to help you get to know the coaching experience.",
                )}
              </p>
              <Link
                href={`/${locale}/faq`}
                className="mt-5 inline-flex min-h-11 items-center gap-3 text-xs font-medium text-zinc-300 hover:text-yellow-300"
              >
                {t("Todas as dúvidas", "All questions")}
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <details
                  key={faq.question}
                  open={i === 0}
                  className="group rounded-xl border border-white/[0.07] bg-white/[0.015]"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-5 px-5 py-5 text-sm font-medium">
                    <span>{faq.question}</span>
                    <Plus
                      size={17}
                      className="shrink-0 text-zinc-500 transition-transform group-open:rotate-45 group-open:text-yellow-300"
                    />
                  </summary>
                  <p className="px-5 pb-5 text-xs leading-relaxed text-zinc-500">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="public-wrap pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-[24px] bg-yellow-400 p-7 text-zinc-950 sm:p-12 lg:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-10 rotate-[-20deg] text-black/[0.035]"
            >
              <Dumbbell size={400} strokeWidth={1} />
            </div>
            <div className="relative flex flex-wrap items-center justify-between gap-8">
              <div className="max-w-xl">
                <p className="mb-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-black/45">
                  {t("SUA JORNADA, SEU RITMO", "YOUR JOURNEY, YOUR PACE")}
                </p>
                <h2 className="text-3xl sm:text-5xl">
                  {t("Um próximo passo.", "One next step.")}
                  <br />
                  {t("Uma nova direção.", "A new direction.")}
                </h2>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-black/60">
                  {t(
                    "Conheça o acompanhamento e veja o que faz sentido para a sua rotina.",
                    "Explore the coaching and see what makes sense for your routine.",
                  )}
                </p>
              </div>
              <div className="space-y-3">
                <Link
                  href={`/${locale}/planos`}
                  className="inline-flex min-h-14 items-center justify-between gap-8 rounded-xl bg-[#11140b] px-6 text-sm font-medium text-white transition hover:bg-black"
                >
                  {t("Conhecer o plano", "Explore the plan")}
                  <ArrowUpRight size={18} />
                </Link>
                <Link
                  href={`/${locale}/login`}
                  className="flex min-h-10 items-center justify-center gap-2 text-[11px] text-black/55 hover:text-black"
                >
                  {t(
                    "Já faz parte? Entre na plataforma",
                    "Already a student? Sign in",
                  )}
                  <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
