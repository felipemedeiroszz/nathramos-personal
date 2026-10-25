import Link from "next/link";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

const LFINFO_INSTAGRAM = "https://www.instagram.com/lfinfo_sjb";

export function PublicFooter({ locale }: { locale: string }) {
  const t = useTranslations("nav");

  const navLinks = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/planos`, label: t("plans") },
    { href: `/${locale}/como-funciona`, label: t("howItWorks") },
    { href: `/${locale}/faq`, label: t("faq") },
  ];

  const legalLinks = [
    { href: `/${locale}/termos`, label: t("terms") },
    { href: `/${locale}/privacidade`, label: t("privacy") },
  ];

  return (
    <footer className="relative w-full border-t border-border bg-surface mt-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 space-y-4">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <Image
                  src="/logo.png"
                  alt="Nath Ramos"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="text-sm text-text-secondary max-w-sm">
              {t("footerTagline")}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-text">{t("navigation")}</h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-text">{t("legal")}</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-text-secondary">
            &copy; {new Date().getFullYear()} Nath Ramos Personal Trainer. All rights reserved.
          </p>
          <a
            href={LFINFO_INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            {t("developedBy")} LFINFO
            <ArrowUpRight
              size={14}
              className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
