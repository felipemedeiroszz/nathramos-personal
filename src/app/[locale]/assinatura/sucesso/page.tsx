import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { createClientSSR } from "@/lib/supabase/server";
import { canAccessPlatform } from "@/lib/auth/access";
import { AssinaturaStatusCard } from "@/components/payments/AssinaturaStatusCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagamento",
};

export default async function AssinaturaSucessoPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("plans");

  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // O acesso é definido pelo webhook do provedor; a página aguarda a confirmação.
  const access = await canAccessPlatform(user.id);

  return (
    <>
      <PublicHeader locale={locale} />

      <main className="animate-fade-in px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-xl">
          <AssinaturaStatusCard
            locale={locale}
            initialActive={access.allowed}
            labels={{
              successTitle: t("checkout.successTitle"),
              successDesc: t("checkout.successDesc"),
              successCta: t("checkout.successCta"),
              pendingTitle: t("checkout.pendingTitle"),
              pendingDesc: t("checkout.pendingDesc"),
              pendingRetry: t("checkout.pendingRetry"),
              pendingAutoCheck: t("checkout.pendingAutoCheck"),
            }}
          />
        </div>
      </main>

      <PublicFooter locale={locale} />
    </>
  );
}
