import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";

function setup({ denied = false, duplicate = false, profileFails = false, cleanupFails = false } = {}) {
  const calls = [], audits = [], refreshed = [];
  const db = {
    auth: { admin: {
      createUser: async input => { calls.push(["create", input]); return duplicate ? { error: { code: "email_exists" }, data: {} } : { error: null, data: { user: { id: "new-student" } } }; },
      deleteUser: async id => { calls.push(["delete", id]); return { error: cleanupFails ? new Error("cleanup") : null }; },
    } },
    from(table) {
      const q = {
        update(input) { calls.push(["update", table, input]); return q; },
        eq(key, value) { calls.push(["eq", key, value]); return q; },
        select() { return q; },
        single: async () => profileFails ? { data: null, error: new Error("profile") } : { data: { id: "new-student" }, error: null },
      };
      return q;
    },
  };
  const { createStudentAction } = loadTs("src/app/actions/students.ts", {
    "@/lib/auth/access": { requireRole: async allowed => { assert.deepEqual(allowed, ["admin"]); if (denied) throw new Error("denied"); return { userId: "admin" }; } },
    "@/lib/supabase/server": { createServiceClientSSR: async () => { calls.push(["client"]); return db; } },
    "@/services/AuditLogService": { AuditLogService: { log: async data => { audits.push(data); return true; } } },
    "next/cache": { revalidatePath: path => refreshed.push(path) },
  });
  const form = (changes = {}) => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ name: "Aluno Teste", email: "STUDENT@example.com", password: "unique-student-password", confirmPassword: "unique-student-password", locale: "pt-BR", ...changes })) data.set(key, value);
    return data;
  };
  return { run: changes => createStudentAction(null, form(changes)), calls, audits, refreshed };
}

test("somente admin cria aluno; validação não chega ao Auth", async () => {
  const denied = setup({ denied: true });
  await assert.rejects(() => denied.run(), /denied/);
  assert.equal(denied.calls.length, 0);
  for (const values of [{ password: "short" }, { confirmPassword: "different" }, { email: "invalid" }, { name: " " }]) {
    const env = setup();
    assert.equal((await env.run(values)).success, false);
    assert.equal(env.calls.length, 0);
  }
});

test("cadastro cria Auth e perfil aluno fixo, audita sem senha e atualiza listagem", async () => {
  const env = setup();
  const result = await env.run({ role: "admin" });
  assert.equal(result.success, true);
  const auth = env.calls.find(c => c[0] === "create")[1];
  assert.equal(auth.email, "student@example.com");
  assert.equal(auth.email_confirm, true);
  assert.equal(auth.user_metadata.role, undefined);
  assert.equal(env.calls.find(c => c[0] === "update")[2].role, "student");
  assert.ok(env.calls.some(c => c[0] === "eq" && c[1] === "id" && c[2] === "new-student"));
  assert.equal(env.audits[0].action, "student.create");
  assert.equal(JSON.stringify([result, env.audits]).includes(auth.password), false);
  assert.ok(env.refreshed.includes("/[locale]/admin/alunos"));
});

test("e-mail duplicado não altera nem remove conta existente", async () => {
  const env = setup({ duplicate: true });
  assert.equal((await env.run()).success, false);
  assert.equal(env.calls.some(c => ["delete", "update"].includes(c[0])), false);
  assert.equal(env.audits.length, 0);
});

test("falha no perfil compensa apenas o novo usuário; falha na compensação informa revisão", async () => {
  const env = setup({ profileFails: true });
  assert.equal((await env.run()).success, false);
  assert.deepEqual(env.calls.find(c => c[0] === "delete"), ["delete", "new-student"]);
  assert.equal(env.audits.length, 0);
  const incomplete = setup({ profileFails: true, cleanupFails: true });
  const result = await incomplete.run();
  assert.equal(result.success, false);
  assert.match(result.message, /revisada/);
});
