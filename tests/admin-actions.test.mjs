import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
const actor = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
  student = "00000000-0000-4000-8000-000000000001";
function resetEnvironment(role = "student") {
  const calls = [],
    audits = [];
  const db = {
    from() {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        maybeSingle: async () => ({
          data: { role, is_deleted: false },
          error: null,
        }),
      };
      return q;
    },
    auth: {
      admin: {
        updateUserById: async (id, input) => {
          calls.push({ id, input });
          return { error: null };
        },
      },
    },
  };
  const module = loadTs("src/app/actions/admin.ts", {
    "@/lib/supabase/server": { createServiceClientSSR: async () => db },
    "@/lib/auth/access": { requireRole: async () => ({ userId: actor }) },
    "@/services/AuditLogService": {
      AuditLogService: {
        log: async (data) => {
          audits.push(data);
          return true;
        },
      },
    },
    "next/cache": { revalidatePath() {} },
  });
  function form(password = "unique-test-password", confirm = password) {
    const data = new FormData();
    data.set("studentId", student);
    data.set("newPassword", password);
    data.set("confirmPassword", confirm);
    return data;
  }
  return { module, calls, audits, form };
}
test("redefinição administrativa não altera contas de equipe e não aceita senha padrão vazia", async () => {
  const staff = resetEnvironment("admin");
  assert.equal(
    (await staff.module.resetStudentPasswordAction(null, staff.form())).success,
    false,
  );
  assert.equal(staff.calls.length, 0);
  const valid = resetEnvironment();
  assert.equal(
    (await valid.module.resetStudentPasswordAction(null, valid.form("", "")))
      .success,
    false,
  );
  assert.equal(
    (
      await valid.module.resetStudentPasswordAction(
        null,
        valid.form("unique-test-password", "different"),
      )
    ).success,
    false,
  );
  assert.equal(valid.calls.length, 0);
});
test("senha exclusiva de aluno é alterada e auditada sem incluir o segredo", async () => {
  const env = resetEnvironment();
  const result = await env.module.resetStudentPasswordAction(null, env.form());
  assert.equal(result.success, true);
  assert.equal(env.calls.length, 1);
  assert.equal(env.audits[0].adminId, actor);
  assert.equal(
    JSON.stringify(env.audits).includes("unique-test-password"),
    false,
  );
});
function billingEnvironment(provider = "stripe") {
  const calls = [];
  const state = { status: "active", fail: false };
  const row = {
    id: student,
    provider,
    external_id: provider ? "remote" : null,
    status: "active",
    current_period_end: "2099-01-01T00:00:00Z",
  };
  const db = {
    from() {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        single: async () => ({ data: row, error: null }),
      };
      return q;
    },
  };
  const stripe = {
    cancelSubscription: async () => {
      calls.push("remote-cancel");
      if (state.fail) throw Error("Remote failed");
    },
    cancelSubscriptionImmediately: async () => {
      calls.push("remote-immediate");
    },
    reactivateSubscription: async () => {
      calls.push("remote-reactivate");
    },
    getSubscription: async () => {
      calls.push("remote-read");
      return {
        status: state.status,
        current_period_start: 1700000000,
        current_period_end: 1900000000,
        cancel_at_period_end: true,
      };
    },
  };
  const { AdminSubscriptionService } = loadTs(
    "src/services/AdminSubscriptionService.ts",
    {
      "server-only": {},
      "@/lib/supabase/server": { createServiceClientSSR: async () => db },
      "./SubscriptionService": {
        SubscriptionService: {
          updateStatus: async () => {
            calls.push("local-write");
            return row;
          },
          cancel: async () => {
            calls.push("local-cancel");
            return row;
          },
        },
      },
      "@/lib/payments/stripe": { StripeProvider: stripe },
      "@/lib/payments/sync": {syncStripeSubscription:async()=>{await stripe.getSubscription();calls.push("local-write");}},
    },
  );
  return { service: AdminSubscriptionService, calls, state };
}
test("cancelamento Stripe é confirmado no provedor antes da gravação local", async () => {
  const env = billingEnvironment();
  await env.service.cancel(student, true);
  assert.deepEqual(env.calls, ["remote-cancel", "remote-read", "local-write"]);
  const failure = billingEnvironment();
  failure.state.fail = true;
  await assert.rejects(failure.service.cancel(student, true), /Remote failed/);
  assert.equal(failure.calls.includes("local-write"), false);
});
test("operação não suportada ou assinatura encerrada não produz sucesso local falso", async () => {
  const asaas = billingEnvironment("asaas");
  await assert.rejects(asaas.service.cancel(student, true), /indisponível/);
  assert.equal(asaas.calls.length, 0);
  const ended = billingEnvironment();
  ended.state.status = "canceled";
  await assert.rejects(ended.service.reactivate(student), /nova contratação/);
  assert.equal(ended.calls.includes("local-write"), false);
  const manual = billingEnvironment();
  await assert.rejects(
    manual.service.updateStatus(student, "active"),
    /sincronizado/,
  );
});
