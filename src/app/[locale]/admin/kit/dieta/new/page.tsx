import { redirect, notFound } from "next/navigation";
import { locales } from "@/i18n/config";

export const dynamic = "force-dynamic";

// Alias amigável: /admin/kit/dieta/new -> /admin/kits/dietas/new
export default async function NewDietKitAliasPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  redirect(`/${locale}/admin/kits/dietas/new`);
}
