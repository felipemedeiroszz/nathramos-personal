"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { recordStudentManualAction } from "@/app/actions/manualBilling";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export type ManualPlanOption = {
  id: string;
  name_pt: string;
  name_en: string;
  currency: string;
  price_cents: number;
};

function Submit({ en }: { en: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending
        ? en
          ? "Saving…"
          : "Salvando…"
        : en
          ? "Save manual entry"
          : "Salvar registro manual"}
    </Button>
  );
}

export function ManualBillingForm({
  studentId,
  plans,
  locale,
  today,
  requestKey,
}: {
  studentId: string;
  plans: ManualPlanOption[];
  locale: string;
  today: string;
  requestKey: string;
}) {
  const [state, action] = useActionState(recordStudentManualAction, null);
  const [operation, setOperation] = useState("plan_payment");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [key, setKey] = useState(requestKey);
  const [draft, setDraft] = useState({
    expires: "",
    amount: "",
    paidDate: today,
    method: "cash",
    currency: "BRL",
    notes: "",
  });
  const form = useRef<HTMLFormElement>(null);
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt);
  const plan = plans.find((p) => p.id === planId);
  const selectClass =
    "mt-2 block min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm";
  useEffect(() => {
    if (state?.success) {
      form.current?.reset();
      setKey(crypto.randomUUID());
      setDraft({
        expires: "",
        amount: "",
        paidDate: today,
        method: "cash",
        currency: "BRL",
        notes: "",
      });
    }
  }, [state, today]);
  return (
    <form ref={form} action={action} className="space-y-5">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="requestKey" value={key} />
      <input type="hidden" name="locale" value={locale} />
      <div
        className="grid gap-2 sm:grid-cols-3"
        aria-label={t("Tipo de registro", "Entry type")}
      >
        {[
          [
            "plan_payment",
            t("Plano + pagamento", "Plan + payment"),
            t(
              "Libere acesso e registre o valor",
              "Grant access and record funds",
            ),
          ],
          [
            "plan",
            t("Liberar acesso", "Grant access"),
            t("Sem registrar recebimento", "Without recording funds"),
          ],
          [
            "payment",
            t("Receber pagamento", "Record payment"),
            t("Mantenha o acesso atual", "Keep current access"),
          ],
        ].map(([value, title, description]) => (
          <button
            key={value}
            type="button"
            aria-pressed={operation === value}
            onClick={() => setOperation(value)}
            className={`rounded-xl border p-3 text-left transition ${operation === value ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300" : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25"}`}
          >
            <span className="block text-xs font-semibold">{title}</span>
            <span className="mt-1 block text-[11px] leading-relaxed opacity-75">
              {description}
            </span>
          </button>
        ))}
      </div>
      <label className="hidden">
        {t("O que deseja registrar?", "What would you like to record?")}
        <select
          name="operation"
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          className={selectClass}
        >
          <option value="plan_payment">
            {t("Plano + pagamento recebido", "Plan + received payment")}
          </option>
          <option value="plan">
            {t("Somente plano e acesso", "Plan and access only")}
          </option>
          <option value="payment">
            {t("Somente pagamento recebido", "Received payment only")}
          </option>
        </select>
      </label>
      {operation !== "payment" && (
        <div className="grid gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:grid-cols-2">
          <label className="block text-sm">
            {t("Plano", "Plan")}
            <select
              name="planId"
              required
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className={selectClass}
            >
              <option value="">{t("Selecione", "Select")}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {en ? p.name_en : p.name_pt} ·{" "}
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: p.currency,
                  }).format(p.price_cents / 100)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {t("Acesso até (inclusive)", "Access through (inclusive)")}
            <Input
              className="mt-2"
              name="expires"
              value={draft.expires}
              onChange={(event) =>
                setDraft((value) => ({ ...value, expires: event.target.value }))
              }
              type="date"
              required
              min={today}
            />
          </label>
          <p className="text-xs text-text-secondary sm:col-span-2">
            {t(
              "O acesso começa agora e termina ao final da data escolhida, no horário de São Paulo. Não há renovação automática. Uma nova liberação substitui o período manual anterior.",
              "Access starts now and ends at the end of the chosen date in São Paulo time. No automatic renewal. A new grant replaces the previous manual period.",
            )}
          </p>
          {!plans.length && (
            <p role="alert" className="text-sm text-amber-300 sm:col-span-2">
              {t(
                "Cadastre ou ative um plano em Planos antes de liberar o acesso.",
                "Create or activate a plan under Plans before granting access.",
              )}
            </p>
          )}
        </div>
      )}
      <label className="block text-sm">
        {t("Moeda", "Currency")}
        {operation !== "payment" ? (
          <>
            <input
              type="hidden"
              name="currency"
              value={plan?.currency || "BRL"}
            />
            <p className="mt-2">{plan?.currency || "BRL"}</p>
          </>
        ) : (
          <select
            name="currency"
            className={selectClass}
            value={draft.currency}
            onChange={(event) =>
              setDraft((value) => ({ ...value, currency: event.target.value }))
            }
          >
            <option>BRL</option>
            <option>USD</option>
          </select>
        )}
      </label>
      {operation !== "plan" && (
        <div className="grid gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:grid-cols-2">
          <label className="block text-sm">
            {t("Valor recebido", "Amount received")}
            <Input
              className="mt-2"
              name="amount"
              value={draft.amount}
              onChange={(event) =>
                setDraft((value) => ({ ...value, amount: event.target.value }))
              }
              inputMode="decimal"
              placeholder="150,00"
              required
              pattern="[0-9]+([.,][0-9]{1,2})?"
            />
            {plan && operation === "plan_payment" && (
              <button
                type="button"
                className="mt-2 text-xs text-yellow-400 hover:underline"
                onClick={() =>
                  setDraft((value) => ({
                    ...value,
                    amount: (plan.price_cents / 100)
                      .toFixed(2)
                      .replace(".", ","),
                  }))
                }
              >
                {t("Usar valor do plano", "Use plan price")}
              </button>
            )}
          </label>
          <label className="block text-sm">
            {t("Data do recebimento", "Receipt date")}
            <Input
              className="mt-2"
              name="paidDate"
              type="date"
              required
              max={today}
              value={draft.paidDate}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  paidDate: event.target.value,
                }))
              }
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            {t("Forma de pagamento", "Payment method")}
            <select
              name="method"
              className={selectClass}
              value={draft.method}
              onChange={(event) =>
                setDraft((value) => ({ ...value, method: event.target.value }))
              }
            >
              <option value="cash">{t("Dinheiro", "Cash")}</option>
              <option value="pix">PIX</option>
              <option value="bank_transfer">
                {t("Transferência bancária", "Bank transfer")}
              </option>
              <option value="credit_card">
                {t(
                  "Cartão recebido presencialmente",
                  "Card received in person",
                )}
              </option>
            </select>
          </label>
          <p className="text-xs text-text-secondary sm:col-span-2">
            {t(
              "Registre apenas valores já recebidos. Este lançamento não cobra o aluno. Somente pagamento não altera o prazo de acesso.",
              "Record only funds already received. This entry does not charge the student. A payment-only entry does not change access expiration.",
            )}
          </p>
        </div>
      )}
      <label className="block text-sm">
        {t("Observação / referência (opcional)", "Note / reference (optional)")}
        <Input
          className="mt-2"
          name="notes"
          value={draft.notes}
          onChange={(event) =>
            setDraft((value) => ({ ...value, notes: event.target.value }))
          }
          maxLength={1000}
          placeholder={t(
            "Ex.: recebido em dinheiro na academia",
            "E.g. cash received at the gym",
          )}
        />
      </label>
      <div className="rounded-xl border border-yellow-400/15 bg-yellow-400/5 p-4">
        <p className="text-xs font-semibold text-yellow-300">
          {t("Confira antes de salvar", "Review before saving")}
        </p>
        <p className="mt-2 text-sm text-zinc-300">
          {operation !== "payment"
            ? plan
              ? en
                ? plan.name_en
                : plan.name_pt
              : t("Selecione um plano", "Choose a plan")
            : t("Recebimento avulso", "One-off receipt")}
          {draft.amount && operation !== "plan"
            ? ` · ${operation === "payment" ? draft.currency : plan?.currency || "BRL"} ${draft.amount}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {t(
            "O registro não envia uma cobrança ao aluno.",
            "This entry does not charge the student.",
          )}
        </p>
      </div>
      <Submit en={en} />
      {state && (
        <p
          role={state.success ? "status" : "alert"}
          className={
            state.success ? "text-sm text-emerald-300" : "text-sm text-rose-300"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
