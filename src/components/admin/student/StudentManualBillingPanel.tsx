import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { checked } from "@/services/StudentRoutineService";
import { getZonedParts } from "@/lib/notifications/time";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ManualBillingForm, type ManualPlanOption } from "./ManualBillingForm";

export async function StudentManualBillingPanel({ studentId, locale }: { studentId: string; locale: string }) {
  await requireRole(["admin"], "/dashboard");
  const db = await createServiceClientSSR();
  const [plansResult, paymentsResult] = await Promise.all([
    db.from("plans").select("id,name_pt,name_en,currency,price_cents").eq("is_active", true).eq("is_deleted", false).order("order_index"),
    db.from("payments").select("id,amount_cents,currency,method,paid_at").eq("user_id", studentId).eq("provider", "manual").eq("is_duplicate", false).order("created_at", { ascending: false }).limit(10),
  ]);
  const plans = checked(plansResult, "manual billing plans") as ManualPlanOption[];
  const payments = checked(paymentsResult, "manual billing history") as { id: string; amount_cents: number; currency: string; method: string; paid_at: string }[];
  const en = locale === "en-US", t = (pt: string, english: string) => en ? english : pt;
  const methods: Record<string, string> = { cash: t("Dinheiro", "Cash"), pix: "PIX", credit_card: t("Cartão presencial", "Card in person"), bank_transfer: t("Transferência", "Bank transfer") };
  return <Card>
    <CardHeader><CardTitle>{t("Plano e pagamentos manuais", "Manual plan and payments")}</CardTitle>
      <CardDescription>{t("Libere acesso com vencimento e registre pagamentos recebidos fora da plataforma.", "Grant access with an expiration date and record payments received outside the platform.")}</CardDescription></CardHeader>
    <CardContent className="grid gap-6 xl:grid-cols-2">
      <ManualBillingForm studentId={studentId} plans={plans} locale={locale} today={getZonedParts(new Date(), "America/Sao_Paulo").dateKey} requestKey={randomUUID()} />
      <section className="min-w-0 space-y-3"><h3 className="font-semibold">{t("Últimos recebimentos manuais", "Recent manual receipts")}</h3>
        {!payments.length ? <p className="text-sm text-text-secondary">{t("Nenhum recebimento manual registrado.", "No manual receipts recorded.")}</p> :
          <ul className="divide-y divide-border">{payments.map(p => <li key={p.id} className="py-3 text-sm">
            <p className="font-medium">{new Intl.NumberFormat(locale, { style: "currency", currency: p.currency }).format(p.amount_cents / 100)} · {methods[p.method] || p.method}</p>
            <p className="mt-1 text-text-secondary">{new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(p.paid_at))}</p>
          </li>)}</ul>}
        <Link href="#historico-financeiro" className="inline-flex text-sm text-primary underline">{t("Ver histórico completo deste aluno", "View this student's full history")}</Link>
      </section>
    </CardContent>
  </Card>;
}
