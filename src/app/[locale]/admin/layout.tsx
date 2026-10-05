import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { requireRole } from "@/lib/auth/access";
import { createClientSSR } from "@/lib/supabase/server";
import { AdminLayoutClient } from "@/components/shared/AdminLayoutClient";
import { logoutAction } from "@/app/actions/account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminLayout({
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
  await getTranslations("adminNav");

  const { userId, role } = await requireRole(["admin", "coach"], "/dashboard");

  let firstName: string | null = null;
  let lastName: string | null = null;
  let photoUrl: string | null = null;

  try {
    const supabase = await createClientSSR();
    const { data } = await supabase
      .from("profiles")
      .select<string, { first_name: string | null; last_name: string | null; avatar_url: string | null; role: string | null }>(
        "first_name, last_name, avatar_url, role"
      )
      .eq("id", userId)
      .limit(1)
      .maybeSingle();
    firstName = data?.first_name ?? null;
    lastName = data?.last_name ?? null;
    photoUrl = data?.avatar_url ?? null;
  } catch {}

  return (
    <AdminLayoutClient
      locale={locale}
      firstName={firstName}
      lastName={lastName}
      photoUrl={photoUrl}
      role={role}
      onLogout={logoutAction}
    >
      {children}
    </AdminLayoutClient>
  );
}
