import Link from "next/link";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function PublicFooter({ locale }: { locale: string }) {
  const t = useTranslations("nav");

  return (
    <footer className="w-full border-t border-border bg-surface mt-24">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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
              Acompanhamento fitness personalizado com treinos, dietas, hidratação, suplementação e mentoria 1:1.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-text">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href={`/${locale}/termos`}
                  className="text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/privacidade`}
                  className="text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/faq`}
                  className="text-sm text-text-secondary hover:text-primary transition-colors"
                >
                  {t("faq")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-text-secondary">
            &copy; {new Date().getFullYear()} Nath Ramos Personal Trainer. All rights reserved.
          </p>
          <p className="text-xs text-text-secondary">
            Next.js · TypeScript · Supabase · Tailwind
          </p>
        </div>
      </div>
    </footer>
  );
}
