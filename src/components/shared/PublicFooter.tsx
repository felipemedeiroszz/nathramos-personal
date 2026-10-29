import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { publicLinks, publicServices } from "@/components/public/navigation";
export function PublicFooter({ locale }: { locale: string }) {
  const en = locale === "en-US";
  return (
    <footer className="public-footer mt-auto border-t border-white/[0.07] bg-[#0b0e10] text-zinc-100">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <div className="relative h-12 w-12">
                <Image
                  src="/logo.png"
                  alt="Nath Ramos"
                  fill
                  className="object-contain"
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
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-zinc-500">
              {en
                ? "Your routine deserves direction. Your journey deserves support."
                : "Sua rotina merece direção. Sua jornada merece acompanhamento."}
            </p>
            <Link
              href={`/${locale}/planos`}
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-yellow-300"
            >
              {en ? "Take your next step" : "Dê seu próximo passo"}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div>
            <h2 className="mb-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {en ? "Your coaching" : "Acompanhamento"}
            </h2>
            <ul className="space-y-3">
              {publicServices.map((item) => (
                <li key={item.path}>
                  <Link
                    href={`/${locale}/${item.path}`}
                    className="inline-flex min-h-6 text-xs text-zinc-400 hover:text-yellow-300"
                  >
                    {en ? item.en : item.pt}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {en ? "Explore" : "Explore"}
            </h2>
            <ul className="space-y-3">
              {publicLinks.map((item) => (
                <li key={item.path}>
                  <Link
                    href={`/${locale}/${item.path}`}
                    className="inline-flex min-h-6 text-xs text-zinc-400 hover:text-yellow-300"
                  >
                    {en ? item.en : item.pt}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {en ? "Your space" : "Seu espaço"}
            </h2>
            <ul className="space-y-3">
              {[
                { path: "login", pt: "Área do aluno", en: "Student area" },
                {
                  path: "cadastro",
                  pt: "Criar minha conta",
                  en: "Create my account",
                },
                { path: "termos", pt: "Termos de uso", en: "Terms of use" },
                { path: "privacidade", pt: "Privacidade", en: "Privacy" },
              ].map((item) => (
                <li key={item.path}>
                  <Link
                    href={`/${locale}/${item.path}`}
                    className="inline-flex min-h-6 text-xs text-zinc-400 hover:text-yellow-300"
                  >
                    {en ? item.en : item.pt}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-6 text-[10px] text-zinc-600">
          <p>
            © {new Date().getFullYear()} Nath Ramos.{" "}
            {en ? "All rights reserved." : "Todos os direitos reservados."}
          </p>
          <a
            href="https://www.instagram.com/lfinfo_sjb"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition hover:text-yellow-300"
          >
            {en ? "Developed by" : "Desenvolvido por"}{" "}
            <span className="font-medium text-zinc-400">LFINFO</span>
            <ArrowUpRight size={11} />
          </a>
        </div>
      </div>
    </footer>
  );
}
