import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireAuthenticated } from "@/lib/auth/access";
import { EbookService } from "@/services/EbookService";
import { EbookLibraryClient } from "./EbookLibraryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Biblioteca Digital",
};

export default async function EbooksPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams: { purchase?: string };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  await getTranslations("studentPages");

  const userId = await requireAuthenticated();

  const ebooks = await EbookService.listEbooks({ is_published: true });
  const paidIds = await EbookService.getPaidEbookIds(userId);

  return (
    <EbookLibraryClient
      locale={locale as "pt-BR" | "en-US"}
      ebooks={ebooks}
      paidIds={paidIds}
      purchaseStatus={searchParams?.purchase ?? null}
    />
  );
}
