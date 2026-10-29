import type { Metadata } from "next";
import {
  setRequestLocale,
  getTranslations,
  unstable_setRequestLocale,
} from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { createClientSSR } from "@/lib/supabase/server";
import { requireAuthenticated, canAccessPlatform } from "@/lib/auth/access";
import { SubscriptionService, PaymentService } from "@/lib/payments/services";
import { NotificationService } from "@/services/NotificationService";
import { PushService } from "@/services/PushService";
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
      "id, first_name, last_name, phone, birth_date, gender, height_cm, weight_kg, country, language, avatar_url",
    )
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  const { data: authData } = await supabase.auth.getUser();
  const email = authData?.user?.email ?? null;

  const sub = await SubscriptionService.getActive(userId);
  const planName = sub?.plan
    ? locale === "pt-BR"
      ? ((sub.plan as any).name_pt ?? (sub.plan as any).name_en)
      : ((sub.plan as any).name_en ?? (sub.plan as any).name_pt)
    : null;

  const subAny = sub as any;
  const plan = subAny?.plan ?? null;

  // Histórico de pagamentos alimenta a lista e também a forma de pagamento (último cartão)
  const paymentHistory = await PaymentService.getUserPaymentHistory(userId, 50);
  const latestCard = paymentHistory.find((pay) => !!pay.card_last4) ?? null;

  const subscriptionSummary = sub
    ? {
        id: subAny.id as string,
        status: subAny.status ?? "inactive",
        plan_name: planName,
        current_period_start: subAny.current_period_start ?? null,
        current_period_end: subAny.current_period_end ?? null,
        trial_ends_at: subAny.trial_ends_at ?? null,
        cancel_at_period_end: !!subAny.cancel_at_period_end,
        canceled_at: subAny.canceled_at ?? null,
        last_paid_at: subAny.last_paid_at ?? null,
        last_failed_at: subAny.last_failed_at ?? null,
        billing_cycle_days:
          plan?.billing_cycle_days ?? subAny.billing_cycle_days ?? null,
        amount_cents: plan?.price_cents ?? subAny.unit_amount_cents ?? null,
        currency: subAny.currency ?? plan?.currency ?? null,
        provider: subAny.provider ?? null,
        payment_method:
          subAny.payment_method_pref ?? latestCard?.method ?? null,
        card_last4: latestCard?.card_last4 ?? null,
        card_brand: latestCard?.card_brand ?? null,
        grace_days: plan?.grace_days ?? null,
      }
    : null;

  const payments = paymentHistory.map((pay) => ({
    id: pay.id,
    status: pay.status,
    amount_cents: pay.amount_cents,
    currency: pay.currency,
    method: pay.method,
    created_at: pay.created_at,
    paid_at: pay.paid_at ?? null,
    due_at: pay.due_at ?? null,
    failed_at: pay.failed_at ?? null,
    pix_copy_paste: pay.pix_copy_paste ?? null,
    card_last4: pay.card_last4 ?? null,
    card_brand: pay.card_brand ?? null,
    description_pt: pay.description_pt ?? null,
    description_en: pay.description_en ?? null,
  }));

  const access = await canAccessPlatform(userId);

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

  const [notificationPreferences, notificationSettings, notificationDevices] =
    await Promise.all([
      NotificationService.getPreferences(userId),
      NotificationService.getNotifySettings(userId),
      PushService.countDevices(userId),
    ]);

  return (
    <AccountPageClient
      locale={locale}
      profile={profile}
      subscription={subscriptionSummary}
      payments={payments}
      access={access}
      notificationPreferences={notificationPreferences}
      notificationSettings={notificationSettings}
      notificationDevices={notificationDevices}
    />
  );
}
