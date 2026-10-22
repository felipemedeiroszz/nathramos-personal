import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default function NewFoodPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  redirect(`/${locale}/admin/alimentos?new=1`);
}
