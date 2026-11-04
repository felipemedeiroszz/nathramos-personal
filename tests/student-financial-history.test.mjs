import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";

const student = "60000000-0000-4000-8000-000000000001";
const other = "60000000-0000-4000-8000-000000000002";
function environment({ role = "admin", error = false, missing = false, rows: input } = {}) {
  let clients = 0;
  const requests = [];
  const rows = input || [
    ...Array.from({ length: 45 }, (_, i) => ({ id: String(i).padStart(3, "0"), user_id: student, is_duplicate: false, status: "paid", provider: "stripe", subscription_id: "sub", created_at: "2026-10-30T12:00:00Z", paid_at: "2026-10-30T03:00:00Z" })),
    { id: "foreign", user_id: other, is_duplicate: false },
    { id: "duplicate", user_id: student, is_duplicate: true },
  ];
  const db = { from(table) {
    const conditions = [], orders = [];
    let head = false, start = 0, end = Infinity;
    const q = {
      select(columns, options) { head = !!options?.head; requests.push({ table, columns, conditions, orders }); return q; },
      eq(key, value) { conditions.push(r => r[key] === value); return q; },
      gte(key, value) { conditions.push(r => r[key] != null && r[key] >= value); return q; },
      lt(key, value) { conditions.push(r => r[key] != null && r[key] < value); return q; },
      or(value) { assert.equal(value, "subscription_id.not.is.null,provider.eq.manual"); conditions.push(r => r.subscription_id != null || r.provider === "manual"); return q; },
      order(key) { orders.push(key); return q; },
      range(a, b) { start = a; end = b; return q; },
      maybeSingle: async () => ({ data: missing ? null : { id: student, role: "student", is_deleted: false }, error: null }),
      then(resolve, reject) {
        const filtered = rows.filter(r => conditions.every(fn => fn(r))).sort((a, b) => a.id.localeCompare(b.id));
        return Promise.resolve(error ? { error: Error("database unavailable"), data: null } : { error: null, data: head ? null : filtered.slice(start, end + 1), count: filtered.length }).then(resolve, reject);
      },
    };
    return q;
  } };
  const api = loadTs("src/services/StudentBillingHistoryService.ts", {
    "server-only": {},
    "@/lib/auth/access": { requireRole: async roles => { assert.deepEqual(roles, ["admin"]); if (role !== "admin") throw Error("denied"); return { userId: "admin" }; } },
    "@/lib/supabase/server": { createServiceClientSSR: async () => { clients++; return db; } },
  });
  return { ...api, requests, clients: () => clients };
}

test("histórico financeiro pagina todos os lançamentos do aluno e exclui duplicatas e terceiros", async () => {
  const env = environment();
  const first = await env.studentBillingHistory(student);
  const second = await env.studentBillingHistory(student, { financePage: "2", studentId: other });
  const last = await env.studentBillingHistory(student, { financePage: "999" });
  assert.equal(first.total, 45); assert.equal(first.pages, 3); assert.equal(first.rows.length, 20);
  assert.equal(second.rows.length, 20); assert.equal(last.page, 3); assert.equal(last.rows.length, 5);
  const all = [...first.rows, ...second.rows, ...last.rows];
  assert.equal(new Set(all.map(r => r.id)).size, 45);
  assert.ok(all.every(r => r.user_id === student && !r.is_duplicate));
  assert.ok(env.requests.filter(r => r.table === "payments" && r.orders.length).every(r => r.orders.includes("id")));
});

test("aluno, coach e anônimo são negados antes do cliente privilegiado", async () => {
  for (const role of ["student", "coach", null]) {
    const env = environment({ role });
    await assert.rejects(() => env.studentBillingHistory(student), /denied/);
    assert.equal(env.clients(), 0);
  }
});

test("período inclui o último dia inteiro em São Paulo e respeita status, origem e tipo", async () => {
  const rows = [
    { id: "start", paid_at: "2026-10-30T03:00:00Z", provider: "manual", subscription_id: null, status: "paid" },
    { id: "end", paid_at: "2026-10-31T02:59:59Z", provider: "manual", subscription_id: null, status: "paid" },
    { id: "before", paid_at: "2026-10-30T02:59:59Z", provider: "manual", status: "paid" },
    { id: "after", paid_at: "2026-10-31T03:00:00Z", provider: "manual", status: "paid" },
    { id: "wrong-provider", paid_at: "2026-10-30T12:00:00Z", provider: "stripe", status: "paid" },
    { id: "pending", paid_at: "2026-10-30T12:00:00Z", provider: "manual", status: "pending" },
  ].map(r => ({ ...r, user_id: student, is_duplicate: false }));
  const env = environment({ rows });
  const result = await env.studentBillingHistory(student, { financeDate: "paid_at", financeFrom: "2026-10-30", financeTo: "2026-10-30", financeProvider: "manual", financeStatus: "paid", financeType: "plan" });
  assert.deepEqual(result.rows.map(r => r.id), ["end", "start"]);
});

test("falhas de banco e aluno inexistente não aparecem como histórico vazio", async () => {
  await assert.rejects(() => environment({ error: true }).studentBillingHistory(student));
  await assert.rejects(() => environment({ missing: true }).studentBillingHistory(student), /indisponível/);
  const empty = await environment({ rows: [] }).studentBillingHistory(student);
  assert.equal(empty.total, 0); assert.deepEqual(empty.rows, []);
});

test("filtros inválidos são rejeitados antes de consultar o banco", async () => {
  const env = environment();
  for (const filters of [{ financePage: "-1" }, { financeStatus: "forged" }, { financeFrom: "2026-02-30" }, { financeFrom: "2026-11-01", financeTo: "2026-10-01" }, { financeDate: "user_id" }]) {
    await assert.rejects(() => env.studentBillingHistory(student, filters), env.BillingHistoryFilterError);
  }
  assert.equal(env.clients(), 0);
});
