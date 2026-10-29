import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { dataFilters, type PageParams } from "@/lib/admin/data-page";
import { BillingInspectionForm } from "./BillingInspectionForm";
export async function FinanceChecks({
  params,
  locale,
}: {
  params: PageParams;
  locale: string;
}) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  const now = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
  const filters = dataFilters({
    ...params,
    from: params.from || now.slice(0, 7) + "-01",
    to: params.to || now,
    currency: params.currency || "BRL",
  });
  const db = await createServiceClientSSR();
  const { data, error } = await (db.rpc as any)("admin_finance_checks", {
    p_actor: userId,
    p_currency: filters.currency,
    p_from: filters.from,
    p_to: filters.to,
  });
  if (error) throw new Error("Não foi possível conferir o financeiro.");
  const en = locale === "en-US";
  const labels: Record<string, string> = en
    ? {
        failed_webhooks: "Failed webhooks",
        pending_webhooks: "Unprocessed webhooks (>5 minutes)",
        expired_active: "Active subscriptions with expired periods",
        missing_external_ids: "Subscriptions missing external IDs",
        paid_without_active_subscription:
          "Paid charges linked to inactive subscriptions",
      }
    : {
        failed_webhooks: "Webhooks com erro",
        pending_webhooks: "Webhooks sem processamento (>5 minutos)",
        expired_active: "Assinaturas ativas com período vencido",
        missing_external_ids: "Assinaturas sem ID externo",
        paid_without_active_subscription:
          "Cobranças pagas ligadas a assinaturas inativas",
      };
  return (
    <section className="admin-data-controls rounded-2xl border border-border p-5 space-y-4">
      <h2 className="text-sm font-semibold">
        {en ? "Financial reconciliation" : "Conferência financeira"}
      </h2>
      <form className="flex flex-wrap gap-3">
        <label className="text-xs">
          {en ? "From" : "De"}
          <input
            type="date"
            name="from"
            defaultValue={filters.from}
            required
            className="block p-2 bg-surface border border-border rounded-lg"
          />
        </label>
        <label className="text-xs">
          {en ? "Through" : "Até"}
          <input
            type="date"
            name="to"
            defaultValue={filters.to}
            required
            className="block p-2 bg-surface border border-border rounded-lg"
          />
        </label>
        <select
          name="currency"
          aria-label={en ? "Currency" : "Moeda"}
          defaultValue={filters.currency}
          className="bg-surface border border-border rounded-lg p-2"
        >
          <option>BRL</option>
          <option>USD</option>
        </select>
        <button
          className="self-end rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          type="submit"
        >
          {en ? "Apply" : "Aplicar"}
        </button>
      </form>
      <p>
        {en ? "Gross paid revenue in period" : "Receita bruta paga no período"}:{" "}
        <strong>
          {new Intl.NumberFormat(locale, {
            style: "currency",
            currency: filters.currency,
          }).format(data.paid_cents / 100)}
        </strong>
      </p>
      <dl className="grid sm:grid-cols-2 gap-3">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key}>
            <dt className="text-sm text-text-secondary">{label}</dt>
            <dd className="font-semibold">{data[key]}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-text-secondary">
        {en
          ? "Alerts are review candidates. Cancellations and grace periods may explain discrepancies. Webhook counts cover all currencies."
          : "Alertas indicam itens para revisão. Cancelamentos e períodos de tolerância podem explicar divergências. Contadores de webhooks abrangem todas as moedas."}
      </p>
      <BillingInspectionForm locale={locale} />
    </section>
  );
}
