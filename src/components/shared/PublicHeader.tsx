"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Globe2,
  Menu,
  X,
} from "lucide-react";
import { publicLinks, publicServices } from "@/components/public/navigation";
import { useDialogFocus } from "@/components/ui/useDialogFocus";
import { cn } from "@/lib/utils";
export function PublicHeader({ locale }: { locale: string }) {
  const en = locale === "en-US",
    pathname = usePathname(),
    router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false),
    [servicesOpen, setServicesOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null),
    services = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useDialogFocus(mobileOpen, () => setMobileOpen(false), drawer);
  useEffect(() => {
    setMobileOpen(false);
    setServicesOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!servicesOpen) return;
    const outside = (e: MouseEvent) => {
      if (!services.current?.contains(e.target as Node)) setServicesOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setServicesOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [servicesOpen]);
  const active = (path: string) => pathname === `/${locale}/${path}`;
  const language = (id: string) => (
    <label className="flex items-center gap-1.5 text-zinc-500">
      <Globe2 size={14} />
      <select
        id={id}
        aria-label={en ? "Language" : "Idioma"}
        value={locale}
        onChange={(e) => {
          const segments = pathname.split("/").filter(Boolean);
          segments[0] = e.target.value;
          router.push(
            "/" +
              segments.join("/") +
              window.location.search +
              window.location.hash,
          );
          setMobileOpen(false);
        }}
        className="max-w-16 bg-transparent py-2 text-[11px] outline-none"
      >
        <option className="bg-[#101113]" value="pt-BR">
          PT-BR
        </option>
        <option className="bg-[#101113]" value="en-US">
          EN-US
        </option>
      </select>
    </label>
  );
  return (
    <>
      <header className="public-navigation sticky top-0 z-40 border-b border-white/[0.07] bg-[#090b0c]/95 text-zinc-100 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link
            href={`/${locale}`}
            className="flex shrink-0 items-center gap-3"
            aria-label={en ? "Nath Ramos · Home" : "Nath Ramos · Início"}
          >
            <div className="relative h-11 w-11">
              <Image
                src="/logo.png"
                alt="Nath Ramos"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span>
              <span className="block text-xs font-semibold tracking-[0.15em]">
                NATH RAMOS
              </span>
              <span className="mt-1 block text-[8px] tracking-[0.25em] text-zinc-500">
                PERSONAL TRAINER
              </span>
            </span>
          </Link>
          <nav
            aria-label={en ? "Main navigation" : "Navegação principal"}
            className="hidden items-center gap-6 xl:flex"
          >
            <div ref={services} className="relative">
              <button
                ref={trigger}
                aria-expanded={servicesOpen}
                aria-controls="public-services"
                onClick={() => setServicesOpen(!servicesOpen)}
                className={cn(
                  "flex min-h-11 items-center gap-1.5 text-xs transition hover:text-yellow-300",
                  publicServices.some((i) => active(i.path))
                    ? "text-yellow-300"
                    : "text-zinc-400",
                )}
              >
                {en ? "Your coaching" : "O acompanhamento"}
                <ChevronDown
                  size={12}
                  className={cn(
                    "transition-transform",
                    servicesOpen && "rotate-180",
                  )}
                />
              </button>
              {servicesOpen && (
                <div
                  id="public-services"
                  className="absolute left-0 top-full mt-3 grid w-[520px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#111416] p-3 shadow-2xl"
                >
                  {publicServices.map((item) => (
                    <Link
                      key={item.path}
                      href={`/${locale}/${item.path}`}
                      onClick={() => setServicesOpen(false)}
                      className="group flex items-start gap-3 rounded-xl p-4 transition hover:bg-white/[0.04]"
                    >
                      <item.icon
                        size={18}
                        className="mt-0.5 shrink-0 text-yellow-300"
                      />
                      <span>
                        <span className="block text-xs font-medium text-zinc-200">
                          {en ? item.en : item.pt}
                        </span>
                        <span className="mt-1.5 block text-[11px] leading-relaxed text-zinc-500">
                          {en ? item.detailEn : item.detailPt}
                        </span>
                      </span>
                      <ArrowUpRight
                        size={12}
                        className="ml-auto shrink-0 text-zinc-600 group-hover:text-yellow-300"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {publicLinks.map((item) => (
              <Link
                key={item.path}
                href={`/${locale}/${item.path}`}
                aria-current={active(item.path) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center text-xs transition hover:text-yellow-300",
                  active(item.path) ? "text-yellow-300" : "text-zinc-400",
                )}
              >
                {en ? item.en : item.pt}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-4 xl:flex">
            {language("public-language")}
            <Link
              href={`/${locale}/login`}
              className="min-h-11 content-center text-xs text-zinc-300 hover:text-yellow-300"
            >
              {en ? "Student area" : "Área do aluno"}
            </Link>
            <Link
              href={`/${locale}/planos`}
              className="inline-flex min-h-11 items-center gap-3 rounded-lg bg-yellow-400 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-yellow-300"
            >
              {en ? "Get started" : "Começar agora"}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="flex items-center gap-2 xl:hidden">
            <Link
              href={`/${locale}/login`}
              className="hidden min-h-11 items-center px-3 text-xs text-zinc-400 sm:flex"
            >
              {en ? "Student area" : "Área do aluno"}
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              aria-label={en ? "Open menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              aria-controls="public-mobile-menu"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-zinc-300"
            >
              <Menu size={19} />
            </button>
          </div>
        </div>
      </header>
      {mobileOpen && (
        <div
          className="public-navigation fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            ref={drawer}
            id="public-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={en ? "Site navigation" : "Navegação do site"}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex h-dvh w-[min(390px,100vw)] flex-col border-l border-white/10 bg-[#0e1113] text-zinc-100"
          >
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/[0.07] px-6">
              <span className="text-xs font-semibold tracking-[0.15em]">
                NATH RAMOS
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label={en ? "Close menu" : "Fechar menu"}
                className="rounded-xl p-3 text-zinc-400"
              >
                <X size={19} />
              </button>
            </div>
            <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
              <Link
                href={`/${locale}`}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm"
              >
                {en ? "Home" : "Início"}
              </Link>
              <section>
                <p className="mb-3 text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                  {en ? "Your coaching" : "O acompanhamento"}
                </p>
                {publicServices.map((item) => (
                  <Link
                    key={item.path}
                    href={`/${locale}/${item.path}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-12 items-center gap-3 text-sm text-zinc-300"
                  >
                    <item.icon size={16} className="text-zinc-500" />
                    {en ? item.en : item.pt}
                    <ArrowUpRight size={12} className="ml-auto text-zinc-600" />
                  </Link>
                ))}
              </section>
              <section className="border-t border-white/[0.07] pt-4">
                {publicLinks.map((item) => (
                  <Link
                    key={item.path}
                    href={`/${locale}/${item.path}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-12 items-center justify-between text-sm text-zinc-300"
                  >
                    {en ? item.en : item.pt}
                    <ArrowUpRight size={12} className="text-zinc-600" />
                  </Link>
                ))}
              </section>
              {language("public-mobile-language")}
            </nav>
            <div className="space-y-3 border-t border-white/10 p-6">
              <Link
                href={`/${locale}/planos`}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-12 items-center justify-between rounded-xl bg-yellow-400 px-4 text-sm font-semibold text-zinc-950"
              >
                {en ? "Explore the plan" : "Conhecer o plano"}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`/${locale}/login`}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-11 items-center justify-center text-xs text-zinc-400"
              >
                {en
                  ? "Already a student? Sign in"
                  : "Já é aluna ou aluno? Entrar"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
