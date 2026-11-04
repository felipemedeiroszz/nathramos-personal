import Link from "next/link";
import { studentBillingHistory, historyStatuses, BillingHistoryFilterError } from "@/services/StudentBillingHistoryService";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export async function StudentBillingHistoryPanel({ studentId, locale, params }: {
  studentId: string; locale: string; params: Record<string, string | undefined>;
}) {
  const en = locale === "en-US", t = (pt: string, english: string) => en ? english : pt;
  let data: Awaited<ReturnType<typeof studentBillingHistory>>;
  try {
    data = await studentBillingHistory(studentId, params);
  } catch (error) {
    if (!(error instanceof BillingHistoryFilterError)) throw error;
    return <Card id="historico-financeiro" className="scroll-mt-24"><CardHeader><CardTitle>{t("Histórico financeiro", "Payment history")}</CardTitle></CardHeader>
      <CardContent><p role="alert">{t("Confira os filtros e informe um período com a data final igual ou posterior à inicial.", "Check the filters and choose an end date on or after the start date.")}</p>
        <Link className="mt-3 inline-flex text-primary underline" href={`/${locale}/admin/alunos/${studentId}#historico-financeiro`}>{t("Limpar filtros", "Clear filters")}</Link></CardContent></Card>;
  }
  const labels: Record<string, string> = {
    paid: t("Pago", "Paid"), pending: t("Pendente", "Pending"), processing: t("Em processamento", "Processing"),
    failed: t("Falhou", "Failed"), canceled: t("Cancelado", "Canceled"), expired: t("Vencido", "Expired"),
    refunded: t("Estornado", "Refunded"), partially_refunded: t("Estorno parcial", "Partially refunded"),
    cash: t("Dinheiro", "Cash"), pix: "PIX", bank_transfer: t("Transferência", "Bank transfer"), credit_card: t("Cartão", "Card"), boleto: t("Boleto", "Bank slip"),
    manual: "Manual", stripe: "Stripe", asaas: "Asaas",
  };
  const money = (cents: number, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)) : "—";
  const base = `/${locale}/admin/alunos/${studentId}`;
  const pagination = (page: number) => {
    const query = new URLSearchParams();
    const f = data.filters;
    for (const [key, value] of Object.entries({ financePage: String(page), financeStatus: f.status, financeProvider: f.provider, financeType: f.type, financeDate: f.date, financeFrom: f.from, financeTo: f.to })) if (value) query.set(key, value);
    return `${base}?${query}#historico-financeiro`;
  };
  const input = "mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm";
  return <Card id="historico-financeiro" className="scroll-mt-24 min-w-0">
    <CardHeader><CardTitle>{t("Histórico de mensalidades e pagamentos", "Membership and payment history")}</CardTitle>
      <CardDescription>{t("Histórico individual de pagamentos online e manuais, incluindo pendências e estornos. Os lançamentos sem plano vinculado aparecem como avulsos.", "Individual online and manual payment history, including pending payments and refunds. Entries without an assigned plan are shown as one-off payments.")}</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      <form key={JSON.stringify(data.filters)} action={`${base}#historico-financeiro`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm">{t("Situação", "Status")}<select className={input} name="financeStatus" defaultValue={data.filters.status}>
          <option value="all">{t("Todas", "All")}</option>{historyStatuses.map(s => <option key={s} value={s}>{labels[s]}</option>)}
        </select></label>
        <label className="text-sm">{t("Origem", "Source")}<select className={input} name="financeProvider" defaultValue={data.filters.provider}>
          <option value="all">{t("Todas", "All")}</option>{["manual", "stripe", "asaas"].map(p => <option key={p} value={p}>{labels[p]}</option>)}
        </select></label>
        <label className="text-sm">{t("Lançamentos", "Entries")}<select className={input} name="financeType" defaultValue={data.filters.type}>
          <option value="all">{t("Todos, incluindo avulsos", "All, including one-off")}</option><option value="plan">{t("Planos e recebimentos manuais", "Plans and manual receipts")}</option>
        </select></label>
        <label className="text-sm">{t("Filtrar período por", "Filter period by")}<select className={input} name="financeDate" defaultValue={data.filters.date}>
          <option value="created_at">{t("Data do lançamento", "Entry date")}</option><option value="paid_at">{t("Data do pagamento", "Payment date")}</option><option value="due_at">{t("Vencimento da cobrança", "Payment due date")}</option>
        </select></label>
        <label className="text-sm">{t("De", "From")}<input className={input} type="date" name="financeFrom" defaultValue={data.filters.from} /></label>
        <label className="text-sm">{t("Até (inclusive)", "Through (inclusive)")}<input className={input} type="date" name="financeTo" defaultValue={data.filters.to} /></label>
        <div className="flex items-end gap-4 sm:col-span-2"><button className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">{t("Filtrar histórico", "Filter history")}</button>
          <Link className="inline-flex min-h-11 items-center text-sm text-primary underline" href={`${base}#historico-financeiro`}>{t("Limpar", "Clear")}</Link></div>
      </form>
      <p className="text-sm text-text-secondary">{data.total} {t("lançamento(s) encontrado(s)", "entries found")}</p>
      {!data.rows.length ? <p role="status" className="py-6 text-sm text-text-secondary">{t("Nenhum lançamento encontrado para este aluno com os filtros selecionados.", "No entries found for this student with the selected filters.")}</p> :
        <ul className="space-y-3">{data.rows.map(row => <li key={row.id} className="min-w-0 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><p className="break-words font-medium">{(en ? row.description_en : row.description_pt) || t("Pagamento", "Payment")}</p>
              <p className="mt-1 break-words text-xs text-text-secondary">{row.subscription?.plan ? (en ? row.subscription.plan.name_en : row.subscription.plan.name_pt) : t("Avulso / sem plano vinculado", "One-off / no assigned plan")} · {labels[row.provider] || row.provider} · {labels[row.method] || row.method}</p></div>
            <div className="flex flex-wrap items-center gap-3"><strong>{money(row.amount_cents, row.currency)}</strong><Badge variant={row.status === "paid" ? "success" : ["pending", "processing"].includes(row.status) ? "warning" : "outline"}>{labels[row.status] || row.status}</Badge></div>
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            {[[t("Lançamento", "Entry"), date(row.created_at)], [t("Vencimento da cobrança", "Payment due date"), date(row.due_at)], [t("Pago em", "Paid on"), date(row.paid_at)]].map(([name, value]) => <div key={name}><dt className="text-xs text-text-secondary">{name}</dt><dd>{value}</dd></div>)}
          </dl>
          {row.refunded_amount_cents > 0 && <p className="mt-3 text-sm">{t("Estornado", "Refunded")}: {money(row.refunded_amount_cents, row.currency)} · {date(row.refunded_at)}</p>}
          <details className="mt-3 text-xs text-text-secondary"><summary className="cursor-pointer py-1">{t("Referência e observação", "Reference and note")}</summary>
            <p className="mt-2 break-all">{t("Registro", "Record")}: {row.id}</p>{row.external_id && <p className="mt-1 break-all">{t("Referência externa", "External reference")}: {row.external_id}</p>}
            {typeof row.metadata?.notes === "string" && row.metadata.notes && <p className="mt-2 break-words">{row.metadata.notes}</p>}
          </details>
        </li>)}</ul>}
      {data.pages > 1 && <nav aria-label={t("Páginas do histórico financeiro", "Payment history pages")} className="flex items-center justify-between gap-3 text-sm">
        {data.page > 1 ? <Link className="min-h-11 inline-flex items-center text-primary underline" href={pagination(data.page - 1)}>{t("Anterior", "Previous")}</Link> : <span />}
        <span>{data.page} / {data.pages}</span>
        {data.page < data.pages ? <Link className="min-h-11 inline-flex items-center text-primary underline" href={pagination(data.page + 1)}>{t("Próxima", "Next")}</Link> : <span />}
      </nav>}
    </CardContent>
  </Card>;
}
