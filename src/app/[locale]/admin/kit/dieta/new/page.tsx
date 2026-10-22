import { redirect, notFound } from "next/navigation";
import { locales } from "@/i18n/config";

export const dynamic = "force-dynamic";

// Alias amigável: /admin/kit/dieta/new -> /admin/kits/dietas/new
export default function NewDietKitAliasPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  redirect(`/${locale}/admin/kits/dietas/new`);
}
