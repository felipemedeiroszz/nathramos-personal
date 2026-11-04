import { redirect, notFound } from "next/navigation";
import { locales } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function NewDietKitPage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  redirect(`/${locale}/admin/kits/dietas?new=1`);
}
