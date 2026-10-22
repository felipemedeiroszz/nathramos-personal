import { redirect, notFound } from "next/navigation";
import { locales } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default function NewDietKitPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  redirect(`/${locale}/admin/kits/dietas?new=1`);
}
