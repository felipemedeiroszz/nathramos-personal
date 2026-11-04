import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Mail, MessageCircle, Clock } from "lucide-react";
import { publicLinks, publicServices } from "@/components/public/navigation";
import { PUBLIC_SETTINGS_DEFAULTS, localizedBrand, whatsappDigits, type PublicPlatformSettings } from "@/lib/platform/publicSettings";
export function PublicFooter({ locale, settings = PUBLIC_SETTINGS_DEFAULTS }: { locale: string; settings?: PublicPlatformSettings }) {
  const en = locale === "en-US";
  const brand = localizedBrand(settings, locale), phone = whatsappDigits(settings.support_whatsapp);
  return (
    <footer className="public-footer mt-auto border-t border-white/[0.07] bg-[#0b0e10] text-zinc-100">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <Link href={`/${locale}`} className="flex min-w-0 items-center gap-3">
              <div className="relative h-12 w-12 shrink-0">
                <Image
                  src="/logo.png"
                  alt={brand.name}
                  fill
                  className="object-contain"
                />
              </div>
              <span className="min-w-0">
                <span className="block break-words text-xs font-semibold uppercase tracking-[0.15em]">
                  {brand.name}
                </span>
                <span className="mt-1 block break-words text-[8px] uppercase tracking-[0.25em] text-zinc-500">
                  {brand.tagline}
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
        {(settings.support_email || phone || brand.hours) && <section aria-label={en ? "Contact and support" : "Contato e suporte"} className="mt-10 border-t border-white/[0.07] pt-7">
          <h2 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{en ? "Contact and support" : "Contato e suporte"}</h2>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-xs text-zinc-400">
            {settings.support_email && <a href={`mailto:${settings.support_email}`} className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 hover:text-yellow-300"><Mail size={15} className="shrink-0" /><span className="min-w-0 break-all">{settings.support_email}</span></a>}
            {phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 hover:text-yellow-300"><MessageCircle size={15} />WhatsApp <ArrowUpRight size={12} /></a>}
            {brand.hours && <p className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2"><Clock size={15} className="shrink-0" /><span className="min-w-0 break-words">{brand.hours}</span></p>}
          </div>
        </section>}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-6 text-[10px] text-zinc-600">
          <p className="min-w-0 max-w-full break-words">
            © {new Date().getFullYear()} {brand.name}.{" "}
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
