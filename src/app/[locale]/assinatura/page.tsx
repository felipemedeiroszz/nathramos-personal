import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAuthenticated } from "@/lib/auth/access";
import { studentBillingSummary } from "@/lib/payments/student";
import { PaymentCenter } from "@/components/payments/PaymentCenter";
import { StudentLayoutClient } from "@/components/shared/StudentLayoutClient";
import { logoutAction } from "@/app/actions/account";
export const dynamic = "force-dynamic";
export const metadata = { title: "Assinatura e pagamentos" };
export default async function PaymentCenterPage({
  params: { locale },
  searchParams = {},
}: {
  params: { locale: string };
  searchParams?: Record<string, string | undefined>;
}) {
  setRequestLocale(locale);
  const userId = await requireAuthenticated();
  const data = await studentBillingSummary(userId, searchParams);
  if (!data) redirect(`/${locale}/login`);
  // Billing remains available to students who need to renew their access.
  return (
    <StudentLayoutClient
      locale={locale}
      firstName={data.name?.split(" ")[0]}
      subscriptionAllowed={data.access.allowed}
      maintenance={{ active: false, until: null }}
      onLogout={logoutAction}
    >
      <PaymentCenter locale={locale} data={data} />
    </StudentLayoutClient>
  );
}
