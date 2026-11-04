import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";

const ADMIN = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
let db, plan, today;
before(async () => {
  db = await testDatabase();
  plan = (await db.query("select * from plans where is_active and currency='BRL' limit 1")).rows[0];
  today = (await db.query("select (now() at time zone 'America/Sao_Paulo')::date::text as day")).rows[0].day;
});
after(async () => { if (db) await db.close(); });
async function student() {
  const id = randomUUID();
  await db.query("insert into auth.users(id,email) values($1,$2)", [id, `${id}@example.test`]);
  return id;
}
async function record(id, overrides = {}) {
  const p = { actor: ADMIN, key: randomUUID(), plan: plan.id, expires: today, amount: 15000, currency: "BRL", method: "cash", date: today, notes: "Dinheiro recebido pessoalmente", ...overrides };
  return (await db.query("select admin_record_student_manual($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as result", [p.actor, id, p.key, p.plan, p.expires, p.amount, p.currency, p.method, p.date, p.notes])).rows[0].result;
}

test("plano e dinheiro são gravados juntos, com vencimento inclusivo em São Paulo e receita real", async () => {
  const id = await student();
  const result = await record(id);
  const sub = (await db.query("select *,extract(hour from current_period_end at time zone 'America/Sao_Paulo')::int as local_hour from subscriptions where id=$1", [result.subscription_id])).rows[0];
  assert.equal(sub.source, "admin_manual");
  assert.equal(sub.provider, null);
  assert.equal(sub.cancel_at_period_end, true);
  assert.equal(sub.local_hour, 0);
  const payment = (await db.query("select * from payments where id=$1", [result.payment_id])).rows[0];
  assert.equal(payment.provider, "manual"); assert.equal(payment.method, "cash"); assert.equal(payment.status, "paid");
  assert.equal(payment.amount_cents, 15000); assert.equal(payment.net_amount_cents, 15000);
  assert.equal(payment.external_id, null); assert.equal(payment.user_id, id);
  assert.equal((await db.query("select * from can_access_platform($1)", [id])).rows[0].allowed, true);
  const report = (await db.query("select admin_analytics_report($1,$2,$2,'day','BRL',null,null,'manual') as report", [ADMIN, today])).rows[0].report;
  assert.equal(report.financial.paid_cents, 15000);
  assert.equal(report.financial.mrr_cents, 0);
  assert.ok(report.financial.methods.some(m => m.name === "cash"));
});

test("reenvio não duplica pagamento nem plano e chave alterada é rejeitada", async () => {
  const id = await student(), key = randomUUID();
  const first = await record(id, { key });
  assert.deepEqual(await record(id, { key }), first);
  assert.equal((await db.query("select count(*)::int as n from payments where user_id=$1", [id])).rows[0].n, 1);
  await assert.rejects(() => record(id, { key, amount: 20000 }), /REQUEST_CONFLICT/);
});

test("plano sem pagamento não cria receita; recebimento isolado não libera acesso", async () => {
  const id = await student();
  const grant = await record(id, { amount: null, date: null });
  assert.equal(grant.payment_id, null);
  assert.equal((await db.query("select count(*)::int as n from payments where user_id=$1", [id])).rows[0].n, 0);
  const other = await student();
  const receipt = await record(other, { plan: null, expires: null });
  assert.equal(receipt.subscription_id, null);
  assert.equal((await db.query("select * from can_access_platform($1)", [other])).rows[0].allowed, false);
});

test("vencimento manual bloqueia sem tolerância; renovação preserva pagamentos anteriores", async () => {
  const id = await student(), first = await record(id);
  await db.query("update subscriptions set current_period_end=now() where id=$1", [first.subscription_id]);
  const access = (await db.query("select * from can_access_platform($1)", [id])).rows[0];
  assert.equal(access.allowed, false); assert.equal(access.reason, "manual_period_expired");
  const next = await record(id);
  assert.notEqual(next.subscription_id, first.subscription_id);
  assert.equal((await db.query("select subscription_id from payments where id=$1", [first.payment_id])).rows[0].subscription_id, first.subscription_id);
  assert.equal((await db.query("select status from subscriptions where id=$1", [first.subscription_id])).rows[0].status, "inactive");
});

test("pagamento inválido faz rollback do plano e assinatura de gateway não é substituída", async () => {
  const id = await student();
  await assert.rejects(() => record(id, { method: "invalid" }), /INVALID_PAYMENT/);
  assert.equal((await db.query("select count(*)::int as n from subscriptions where user_id=$1", [id])).rows[0].n, 0);
  await assert.rejects(() => record(id, { expires: "2000-01-01" }), /INVALID_EXPIRY/);
  await assert.rejects(() => record(id, { date: "2099-01-01" }), /INVALID_PAYMENT/);
  await assert.rejects(() => record(id, { currency: "USD" }), /CURRENCY_MISMATCH/);
  await db.query("insert into subscriptions(user_id,plan_id,provider,external_id,status,unit_amount_cents) values($1,$2,'stripe','sub_test','active',10000)", [id, plan.id]);
  await assert.rejects(() => record(id), /EXTERNAL_SUBSCRIPTION_EXISTS/);
  assert.equal((await db.query("select count(*)::int as n from payments where user_id=$1", [id])).rows[0].n, 0);
  // A receipt alone can still be recorded without changing the remote subscription.
  await record(id, { plan: null, expires: null });
  assert.equal((await db.query("select provider from subscriptions where user_id=$1", [id])).rows[0].provider, "stripe");
});

test("coach/aluno não podem registrar; RPC não é executável diretamente com authenticated", async () => {
  const id = await student();
  await assert.rejects(() => record(id, { actor: id }), /ADMIN_REQUIRED/);
  const coach = await student();
  await db.query("update profiles set role='coach' where id=$1", [coach]);
  await assert.rejects(() => record(id, { actor: coach }), /ADMIN_REQUIRED/);
  const permission = (await db.query("select has_function_privilege('authenticated','public.admin_record_student_manual(uuid,uuid,uuid,uuid,date,integer,text,text,date,text)','execute') as allowed")).rows[0];
  assert.equal(permission.allowed, false);
  await assert.rejects(() => record(ADMIN), /STUDENT_NOT_FOUND/);
});

test("PIX vencido permite renovação manual e cobrança recorrente bloqueada exige resolver o provedor", async () => {
  const id = await student();
  await db.query("insert into subscriptions(user_id,plan_id,provider,external_id,source,status,unit_amount_cents,current_period_end) values($1,$2,'asaas','pay_expired','asaas_pix','active',10000,now())", [id, plan.id]);
  await record(id);
  assert.equal((await db.query("select * from can_access_platform($1)", [id])).rows[0].allowed, true);
  const other = await student();
  await db.query("insert into subscriptions(user_id,plan_id,provider,external_id,status,unit_amount_cents) values($1,$2,'stripe','sub_blocked','blocked',10000)", [other, plan.id]);
  await assert.rejects(() => record(other), /EXTERNAL_SUBSCRIPTION_EXISTS/);
  const recurringAsaas = await student();
  await db.query("insert into subscriptions(user_id,plan_id,provider,external_id,status,unit_amount_cents,current_period_end) values($1,$2,'asaas','recurring_asaas','blocked',10000,now())", [recurringAsaas, plan.id]);
  await assert.rejects(() => record(recurringAsaas), /EXTERNAL_SUBSCRIPTION_EXISTS/);
});

test("falha após pagamento desfaz assinatura, receita e operação idempotente na mesma transação", async () => {
  const id = await student();
  await db.exec(`create function test_manual_audit_failure() returns trigger language plpgsql as $$begin if new.action='student.manual_billing' then raise exception 'AUDIT_FAILED';end if;return new;end$$;
    create trigger test_manual_audit_failure before insert on audit_logs for each row execute function test_manual_audit_failure();`);
  try {
    await assert.rejects(() => record(id), /AUDIT_FAILED/);
    for (const table of ["payments", "subscriptions"]) assert.equal((await db.query(`select count(*)::int as n from ${table} where user_id=$1`, [id])).rows[0].n, 0);
    assert.equal((await db.query("select count(*)::int as n from admin_manual_operations where student_id=$1", [id])).rows[0].n, 0);
  } finally { await db.exec("drop trigger test_manual_audit_failure on audit_logs;drop function test_manual_audit_failure()"); }
});

test("server action deriva administrador da sessão, converte valor e não confia em ator enviado", async () => {
  const calls = [], paths = [];
  const mocks = {
    "@/lib/auth/access": { requireRole: async roles => { assert.deepEqual(roles, ["admin"]); return { userId: ADMIN }; } },
    "@/lib/supabase/server": { createServiceClientSSR: async () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { error: null }; } }) },
    "next/cache": { revalidatePath: p => paths.push(p) },
  };
  const { recordStudentManualAction } = loadTs("src/app/actions/manualBilling.ts", mocks);
  const form = new FormData();
  for (const [key, value] of Object.entries({ studentId: randomUUID(), requestKey: randomUUID(), operation: "payment", amount: "150,01", paidDate: today, method: "cash", currency: "BRL", locale: "pt-BR", actor: "forged" })) form.set(key, value);
  assert.equal((await recordStudentManualAction(null, form)).success, true);
  assert.equal(calls[0].args.p_actor, ADMIN);
  assert.equal(calls[0].args.p_amount, 15001);
  assert.equal(calls[0].args.p_plan, null);
  assert.ok(paths.includes("/[locale]/(student)"));
  const denied = loadTs("src/app/actions/manualBilling.ts", { ...mocks, "@/lib/auth/access": { requireRole: async () => { throw new Error("denied"); } } });
  await assert.rejects(() => denied.recordStudentManualAction(null, form), /denied/);
  assert.equal(calls.length, 1);
});

test("valores monetários são convertidos sem ponto flutuante e rejeitam formatos ambíguos", () => {
  const { moneyToCents } = loadTs("src/schemas/manualBilling.ts");
  assert.equal(moneyToCents("150,01"), 15001);
  assert.equal(moneyToCents("0.29"), 29);
  for (const value of ["-1", "1.000,00", "1e3", "12.345", "NaN"]) assert.ok(Number.isNaN(moneyToCents(value)));
});
