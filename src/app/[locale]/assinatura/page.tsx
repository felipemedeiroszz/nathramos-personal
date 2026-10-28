import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAuthenticated } from "@/lib/auth/access";
import { studentBillingSummary } from "@/lib/payments/student";
import { PaymentCenter } from "@/components/payments/PaymentCenter";
import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
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
  return (
    <>
      <div className="print:hidden">
        <PublicHeader locale={locale} />
      </div>
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16 md:px-6 print:max-w-none print:p-0">
        <PaymentCenter locale={locale} data={data} />
      </main>
      <div className="print:hidden">
        <PublicFooter locale={locale} />
      </div>
    </>
  );
}
