"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Clock,
  RefreshCw,
  Download,
  Printer,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import type { studentBillingSummary } from "@/lib/payments/student";
const labels: Record<string, [string, string]> = {
  paid: ["Pago", "Paid"],
  pending: ["Aguardando pagamento", "Awaiting payment"],
  processing: ["Em processamento", "Processing"],
  failed: ["Não aprovado", "Failed"],
  expired: ["Vencido", "Expired"],
  canceled: ["Cancelado", "Canceled"],
  refunded: ["Estornado", "Refunded"],
  partially_refunded: ["Estorno parcial", "Partially refunded"],
  active: ["Ativa", "Active"],
  trialing: ["Período de teste", "Trial"],
  past_due: ["Pagamento em atraso", "Past due"],
  blocked: ["Acesso bloqueado", "Access blocked"],
  inactive: ["Inativa", "Inactive"],
  credit_card: ["Cartão", "Card"],
  pix: ["PIX avulso", "One-off PIX"],
  boleto: ["Boleto", "Bank slip"],
  bank_transfer: ["Transferência", "Bank transfer"],
};
const box = "rounded-2xl border border-border bg-surface p-5 md:p-6";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-wait";
export function PaymentCenter({
  locale,
  data,
}: {
  locale: string;
  data: Awaited<ReturnType<typeof studentBillingSummary>>;
}) {
  const en = locale === "en-US",
    router = useRouter(),
    text = (pt: string, eng: string) => (en ? eng : pt);
  const { subscription: sub, access, payments, operations } = data;
  const [busy, setBusy] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [confirm, setConfirm] = useState<{ kind: string; id: string } | null>(null);
  const money = (cents: number, currency = "BRL") =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(
      cents / 100,
    );
  const date = (value?: string | null) =>
    value
      ? new Date(value).toLocaleString(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo",
        })
      : "—";
  const label = (value: string) => labels[value]?.[en ? 1 : 0] || value;
  const recurring = sub?.provider === "stripe",
    prepaid =
      sub?.provider === "asaas" &&
      (sub.source === "asaas_pix" || sub.external_id?.startsWith("pay_"));
  const openOperations = operations.filter(
    (op: any) =>
      op.state === "creating" || Date.parse(op.expires_at) > Date.now(),
  );
  const localPending = useMemo(
    () =>
      payments.rows.filter(
        (p: any) =>
          p.provider === "asaas" &&
          ["pending", "processing"].includes(p.status),
      ),
    [payments.rows],
  );
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) router.refresh();
    };
    const remaining = Date.parse(sub?.current_period_end || "") - Date.now();
    const timer =
      remaining > 0
        ? setTimeout(refresh, Math.min(remaining + 100, 2147483647))
        : null;
    window.addEventListener("focus", refresh);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [sub?.current_period_end, router]);
  async function run(key: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : text(
              "Não foi possível concluir. Tente novamente.",
              "Unable to complete. Please retry.",
            ),
      );
    } finally {
      setBusy(null);
      router.refresh();
    }
  }
  async function post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error ||
          text("Operação indisponível.", "Operation unavailable."),
      );
    return result;
  }
  async function verify(payment: any) {
    const response = await fetch(`/api/payments/asaas/${payment.id}`, {
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        text(
          "Não foi possível consultar o pagamento. Seu registro foi preservado.",
          "Unable to check payment. Your record was preserved.",
        ),
      );
    const updated = await response.json();
    setSelected((current: any) =>
      current?.id === updated.id ? { ...current, ...updated } : current,
    );
    setMessage(
      text("Situação atual: ", "Current status: ") + label(updated.status),
    );
  }
  useEffect(() => {
    if (!localPending.length) return;
    let stopped = false,
      running = false;
    const check = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        for (const p of localPending) {
          if (stopped) break;
          const r = await fetch(`/api/payments/asaas/${p.id}`, {
            cache: "no-store",
          });
          if (r.ok) {
            const next = await r.json();
            if (next.status !== p.status && !stopped) router.refresh();
          }
        }
      } catch {
        /* Manual verification remains available. */
      } finally {
        running = false;
      }
    };
    const timer = setInterval(() => void check(), 15000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [localPending, router]);
  return (
    <div className="student-billing-print space-y-7 print:text-black">
      <style>{`@media print {
        @page { margin: 14mm; }
        body:has(.student-billing-print) { background: white !important; color-scheme: light; }
        .student-billing-print { --background:0 0% 100%; --surface:0 0% 100%; --text:0 0% 10%; --text-secondary:0 0% 35%; --border:0 0% 80%; --primary:35 90% 28%; --primary-foreground:0 0% 100%; }
        .student-billing-print article { break-inside:avoid; }
      }`}</style>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">
            {text("Sua conta · Financeiro", "Your account · Billing")}
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {text("Assinatura e pagamentos", "Subscription and payments")}
          </h1>
          <p className="mt-2 text-text-secondary">
            {text(
              "Acompanhe seu acesso, renove e consulte cada pagamento em um só lugar.",
              "Track access, renew and review every payment in one place.",
            )}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            className={button}
            disabled={!!busy}
            onClick={() => router.refresh()}
          >
            <RefreshCw size={16} />
            {text("Atualizar", "Refresh")}
          </button>
          <Link href={`/${locale}/account`} className={button}>
            {text("Minha conta", "My account")}
          </Link>
        </div>
      </header>
      {message && (
        <p
          role="status"
          className="rounded-xl border border-primary/40 bg-primary/5 p-4"
        >
          {message}
        </p>
      )}
      <section className={`${box} border-primary/30`}>
        <div className="flex flex-wrap justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              {access.allowed ? (
                <ShieldCheck size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}{" "}
              {access.allowed
                ? text("Acesso liberado", "Access enabled")
                : text(
                    "Acesso bloqueado até regularização",
                    "Access blocked until payment",
                  )}
            </span>
            <h2 className="mt-4 text-2xl font-semibold">
              {sub?.plan
                ? en
                  ? sub.plan.name_en
                  : sub.plan.name_pt
                : text(
                    "Seu próximo período começa aqui",
                    "Your next period starts here",
                  )}
            </h2>
            <p className="mt-2 max-w-2xl text-text-secondary">
              {prepaid
                ? text(
                    "PIX é um pagamento único. Seu acesso termina no vencimento abaixo, sem cobrança automática e sem dias extras.",
                    "PIX is a one-off payment. Access ends on the date below, without automatic renewal or extra days.",
                  )
                : recurring
                  ? text(
                      "O cartão mantém uma assinatura recorrente. A renovação depende da aprovação da cobrança pelo banco.",
                      "Card payments maintain a recurring subscription. Renewal depends on payment approval by your bank.",
                    )
                  : text(
                      "Escolha PIX para um período avulso ou cartão para uma assinatura recorrente.",
                      "Choose PIX for one period or card for a recurring subscription.",
                    )}
            </p>
          </div>
          <div className="min-w-[180px]">
            <p className="text-sm text-text-secondary">
              {text("Situação do acesso", "Access status")}
            </p>
            <strong>{label(access.status)}</strong>
            <p className="mt-3 text-sm text-text-secondary">
              {prepaid
                ? text("Acesso pago até", "Paid access until")
                : text("Fim do período atual", "Current period ends")}
            </p>
            <strong className="text-sm">{date(sub?.current_period_end)}</strong>
            {sub?.cancel_at_period_end && (
              <p className="mt-2 text-sm text-primary">
                {text("Renovação desativada", "Renewal disabled")}
              </p>
            )}
          </div>
        </div>
        {sub && (
          <dl className="mt-5 grid gap-3 sm:grid-cols-3 border-t border-border pt-4">
            <div>
              <dt className="text-xs text-text-secondary">
                {text("Valor base do ciclo", "Base cycle price")}
              </dt>
              <dd className="mt-1 font-semibold">
                {money(sub.unit_amount_cents, sub.currency || "BRL")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary">
                {text("Período contratado", "Billing cycle")}
              </dt>
              <dd className="mt-1 font-semibold">
                {sub.billing_cycle_days === 30
                  ? text("Mensal", "Monthly")
                  : sub.billing_cycle_days === 365
                    ? text("Anual", "Yearly")
                    : `${sub.billing_cycle_days} ${text("dias", "days")}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary">
                {text("Renovação", "Renewal")}
              </dt>
              <dd className="mt-1 font-semibold">
                {prepaid
                  ? text("Novo pagamento necessário", "New payment required")
                  : sub.cancel_at_period_end
                    ? text("Desativada", "Disabled")
                    : recurring
                      ? text("Automática no cartão", "Automatic card charge")
                      : text(
                          "Consulte as condições do plano",
                          "Check plan conditions",
                        )}
              </dd>
            </div>
          </dl>
        )}
        <div className="mt-5 flex flex-wrap gap-3 print:hidden">
          {!access.allowed &&
            !openOperations.length &&
            (!recurring ||
              sub?.status === "canceled" ||
              sub?.status === "expired") && (
              <Link
                className={`${button} bg-primary text-primary-foreground`}
                href={`/${locale}/assinatura/checkout`}
              >
                {text("Renovar ou assinar", "Renew or subscribe")}
                <ArrowRight size={16} />
              </Link>
            )}
          {access.allowed && (
            <Link className={button} href={`/${locale}/dashboard`}>
              {text("Ir ao painel", "Go to dashboard")}
            </Link>
          )}
          {recurring && (
            <button
              className={button}
              disabled={!!busy}
              onClick={() =>
                void run("portal", async () => {
                  const result = await post(
                    "/api/payments/stripe/update-payment-method",
                    { return_path: `/${locale}/assinatura` },
                  );
                  window.location.assign(result.url);
                })
              }
            >
              <CreditCard size={16} />
              {text("Gerenciar cartão e faturas", "Manage card and invoices")}
            </button>
          )}
          {recurring &&
            sub &&
            !sub.cancel_at_period_end &&
            sub.status !== "canceled" && (
              <button
                className={button}
                disabled={!!busy}
                onClick={() => setConfirm({ kind: "cancel", id: sub.id })}
              >
                {text("Cancelar renovação", "Cancel renewal")}
              </button>
            )}
          {recurring &&
            sub?.cancel_at_period_end &&
            sub.status !== "canceled" && (
              <button
                className={button}
                disabled={!!busy}
                onClick={() =>
                  void run("reactivate", async () => {
                    await post("/api/payments/stripe/reactivate", {
                      subscription_id: sub.id,
                    });
                    setMessage(
                      text(
                        "Renovação reativada. Consulte as datas atualizadas.",
                        "Renewal reactivated. Check the updated dates.",
                      ),
                    );
                  })
                }
              >
                {text("Reativar renovação", "Reactivate renewal")}
              </button>
            )}
        </div>
      </section>
      {!!openOperations.length && (
        <section className={`${box} space-y-4`}>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock size={20} />
            {text("Contratação em andamento", "Checkout in progress")}
          </h2>
          <p className="text-sm text-text-secondary">
            {text(
              "Conclua a tentativa existente para evitar cobranças duplicadas. Para trocar a forma de pagamento, encerre primeiro a tentativa pendente. Isso não solicita estorno de valores pagos.",
              "Complete the existing attempt to avoid duplicate charges. To change payment method, close the pending attempt first. This does not request a refund of paid amounts.",
            )}
          </p>
          {openOperations.map((op: any) => (
            <div
              key={op.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4"
            >
              <div>
                <strong>
                  {op.provider === "asaas" ? "PIX" : "Cartão / Card"} ·{" "}
                  {money(op.amount_cents, op.currency)}
                </strong>
                <p className="text-sm text-text-secondary">
                  {op.state === "creating"
                    ? text(
                        "Preparando ou verificando a criação. Se houver falha, aguarde 15 minutos antes de retomar.",
                        "Preparing or checking creation. After a failure, wait 15 minutes before resuming.",
                      )
                    : text(
                        "Tentativa pronta; aguardando conclusão.",
                        "Attempt ready; awaiting completion.",
                      )}
                </p>
                <p className="text-xs text-text-secondary">
                  {text("Criada em", "Created")} {date(op.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  disabled={!!busy}
                  className={button}
                  onClick={() =>
                    void run(op.id, async () => {
                      const result = await post(
                        "/api/payments/pending/resume",
                        { operation_id: op.id, locale },
                      );
                      window.location.assign(result.url);
                    })
                  }
                >
                  {text("Retomar pagamento", "Resume payment")}
                </button>
                <button
                  disabled={!!busy || !op.remote_id}
                  className={button}
                  onClick={() => setConfirm({ kind: "pending", id: op.id })}
                >
                  {text("Encerrar tentativa", "Close attempt")}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          [
            QrCode,
            text("PIX avulso", "One-off PIX"),
            text(
              "Pague o valor integral pelo QR Code ou copia e cola. Não é uma assinatura automática. Novo período só é liberado após confirmação.",
              "Pay the full amount using the QR or payment code. This is not automatic billing. A new period is enabled only after confirmation.",
            ),
          ],
          [
            CreditCard,
            text("Cartão recorrente", "Recurring card"),
            text(
              "O valor é cobrado a cada ciclo contratado. Seu banco pode pedir autenticação. Cancelar a renovação evita novos ciclos; não estorna o período já pago.",
              "The amount is charged each billing cycle. Your bank may require authentication. Canceling renewal stops future cycles; it does not refund the paid period.",
            ),
          ],
          [
            ShieldCheck,
            text("Vencimento e bloqueio", "Expiry and access"),
            text(
              "PIX vencido bloqueia o painel imediatamente. PIX pendente, cartão recusado ou confirmação em análise não significam pagamento aprovado.",
              "Expired PIX access is blocked immediately. Pending PIX, a declined card or a payment under review do not mean payment was approved.",
            ),
          ],
        ].map(([Icon, title, body]: any) => (
          <article className={box} key={title}>
            <Icon size={22} className="text-primary" />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {body}
            </p>
          </article>
        ))}
      </section>
      <section className={`${box} space-y-5`}>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              {text("Histórico de pagamentos", "Payment history")}
            </h2>
            <p className="text-sm text-text-secondary">
              {text(
                "Valores pagos, pendências e estornos. Cada cobrança tem seus próprios detalhes.",
                "Paid amounts, pending payments and refunds. Each charge has its own details.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <a
              className={button}
              href={`/api/payments/history/export?status=${payments.status}`}
            >
              <Download size={16} />
              CSV
            </a>
            <a
              className={button}
              href={`/api/payments/history/export?status=${payments.status}&format=xlsx`}
            >
              <Download size={16} />
              Excel
            </a>
            <button className={button} onClick={() => window.print()}>
              <Printer size={16} />
              {text("Imprimir / salvar PDF", "Print / save PDF")}
            </button>
          </div>
        </div>
        <p className="text-xs text-text-secondary">
          {text(
            "Exportações incluem os registros do filtro. A impressão contém a página atual do histórico. Valores estornados são apresentados separadamente. Datas no horário de São Paulo. As planilhas apresentam os valores na unidade da moeda indicada.",
            "Exports include records matching the filter. Printing includes the current history page. Refunded amounts are shown separately. Dates use São Paulo time. Spreadsheets show amounts in the specified currency unit.",
          )}
        </p>
        <label className="flex items-center gap-3 text-sm print:hidden">
          {text("Filtrar por situação", "Filter by status")}
          <select
            className="rounded-lg border border-border bg-background p-2"
            value={payments.status}
            onChange={(e) =>
              router.push(`/${locale}/assinatura?status=${e.target.value}`)
            }
          >
            {[
              "all",
              "paid",
              "pending",
              "processing",
              "failed",
              "expired",
              "canceled",
              "refunded",
              "partially_refunded",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? text("Todos", "All") : label(s)}
              </option>
            ))}
          </select>
        </label>
        {!payments.rows.length ? (
          <p className="py-8 text-text-secondary">
            {text(
              "Nenhum pagamento encontrado neste filtro.",
              "No payments found for this filter.",
            )}
          </p>
        ) : (
          <div className="space-y-3">
            {payments.rows.map((p: any) => (
              <article
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="font-semibold">
                    {en
                      ? p.description_en || "Payment"
                      : p.description_pt || "Pagamento"}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {date(p.paid_at || p.created_at)} · {label(p.method)}
                  </p>
                  <p className="mt-2 text-sm text-primary">{label(p.status)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <strong>{money(p.amount_cents, p.currency)}</strong>
                    {p.refunded_amount_cents > 0 && (
                      <p className="text-xs text-text-secondary">
                        {text("Estornado: ", "Refunded: ")}
                        {money(p.refunded_amount_cents, p.currency)}
                      </p>
                    )}
                  </div>
                  <button
                    className={`${button} print:hidden`}
                    onClick={() => {
                      setSelected(p);
                      setMessage("");
                    }}
                  >
                    {text("Detalhes", "Details")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            {text("Total de registros", "Total records")}: {payments.total} ·{" "}
            {text("Página", "Page")} {payments.page}
          </span>
          <div className="flex gap-2 print:hidden">
            <button
              className={button}
              disabled={payments.page <= 1}
              onClick={() =>
                router.push(
                  `/${locale}/assinatura?status=${payments.status}&page=${payments.page - 1}`,
                )
              }
            >
              {text("Anterior", "Previous")}
            </button>
            <button
              className={button}
              disabled={payments.page * payments.size >= payments.total}
              onClick={() =>
                router.push(
                  `/${locale}/assinatura?status=${payments.status}&page=${payments.page + 1}`,
                )
              }
            >
              {text("Próxima", "Next")}
            </button>
          </div>
        </div>
      </section>
      <section className={`${box} space-y-3`}>
        <h2 className="text-xl font-semibold">
          {text("Entenda seu pagamento", "Understand your payment")}
        </h2>
        {[
          [
            text(
              "Paguei, mas o acesso ainda está bloqueado. O que faço?",
              "I paid but access is still blocked. What now?",
            ),
            text(
              "Abra os detalhes da cobrança PIX e use Verificar pagamento. No cartão, conclua a autenticação do banco. Não pague novamente sem conferir a tentativa existente. Se persistir, informe o identificador da cobrança ao atendimento.",
              "Open the PIX charge details and choose Check payment. For cards, complete bank authentication. Do not pay again before checking the existing attempt. If it persists, give support the charge identifier.",
            ),
          ],
          [
            text(
              "Posso trocar de PIX para cartão?",
              "Can I change from PIX to card?",
            ),
            text(
              "Depois de vencer o período PIX, escolha cartão no checkout. Se houver uma tentativa pendente, encerre-a antes. O período já pago permanece válido até o vencimento; não fazemos cobrança paralela durante esse período.",
              "After your PIX period expires, choose card at checkout. Close any pending attempt first. Paid access remains valid until expiry; no parallel subscription is created during that period.",
            ),
          ],
          [
            text(
              "O histórico é uma nota fiscal?",
              "Is this history a tax invoice?",
            ),
            text(
              "Não. Esta é uma consulta dos registros de pagamento da sua conta. Imprimir ou salvar em PDF não emite nota fiscal. Estornos aparecem com o valor confirmado pelo provedor.",
              "No. This shows your account payment records. Printing or saving a PDF does not issue a tax invoice. Refunds show the amount confirmed by the provider.",
            ),
          ],
        ].map(([q, a]) => (
          <details key={q} className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer font-medium">{q}</summary>
            <p className="mt-3 text-sm text-text-secondary leading-relaxed">
              {a}
            </p>
          </details>
        ))}
      </section>
      {selected && (
        <Modal isOpen onClose={() => setSelected(null)} className="max-w-xl">
          <ModalHeader>
            <ModalTitle>
              {text("Detalhes do pagamento", "Payment details")}
            </ModalTitle>
            <ModalClose onClick={() => setSelected(null)} />
          </ModalHeader>
          <ModalBody className="space-y-4">
            <p className="text-2xl font-bold">
              {money(selected.amount_cents, selected.currency)}
            </p>
            <p>
              {label(selected.status)} · {label(selected.method)}
            </p>
            <dl className="space-y-2 text-sm">
              {[
                [
                  text("Identificador", "Identifier"),
                  selected.external_id || selected.id,
                ],
                [text("Criado em", "Created"), date(selected.created_at)],
                [
                  text("Pagamento confirmado", "Payment confirmed"),
                  date(selected.paid_at),
                ],
                [
                  text("Estornado", "Refunded"),
                  money(selected.refunded_amount_cents || 0, selected.currency),
                ],
                [
                  text("Data do estorno", "Refund date"),
                  date(selected.refunded_at),
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-4 border-b border-border py-2"
                >
                  <dt className="text-text-secondary">{k}</dt>
                  <dd className="max-w-[65%] break-all text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {selected.method === "pix" &&
              ["pending", "processing"].includes(selected.status) && (
                <div className="space-y-3">
                  <p className="text-sm">
                    {text("Validade do código PIX: ", "PIX code valid until: ")}
                    {date(selected.pix_expires_at)}
                  </p>
                  {selected.pix_copy_paste &&
                    (!selected.pix_expires_at ||
                      Date.parse(selected.pix_expires_at) > Date.now()) && (
                      <>
                        <textarea
                          aria-label={text(
                            "PIX copia e cola",
                            "PIX payment code",
                          )}
                          readOnly
                          value={selected.pix_copy_paste}
                          className="w-full rounded-xl border border-border bg-background p-3 text-xs"
                          rows={3}
                        />
                        <button
                          className={button}
                          onClick={() =>
                            void run("copy", async () => {
                              await navigator.clipboard.writeText(
                                selected.pix_copy_paste,
                              );
                              setMessage(
                                text("Código PIX copiado.", "PIX code copied."),
                              );
                            })
                          }
                        >
                          <Copy size={16} />
                          {text("Copiar PIX", "Copy PIX")}
                        </button>
                      </>
                    )}
                  <button
                    className={button}
                    disabled={!!busy}
                    onClick={() =>
                      void run(selected.id, () => verify(selected))
                    }
                  >
                    <RefreshCw size={16} />
                    {text("Verificar pagamento", "Check payment")}
                  </button>
                </div>
              )}
            {message && (
              <p role="status" className="text-sm">
                {message}
              </p>
            )}
          </ModalBody>
        </Modal>
      )}
      {confirm && (
        <Modal
          isOpen
          onClose={() => !busy && setConfirm(null)}
          className="max-w-lg"
        >
          <ModalHeader>
            <ModalTitle>
              {text("Confirme a alteração", "Confirm change")}
            </ModalTitle>
            <ModalClose onClick={() => !busy && setConfirm(null)} />
          </ModalHeader>
          <ModalBody>
            <p>
              {confirm.kind === "pending"
                ? text(
                    "A tentativa não paga será encerrada no provedor para que você escolha outra forma de pagamento. Se o pagamento já tiver sido confirmado, atualizaremos a situação e preservaremos o acesso.",
                    "The unpaid attempt will be closed at the provider so you can choose another method. If already confirmed, we will update the status and preserve access.",
                  )
                : text(
                    "A renovação automática será desativada. O período já pago continua até a data informada. Esta operação não solicita estorno.",
                    "Automatic renewal will be disabled. Paid access continues until the stated date. This does not request a refund.",
                  )}
            </p>
            {message && (
              <p role="alert" className="mt-3 text-sm">
                {message}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <button
              className={button}
              disabled={!!busy}
              onClick={() => setConfirm(null)}
            >
              {text("Voltar", "Back")}
            </button>
            <button
              className={`${button} bg-primary text-primary-foreground`}
              disabled={!!busy}
              onClick={() =>
                void run("confirm", async () => {
                  await post(
                    confirm.kind === "pending"
                      ? "/api/payments/pending/cancel"
                      : "/api/payments/stripe/cancel",
                    confirm.kind === "pending"
                      ? { operation_id: confirm.id }
                      : { subscription_id: confirm.id, action: "cancel" },
                  );
                  setConfirm(null);
                  setMessage(
                    text(
                      "Alteração confirmada. Os dados serão atualizados.",
                      "Change confirmed. Data will be refreshed.",
                    ),
                  );
                })
              }
            >
              {busy
                ? text("Processando…", "Processing…")
                : text("Confirmar", "Confirm")}
            </button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
