import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireStudentPage } from "@/lib/auth/platform";
import { EbookService } from "@/services/EbookService";
import { EbookLibraryClient } from "./EbookLibraryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Biblioteca Digital",
};

export default async function EbooksPage(
  props: {
    params: Promise<{ locale: (typeof locales)[number] }>;
    searchParams: Promise<{ purchase?: string }>;
  }
) {
  const searchParams = (await props.searchParams) ?? {};
  const params = await props.params;

  const {
    locale
  } = params;

  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  await getTranslations("studentPages");

  const userId = await requireStudentPage();

  const ebooks = await EbookService.studentLibrary();
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
