import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { checked } from "@/services/StudentRoutineService";
import { getZonedParts } from "@/lib/notifications/time";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { ManualBillingForm, type ManualPlanOption } from "./ManualBillingForm";

export async function StudentManualBillingPanel({
  studentId,
  locale,
}: {
  studentId: string;
  locale: string;
}) {
  await requireRole(["admin"], "/dashboard");
  const db = await createServiceClientSSR();
  const [plansResult, paymentsResult, operationsResult, providerResult] =
    await Promise.all([
      db
        .from("plans")
        .select("id,name_pt,name_en,currency,price_cents")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("order_index"),
      db
        .from("payments")
        .select("id,amount_cents,currency,method,paid_at")
        .eq("user_id", studentId)
        .eq("provider", "manual")
        .eq("is_duplicate", false)
        .order("created_at", { ascending: false })
        .limit(10),
      db.from("admin_manual_operations").select("id").limit(0),
      db.from("payments").select("id").eq("provider", "manual").limit(0),
    ]);
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt);
  const missingTypes = providerResult.error?.code === "22P02";
  const missingOperations = ["42P01", "PGRST205"].includes(
    operationsResult.error?.code || "",
  );
  if (missingTypes || missingOperations)
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t("Registrar acesso ou recebimento", "Record access or payment")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div role="alert" className="space-y-3 text-sm text-text-secondary">
            <p>
              {t(
                "Este banco ainda não tem as migrações necessárias para pagamentos manuais.",
                "This database is missing the migrations required for manual payments.",
              )}
            </p>
            <p>
              {t(
                "No SQL Editor do Supabase, execute os arquivos na ordem abaixo, em execuções separadas:",
                "In the Supabase SQL Editor, run these files in order, in separate executions:",
              )}
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                <code>000044_manual_payment_types.sql</code>
              </li>
              <li>
                <code>000045_manual_student_billing.sql</code>
              </li>
            </ol>
            <p>
              {t(
                "Depois, recarregue esta página. O histórico manual só será consultado quando o esquema estiver pronto.",
                "Then reload this page. Manual history will be available once the schema is ready.",
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  checked(providerResult, "manual payment provider schema");
  checked(operationsResult, "manual billing operations schema");
  const plans = checked(
    plansResult,
    "manual billing plans",
  ) as ManualPlanOption[];
  const payments = checked(paymentsResult, "manual billing history") as {
    id: string;
    amount_cents: number;
    currency: string;
    method: string;
    paid_at: string;
  }[];
  const methods: Record<string, string> = {
    cash: t("Dinheiro", "Cash"),
    pix: "PIX",
    credit_card: t("Cartão presencial", "Card in person"),
    bank_transfer: t("Transferência", "Bank transfer"),
  };
  return (
    <Card
      id="registrar-recebimento"
      className="scroll-mt-24 overflow-hidden border-white/[0.08] bg-[#101113]"
    >
      <CardHeader className="border-b border-white/[0.06]">
        <CardTitle>
          {t("Registrar acesso ou recebimento", "Record access or payment")}
        </CardTitle>
        <CardDescription>
          {t(
            "Libere acesso com vencimento e registre pagamentos recebidos fora da plataforma.",
            "Grant access with an expiration date and record payments received outside the platform.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid items-start gap-6 pt-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
        <ManualBillingForm
          studentId={studentId}
          plans={plans}
          locale={locale}
          today={getZonedParts(new Date(), "America/Sao_Paulo").dateKey}
          requestKey={randomUUID()}
        />
        <section className="min-w-0 space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold">
            {t("Últimos recebimentos manuais", "Recent manual receipts")}
          </h3>
          {!payments.length ? (
            <p className="text-sm text-text-secondary">
              {t(
                "Nenhum recebimento manual registrado.",
                "No manual receipts recorded.",
              )}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {payments.map((p) => (
                <li key={p.id} className="py-3 text-sm">
                  <p className="font-medium">
                    {new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: p.currency,
                    }).format(p.amount_cents / 100)}{" "}
                    · {methods[p.method] || p.method}
                  </p>
                  <p className="mt-1 text-text-secondary">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "short",
                      timeZone: "America/Sao_Paulo",
                    }).format(new Date(p.paid_at))}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="#historico-financeiro"
            className="inline-flex text-sm text-primary underline"
          >
            {t(
              "Ver histórico completo deste aluno",
              "View this student's full history",
            )}
          </Link>
        </section>
      </CardContent>
    </Card>
  );
}
