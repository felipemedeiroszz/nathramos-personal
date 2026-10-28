"use client";
import { useFormState, useFormStatus } from "react-dom";
import { inspectBillingRecordAction } from "@/app/actions/reconciliation";
function Submit({ en }: { en: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary text-primary-foreground p-2 disabled:opacity-50"
    >
      {pending
        ? en
          ? "Checking…"
          : "Consultando…"
        : en
          ? "Check provider"
          : "Conferir provedor"}
    </button>
  );
}
export function BillingInspectionForm({ locale }: { locale: string }) {
  const en = locale === "en-US";
  const [state, action] = useFormState(inspectBillingRecordAction, null);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-text-secondary">
        {en
          ? "Check status and amounts at the provider. Differences require review; this check does not modify charges."
          : "Consulta de status e valores no provedor. Divergências exigem revisão; esta conferência não altera cobranças."}
      </p>
      <label className="block text-sm">
        {en ? "Type" : "Tipo"}
        <select
          name="kind"
          className="block bg-surface border border-border rounded-lg p-2"
        >
          <option value="payments">{en ? "Payment" : "Pagamento"}</option>
          <option value="subscriptions">
            {en ? "Subscription" : "Assinatura"}
          </option>
        </select>
      </label>
      <label className="block text-sm">
        {en ? "Local ID" : "ID local"}
        <input
          name="id"
          required
          className="block w-full bg-surface border border-border rounded-lg p-2"
        />
      </label>
      <input type="hidden" name="locale" value={locale} />
      <Submit en={en} />
      {state && (
        <p role={state.success ? "status" : "alert"}>{state.message}</p>
      )}
    </form>
  );
}
