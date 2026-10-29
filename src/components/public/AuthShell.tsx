"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Dumbbell,
  HeartHandshake,
  TrendingUp,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import "./auth.css";

export function AuthShell({
  locale,
  signup = false,
  title,
  subtitle,
  children,
}: {
  locale: string;
  signup?: boolean;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const en = locale === "en-US";
  const t = (pt: string, english: string) => (en ? english : pt);
  return (
    <div className="auth-site">
      <header className="auth-header">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3"
          aria-label={t("Nath Ramos · Início", "Nath Ramos · Home")}
        >
          <Image
            src="/logo.png"
            alt=""
            width={42}
            height={42}
            className="h-10 w-10 object-contain"
            priority
          />
          <span>
            <span className="block text-[11px] font-semibold tracking-[.17em]">
              NATH RAMOS
            </span>
            <span className="mt-1 block text-[8px] tracking-[.2em] text-zinc-500">
              PERSONAL TRAINER
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href={`/${locale}`}
            className="hidden items-center gap-2 text-xs text-zinc-400 transition hover:text-white sm:flex"
          >
            <ArrowLeft size={14} />
            {t("Voltar ao site", "Back to website")}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className={`auth-layout ${signup ? "auth-layout-signup" : ""}`}>
        <aside className="auth-story">
          <p className="auth-eyebrow">
            {t("SEU ESPAÇO DE EVOLUÇÃO", "YOUR SPACE TO GROW")}
          </p>
          <h2>
            {signup
              ? t("O primeiro passo", "Your first step")
              : t("Sua rotina.", "Your routine.")}
            <br />
            <span>
              {signup
                ? t("começa com você.", "starts with you.")
                : t("Sua próxima conquista.", "Your next achievement.")}
            </span>
          </h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-zinc-400">
            {t(
              "Treinos, orientações e evolução em um só lugar. Com a Nath, cada etapa do seu acompanhamento ganha direção.",
              "Workouts, guidance and progress in one place. With Nath, every step of your coaching has direction.",
            )}
          </p>
          <div className="auth-benefits">
            {[
              {
                icon: Dumbbell,
                title: t("Um plano para você", "A plan for you"),
                text: t(
                  "Treinos organizados para sua rotina.",
                  "Workouts organized around your routine.",
                ),
              },
              {
                icon: HeartHandshake,
                title: t("Orientação de perto", "Personal guidance"),
                text: t(
                  "Um canal com sua treinadora.",
                  "A channel with your coach.",
                ),
              },
              {
                icon: TrendingUp,
                title: t("Cada avanço conta", "Every step counts"),
                text: t(
                  "Registros para acompanhar sua evolução.",
                  "Logs to follow your progress.",
                ),
              },
            ].map(({ icon: Icon, title: label, text }) => (
              <div key={label} className="flex items-start gap-4">
                <span className="auth-benefit-icon">
                  <Icon size={19} strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{label}</p>
                  <p className="mt-1 text-xs leading-6 text-zinc-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-3 border-t border-white/[.08] pt-6 text-xs text-zinc-500">
            <Check size={14} className="text-yellow-300" />
            {t(
              "Acompanhamento online, no seu ritmo.",
              "Online coaching, at your pace.",
            )}
            <Link
              href={`/${locale}/como-funciona`}
              aria-label={t("Como funciona", "How it works")}
              className="ml-auto rounded-lg p-2 text-zinc-400 hover:text-yellow-300"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </aside>
        <section className="auth-form-panel" aria-labelledby="auth-title">
          <div className="auth-form-heading">
            <p className="auth-eyebrow">
              {signup
                ? t("VAMOS COMEÇAR", "LET’S GET STARTED")
                : t("ÁREA DO ALUNO", "STUDENT AREA")}
            </p>
            <h1 id="auth-title">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{subtitle}</p>
          </div>
          {children}
        </section>
      </main>
      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} Nath Ramos</span>
        <div className="flex gap-5">
          <Link href={`/${locale}/termos`}>
            {t("Termos de uso", "Terms of use")}
          </Link>
          <Link href={`/${locale}/privacidade`}>
            {t("Privacidade", "Privacy")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
