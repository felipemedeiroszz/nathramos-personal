import "./student.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locales, defaultLocale } from "@/i18n/config";
import {
  requireAuthenticated,
  getCurrentRole,
  canAccessPlatform,
} from "@/lib/auth/access";
import { getMaintenanceStatus } from "@/services/PlatformSettingsService";
import { createClientSSR } from "@/lib/supabase/server";
import { StudentLayoutClient } from "@/components/shared/StudentLayoutClient";
import { SubscriptionService } from "@/lib/payments/services";
import { logoutAction } from "@/app/actions/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "App",
};

export default async function StudentLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) {
    notFound();
  }
  setRequestLocale(locale);
  await getTranslations("common");

  const userId = await requireAuthenticated();
  const role = (await getCurrentRole()) ?? "student";

  const allowedRole =
    role === "admin" || role === "coach" || role === "student";
  if (!allowedRole) {
    const fallback = (
      locales.includes(locale as any) ? locale : defaultLocale
    ) as string;
    notFound();
  }

  const access = await canAccessPlatform(userId);
  const isAdmin = role === "admin" || role === "coach";
  const subscriptionAllowed = isAdmin || access.allowed;
  const subscription =
    !isAdmin && subscriptionAllowed
      ? await SubscriptionService.getActive(userId)
      : null;
  const pixExpiresAt =
    subscription?.provider === "asaas" &&
    (subscription.source === "asaas_pix" ||
      subscription.external_id?.startsWith("pay_"))
      ? subscription.current_period_end
      : null;

  // Modo manutenção: bloqueia apenas alunos (admin/coach continuam com acesso).
  const maintenanceStatus = await getMaintenanceStatus();
  const maintenance = {
    active: !isAdmin && maintenanceStatus.active,
    until: maintenanceStatus.until,
  };

  let firstName: string | null = null;
  let lastName: string | null = null;
  let photoUrl: string | null = null;

  try {
    const supabase = await createClientSSR();
    const { data } = await supabase
      .from("profiles")
      .select<
        string,
        {
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
        }
      >("first_name, last_name, avatar_url")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();
    firstName = data?.first_name ?? null;
    lastName = data?.last_name ?? null;
    photoUrl = data?.avatar_url ?? null;
  } catch {}

  return (
    <StudentLayoutClient
      locale={locale}
      firstName={firstName}
      lastName={lastName}
      photoUrl={photoUrl}
      subscriptionAllowed={subscriptionAllowed}
      accessExpiresAt={pixExpiresAt}
      maintenance={maintenance}
      onLogout={logoutAction}
    >
      {children}
    </StudentLayoutClient>
  );
}
