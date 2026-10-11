import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { EbookService } from "@/services/EbookService";
import type { EbookRow } from "@/types";
import { AdminEbooksClient } from "./AdminEbooksClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Ebooks",
};

async function safe(t: any, key: string, fb: string) {
  try {
    if (t && t.has && t.has(key)) return t(key);
  } catch {}
  return fb;
}

export default async function AdminEbooksPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams?: {
    q?: string;
    published?: string;
    free?: string;
    language?: string;
  };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const tCommon = await getTranslations("common");
  const { userId } = await requireRole(["admin", "coach"], "/dashboard");

  const title = await safe(tAdminNav, "ebooks", "E-books");
  const subtitle = await safe(
    tAdmin,
    "ebooks.subtitle",
    "Gerencie a biblioteca de e-books"
  );

  const q = searchParams?.q ?? "";
  const publishedParam = searchParams?.published;
  const freeParam = searchParams?.free;
  const languageParam = searchParams?.language;

  const filters: {
    search?: string;
    is_published?: boolean;
    is_free?: boolean;
    language?: any;
    limit?: number;
  } = { limit: 50 };

  if (q && q.trim().length > 0) filters.search = q.trim();
  if (publishedParam === "1") filters.is_published = true;
  if (publishedParam === "0") filters.is_published = false;
  if (freeParam === "1") filters.is_free = true;
  if (freeParam === "0") filters.is_free = false;
  if (languageParam && (languageParam === "pt-BR" || languageParam === "en-US")) {
    filters.language = languageParam;
  }

  const ebooks: EbookRow[] = await EbookService.listEbooks(filters);

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">{subtitle}</p>
      </header>

      <AdminEbooksClient
        locale={locale}
        userId={userId}
        title={title}
        ebooks={ebooks}
        searchValue={q}
      />
    </div>
  );
}
