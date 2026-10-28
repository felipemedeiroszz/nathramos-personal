import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
const { aggregateAdminReport, periodBounds } = loadTs(
  "src/lib/admin/reporting.ts",
);
const now = new Date("2026-10-28T15:00:00Z");
const profiles = [
  {
    id: "a",
    role: "student",
    is_deleted: false,
    full_name: "Aluno",
    created_at: "2026-10-02T12:00:00Z",
  },
  { id: "staff", role: "admin", created_at: "2026-10-01T12:00:00Z" },
  {
    id: "deleted",
    role: "student",
    is_deleted: true,
    created_at: "2026-10-01T12:00:00Z",
  },
];
const plans = [{ id: "plan", name_pt: "Plano", grace_days: 3 }];
const sub = {
  id: "sub",
  user_id: "a",
  plan_id: "plan",
  status: "active",
  currency: "BRL",
  unit_amount_cents: 10000,
  billing_cycle_days: 30,
  created_at: "2026-09-01T12:00:00Z",
  current_period_end: "2026-11-01T12:00:00Z",
};
const payment = (id, currency, amount, paid_at, status = "paid") => ({
  id,
  user_id: "a",
  provider: "stripe",
  currency,
  amount_cents: amount,
  paid_at,
  created_at: paid_at || "2026-10-28T12:00:00Z",
  status,
});
test("relatório separa moedas e exclui receita não aprovada e datas futuras", () => {
  const payments = [
    payment("brl", "BRL", 10000, "2026-10-03T12:00:00Z"),
    payment("usd", "USD", 2000, "2026-10-03T12:00:00Z"),
    payment("failed", "BRL", 9999, null, "failed"),
    payment("future", "BRL", 8000, "2026-11-01T12:00:00Z"),
  ];
  const brl = aggregateAdminReport(
    profiles,
    [sub],
    payments,
    plans,
    "BRL",
    now,
  );
  const usd = aggregateAdminReport(
    profiles,
    [sub],
    payments,
    plans,
    "USD",
    now,
  );
  assert.equal(brl.metric.monthlyRevenue, 10000);
  assert.equal(usd.metric.monthlyRevenue, 2000);
  assert.equal(brl.metric.totalStudents, 1);
  assert.equal(brl.metric.pendingStudents, 0);
  assert.equal(brl.overview.failed_this_month, 1);
  assert.equal(brl.overview.mrr_cents, 10000);
  assert.equal(usd.overview.mrr_cents, 0);
});
test("datas financeiras usam o calendário de São Paulo e limite exclusivo do próximo mês", () => {
  const bounds = periodBounds(now);
  assert.equal(bounds.monthStart, "2026-10-01T03:00:00.000Z");
  assert.equal(bounds.monthEnd, "2026-11-01T03:00:00.000Z");
  const result = aggregateAdminReport(
    profiles,
    [sub],
    [
      payment("previous", "BRL", 3000, "2026-10-01T02:59:59Z"),
      payment("current", "BRL", 2000, "2026-10-01T03:00:00Z"),
    ],
    plans,
    "BRL",
    now,
  );
  assert.equal(result.metric.monthlyRevenue, 2000);
});
test("aluno com assinatura expirada não é contabilizado como ativo nem gera MRR", () => {
  const result = aggregateAdminReport(
    profiles,
    [{ ...sub, current_period_end: "2026-10-01T12:00:00Z" }],
    [],
    plans,
    "BRL",
    now,
  );
  assert.equal(result.metric.activeStudents, 0);
  assert.equal(result.metric.blockedStudents, 1);
  assert.equal(result.overview.mrr_cents, 0);
});

test("MRR não projeta receita de assinaturas com cancelamento agendado", () => {
  const result = aggregateAdminReport(
    profiles,
    [{ ...sub, cancel_at_period_end: true }],
    [],
    plans,
    "BRL",
    now,
  );
  assert.equal(result.overview.mrr_cents, 0);
  assert.equal(result.metric.activeStudents, 1);
});

test('filtro de auditoria inclui o dia final inteiro no fuso de São Paulo',()=>{
 const {applyAuditFilters}=loadTs('src/services/AuditLogService.ts',{'@/lib/supabase/server':{},'@/services/StudentRoutineService':{}})
 const calls=[];const query={gte:(...args)=>{calls.push(['gte',...args]);return query},lt:(...args)=>{calls.push(['lt',...args]);return query}}
 applyAuditFilters(query,{from:'2026-10-01',to:'2026-10-28'})
 assert.deepEqual(calls,[['gte','created_at','2026-10-01T03:00:00.000Z'],['lt','created_at','2026-10-29T03:00:00.000Z']])
})
