"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { recordStudentManualAction } from "@/app/actions/manualBilling";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export type ManualPlanOption = { id: string; name_pt: string; name_en: string; currency: string; price_cents: number };

function Submit({ en }: { en: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? (en ? "Saving…" : "Salvando…") : (en ? "Save manual entry" : "Salvar registro manual")}</Button>;
}

export function ManualBillingForm({ studentId, plans, locale, today, requestKey }: {
  studentId: string; plans: ManualPlanOption[]; locale: string; today: string; requestKey: string;
}) {
  const [state, action] = useFormState(recordStudentManualAction, null);
  const [operation, setOperation] = useState("plan_payment");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [key, setKey] = useState(requestKey);
  const form = useRef<HTMLFormElement>(null);
  const en = locale === "en-US", t = (pt: string, english: string) => en ? english : pt;
  const plan = plans.find(p => p.id === planId);
  const selectClass = "mt-2 block min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm";
  useEffect(() => {
    if (state?.success) { form.current?.reset(); setKey(crypto.randomUUID()); }
  }, [state]);
  return <form ref={form} action={action} className="space-y-4">
    <input type="hidden" name="studentId" value={studentId} />
    <input type="hidden" name="requestKey" value={key} />
    <input type="hidden" name="locale" value={locale} />
    <label className="block text-sm">{t("O que deseja registrar?", "What would you like to record?")}
      <select name="operation" value={operation} onChange={e => setOperation(e.target.value)} className={selectClass}>
        <option value="plan_payment">{t("Plano + pagamento recebido", "Plan + received payment")}</option>
        <option value="plan">{t("Somente plano e acesso", "Plan and access only")}</option>
        <option value="payment">{t("Somente pagamento recebido", "Received payment only")}</option>
      </select></label>
    {operation !== "payment" && <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">{t("Plano", "Plan")}
        <select name="planId" required value={planId} onChange={e => setPlanId(e.target.value)} className={selectClass}>
          <option value="">{t("Selecione", "Select")}</option>
          {plans.map(p => <option key={p.id} value={p.id}>{en ? p.name_en : p.name_pt} · {new Intl.NumberFormat(locale, { style: "currency", currency: p.currency }).format(p.price_cents / 100)}</option>)}
        </select></label>
      <label className="block text-sm">{t("Acesso até (inclusive)", "Access through (inclusive)")}
        <Input className="mt-2" name="expires" type="date" required min={today} /></label>
      <p className="text-xs text-text-secondary sm:col-span-2">{t("O acesso começa agora e termina ao final da data escolhida, no horário de São Paulo. Não há renovação automática. Uma nova liberação substitui o período manual anterior.", "Access starts now and ends at the end of the chosen date in São Paulo time. No automatic renewal. A new grant replaces the previous manual period.")}</p>
      {!plans.length && <p role="alert" className="text-sm text-amber-300 sm:col-span-2">{t("Cadastre ou ative um plano em Planos antes de liberar o acesso.", "Create or activate a plan under Plans before granting access.")}</p>}
    </div>}
    <label className="block text-sm">{t("Moeda", "Currency")}
      {operation !== "payment" ? <><input type="hidden" name="currency" value={plan?.currency || "BRL"} /><p className="mt-2">{plan?.currency || "BRL"}</p></> :
        <select name="currency" className={selectClass}><option>BRL</option><option>USD</option></select>}
    </label>
    {operation !== "plan" && <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">{t("Valor recebido", "Amount received")}<Input className="mt-2" name="amount" inputMode="decimal" placeholder="150,00" required pattern="[0-9]+([.,][0-9]{1,2})?" /></label>
      <label className="block text-sm">{t("Data do recebimento", "Receipt date")}<Input className="mt-2" name="paidDate" type="date" required max={today} defaultValue={today} /></label>
      <label className="block text-sm sm:col-span-2">{t("Forma de pagamento", "Payment method")}
        <select name="method" className={selectClass}>
          <option value="cash">{t("Dinheiro", "Cash")}</option><option value="pix">PIX</option>
          <option value="bank_transfer">{t("Transferência bancária", "Bank transfer")}</option><option value="credit_card">{t("Cartão recebido presencialmente", "Card received in person")}</option>
        </select></label>
      <p className="text-xs text-text-secondary sm:col-span-2">{t("Registre apenas valores já recebidos. Este lançamento não cobra o aluno. Somente pagamento não altera o prazo de acesso.", "Record only funds already received. This entry does not charge the student. A payment-only entry does not change access expiration.")}</p>
    </div>}
    <label className="block text-sm">{t("Observação / referência (opcional)", "Note / reference (optional)")}
      <Input className="mt-2" name="notes" maxLength={1000} placeholder={t("Ex.: recebido em dinheiro na academia", "E.g. cash received at the gym")} /></label>
    <Submit en={en} />
    {state && <p role={state.success ? "status" : "alert"} className={state.success ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>{state.message}</p>}
  </form>;
}
