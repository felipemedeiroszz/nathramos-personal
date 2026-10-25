import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { XCircle } from "lucide-react";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";

export const metadata: Metadata = {
  title: "Pagamento",
};

export default async function AssinaturaCanceladoPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("plans");

  return (
    <>
      <PublicHeader locale={locale} />

      <main className="animate-fade-in px-4 md:px-6 py-20 md:py-28">
        <div className="mx-auto max-w-xl">
          <div className="animate-slide-up [animation-fill-mode:both] rounded-2xl border border-border/60 bg-surface p-8 md:p-10 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <XCircle size={30} className="text-red-400" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-text">
              {t("checkout.cancelTitle")}
            </h1>

            <p className="text-text-secondary leading-relaxed">
              {t("checkout.cancelDesc")}
            </p>

            <div className="pt-2">
              <Link
                href={`/${locale}/planos`}
                className="inline-flex h-13 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-[0_0_35px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_55px_hsl(var(--primary)/0.5)]"
              >
                {t("checkout.cancelCta")}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter locale={locale} />
    </>
  );
}
