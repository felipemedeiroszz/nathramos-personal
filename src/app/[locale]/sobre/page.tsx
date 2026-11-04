import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PublicShell } from "@/components/public/PublicShell";
import { TrainerPortrait } from "@/components/public/TrainerPortrait";
import { ArrowDown, ArrowUpRight, ArrowRight, Check, Dumbbell, Heart, MessageCircle, Target, Eye, GraduationCap } from "lucide-react";
import "@/components/public/about.css";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const en = locale === "en-US";
  return {
    title: en ? "Meet Nath Ramos" : "Conheça Nath Ramos",
    description: en ? "Meet Nath Ramos and discover her approach to personal training: thoughtful planning, sustainable habits and close support." : "Conheça Nath Ramos e sua forma de acompanhar: treino com direção, hábitos sustentáveis e presença em cada etapa.",
    alternates: { canonical: `/${locale}/sobre` },
  };
}

export default async function SobrePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("about");
  const en = locale === "en-US";
  const copy = (pt: string, english: string) => en ? english : pt;
  const approach = [
    { icon: Dumbbell, title: copy("Treino com direção.", "Training with direction."), description: copy("Escolhas que fazem sentido para o seu objetivo e para o seu ponto de partida.", "Choices that make sense for your goals and your starting point.") },
    { icon: Heart, title: copy("Hábitos que cabem na vida.", "Habits that fit your life."), description: copy("Constância se constrói com uma rotina possível de manter, um passo de cada vez.", "Consistency grows from a routine you can maintain, one step at a time.") },
    { icon: MessageCircle, title: copy("Acompanhamento de perto.", "Support that stays close."), description: copy("Espaço para conversar, entender suas dificuldades e ajustar a direção ao longo do caminho.", "Room to talk, understand your challenges and adjust direction along the way.") },
  ];
  const values = [{ icon: Target, key: "mission" }, { icon: Eye, key: "vision" }, { icon: Heart, key: "valuesTitle2" }];
  const credentials = t("teamCredentials").split(", ").filter(Boolean);

  return <PublicShell locale={locale}>
    <main className="about-page">
      <section className="about-hero">
        <div className="public-wrap about-hero-grid">
          <div className="about-intro">
            <p className="public-eyebrow">{copy("A PESSOA POR TRÁS DO SEU PLANO", "THE PERSON BEHIND YOUR PLAN")}</p>
            <h1 className="about-title">{copy("Seu objetivo.", "Your goal.")}<br /><span>{copy("Meu compromisso.", "My commitment.")}</span></h1>
            <p className="about-intro-copy">{copy("Sou Nath Ramos.", "I'm Nath Ramos.")} <span>{copy("Educadora física, personal trainer e mentora. Meu trabalho é ajudar você a encontrar uma forma de evoluir que faça sentido para a sua vida.", "Physical educator, personal trainer and mentor. My work is about helping you find a way to grow that makes sense for your life.")}</span></p>
            <div className="about-actions">
              <Link href={`/${locale}/planos`} className="public-cta">{copy("Conhecer o acompanhamento", "Explore coaching")}<ArrowUpRight size={17} /></Link>
              <Link href="#minha-historia" className="about-story-link">{copy("Minha história", "My story")}<ArrowDown size={15} /></Link>
            </div>
            <div className="about-intro-note"><span /><p>{copy("Um plano individual. Uma relação de confiança.", "An individual plan. A relationship built on trust.")}</p></div>
          </div>
          <div className="about-portrait-wrap">
            <div className="about-photo-label"><span>NR /</span> {copy("PERSONAL TRAINER & MENTORA", "PERSONAL TRAINER & MENTOR")}</div>
            <TrainerPortrait className="about-portrait" priority />
            <div className="about-portrait-caption"><div><p>{copy("PRESENÇA EM CADA ETAPA", "PRESENT AT EVERY STEP")}</p><h2>Nath Ramos<span>.</span></h2></div><ArrowDown size={27} strokeWidth={1} aria-hidden="true" /></div>
          </div>
        </div>
        <div className="public-wrap"><div className="about-principle-strip">
          {[copy("Planejamento individual", "Individual planning"), copy("Evolução com constância", "Consistent progress"), copy("Acompanhamento humano", "Human connection")].map((label, i) => <div key={label}><span>0{i + 1}</span><p>{label}</p><ArrowUpRight size={15} aria-hidden="true" /></div>)}
        </div></div>
      </section>

      <section id="minha-historia" className="public-wrap about-story">
        <div className="about-section-heading"><p className="public-eyebrow">{copy("PRAZER, NATH", "NICE TO MEET YOU")}</p><h2>{copy("Antes do plano,", "Before the plan,")}<br /><span>{copy("vem a pessoa.", "comes the person.")}</span></h2><div className="about-small-signature">Nath Ramos <ArrowUpRight size={18} /></div></div>
        <div className="about-story-content">
          <p className="about-story-lead">{copy("Acredito em um acompanhamento que olha para a sua rotina, respeita a sua individualidade e constrói evolução junto com você.", "I believe in coaching that considers your routine, respects your individuality and builds progress alongside you.")}</p>
          <div className="about-story-text"><p>{t("storyParagraph1")}</p><p>{t("storyParagraph3")}</p></div>
          <div className="about-credentials"><p><GraduationCap size={17} />{copy("FORMAÇÃO E ATUAÇÃO", "EDUCATION & PRACTICE")}</p><ul>{credentials.map(label => <li key={label}><Check size={14} /><span>{label}</span></li>)}</ul></div>
        </div>
      </section>

      <section className="about-method">
        <div className="public-wrap">
          <div className="about-method-header"><div><p className="public-eyebrow">{copy("MEU JEITO DE ACOMPANHAR", "MY APPROACH TO COACHING")}</p><h2>{copy("Direção para começar.", "Direction to begin.")}<br /><span>{copy("Presença para continuar.", "Support to keep going.")}</span></h2></div><p className="public-copy">{copy("Resultados sustentáveis vêm de hábitos reais. O acompanhamento conecta planejamento, rotina e conversa para que cada etapa tenha um propósito.", "Sustainable results come from real habits. Coaching connects planning, routine and conversation so every step has a purpose.")}</p></div>
          <div className="about-method-grid">{approach.map((item, i) => <article className="about-method-item" key={item.title} data-reveal><div className="about-method-top"><item.icon size={25} strokeWidth={1.3} /><span>/ 0{i + 1}</span></div><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
          <Link href={`/${locale}/como-funciona`} className="about-inline-link">{copy("Entenda como funciona na prática", "See how it works in practice")}<ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="public-wrap about-values">
        <div className="about-section-heading"><p className="public-eyebrow">{copy("O QUE ORIENTA MEU TRABALHO", "WHAT GUIDES MY WORK")}</p><h2>{copy("Princípios que", "Principles that")}<br /><span>{copy("viram prática.", "become practice.")}</span></h2></div>
        <div className="about-values-list">{values.map(item => <article key={item.key} className="about-value-row"><item.icon size={21} strokeWidth={1.4} /><div><h3>{t(`${item.key}Title`)}</h3><p>{t(`${item.key}Desc`)}</p></div></article>)}</div>
      </section>

      <section className="public-wrap about-final-wrap"><div className="about-final" data-reveal>
        <div><p className="about-final-eyebrow">{copy("O PRÓXIMO PASSO É SEU", "THE NEXT STEP IS YOURS")}</p><h2>{copy("Vamos construir", "Let's build")}<br />{copy("a sua evolução?", "your progress.")}</h2><p>{copy("Conheça o plano e encontre o seu ponto de partida. Eu te acompanho no caminho.", "Explore the plan and find your starting point. I'll be alongside you on the journey.")}</p></div>
        <div className="about-final-actions"><Link href={`/${locale}/planos`} className="about-final-cta">{copy("Quero dar o próximo passo", "I'm ready for the next step")}<ArrowUpRight size={20} /></Link><Link href={`/${locale}/como-funciona`}>{copy("Primeiro, quero entender como funciona", "First, I'd like to see how it works")}<ArrowRight size={14} /></Link></div>
      </div></section>
    </main>
  </PublicShell>;
}
