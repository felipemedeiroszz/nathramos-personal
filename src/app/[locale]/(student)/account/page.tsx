import type { Metadata } from "next";
import { setRequestLocale, getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { createClientSSR } from "@/lib/supabase/server";
import { requireAuthenticated } from "@/lib/auth/access";
import { SubscriptionService, ProfileService } from "@/lib/payments/services";
import { AccountPageClient } from "@/components/shared/AccountPageClient";

export const dynamic = "force-dynamic";

type LocaleKey = (typeof locales)[number];

export const metadata: Metadata = {
  title: "Conta",
};

export default async function AccountPage({
  params: { locale },
}: {
  params: { locale: LocaleKey };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  await getTranslations("account");

  const userId = await requireAuthenticated();
  const supabase = await createClientSSR();

  const { data: profileData } = await supabase
    .from("profiles")
    .select<string, any>(
      "id, first_name, last_name, email, phone, birth_date, gender, height_cm, weight_kg, country, language, avatar_url"
    )
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  const { data: authData } = await supabase.auth.getUser();
  const email = profileData?.email ?? authData?.user?.email ?? null;

  const sub = await SubscriptionService.getActive(userId);
  const planName = sub?.plan
    ? locale === "pt-BR"
      ? (sub.plan as any).name_pt ?? (sub.plan as any).name_en
      : (sub.plan as any).name_en ?? (sub.plan as any).name_pt
    : null;

  const subAny = sub as any;
  const subscriptionSummary = sub
    ? {
        status: subAny.status ?? "inactive",
        plan_name: planName,
        current_period_end: subAny.current_period_end ?? null,
        payment_method: subAny.payment_method ?? subAny.external_provider ?? null,
        amount_cents: (subAny.plan as any)?.amount_cents ?? null,
        billing_cycle_days: (subAny.plan as any)?.billing_cycle_days ?? null,
      }
    : null;

  const profile = {
    id: userId,
    first_name: profileData?.first_name ?? null,
    last_name: profileData?.last_name ?? null,
    email,
    phone: profileData?.phone ?? null,
    birth_date: profileData?.birth_date ?? null,
    gender: profileData?.gender ?? null,
    height_cm: profileData?.height_cm ?? null,
    weight_kg: profileData?.weight_kg ?? null,
    country: profileData?.country ?? null,
    language: profileData?.language ?? null,
    avatar_url: profileData?.avatar_url ?? null,
  };

  return <AccountPageClient locale={locale} profile={profile} subscription={subscriptionSummary} />;
}
