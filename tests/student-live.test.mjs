import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
const { createLiveQuery } = loadTs("src/lib/live/query.ts");
const { isStudentPanelPath } = loadTs("src/lib/live/events.ts");
const { mergeWorkoutSets } = loadTs("src/lib/live/workout.ts");
const flush = () => new Promise((resolve) => setImmediate(resolve));
test("todas as rotas do aluno têm atualização durante edição; checkout e admin mantêm proteção", () => {
  for (const locale of ["pt-BR", "en-US"])
    for (const route of [
      "dashboard",
      "treino",
      "dieta",
      "suplementos",
      "hidratacao",
      "progresso",
      "lista-compras",
      "conversas",
      "reunioes",
      "exames",
      "ebooks",
      "mais",
      "account",
      "assinatura",
    ])
      assert.equal(isStudentPanelPath(`/${locale}/${route}`), true);
  for (const route of [
    "/pt-BR/admin/alunos",
    "/en-US/assinatura/checkout",
    "/pt-BR/login",
    "/pt-BR/sobre",
  ])
    assert.equal(isStudentPanelPath(route), false);
});
test("consultas lentas são serializadas, eventos agrupados e resultados antigos descartados", async () => {
  const pending = [],
    seen = [],
    errors = [];
  const query = createLiveQuery({
    load: (signal) =>
      new Promise((resolve, reject) =>
        pending.push({ resolve, reject, signal }),
      ),
    success: (v) => seen.push(v),
    failure: (e) => errors.push(e),
  });
  query.request();
  for (let n = 0; n < 20; n++) query.request();
  assert.equal(pending.length, 1);
  pending[0].resolve("antigo");
  await flush();
  assert.deepEqual(seen, []);
  assert.equal(pending.length, 2);
  pending[1].resolve("novo");
  await flush();
  assert.deepEqual(seen, ["novo"]);
  assert.deepEqual(errors, []);
  query.destroy();
  query.request();
  assert.equal(pending.length, 2);
});
test("falha temporária não apaga o último dado, reconexão recupera e desmontagem aborta", async () => {
  let fail = false,
    signal,
    last = null,
    errors = 0;
  const query = createLiveQuery({
    load: async (current) => {
      signal = current;
      if (fail) throw Error("offline");
      return "atual";
    },
    success: (v) => (last = v),
    failure: () => errors++,
  });
  query.request();
  await flush();
  assert.equal(last, "atual");
  fail = true;
  query.request();
  await flush();
  assert.equal(last, "atual");
  assert.equal(errors, 1);
  fail = false;
  query.request();
  await flush();
  assert.equal(errors, 1);
  query.destroy();
  assert.equal(signal.aborted, true);
  let complete;
  const abandoned = [];
  const stopped = createLiveQuery({
    load: () => new Promise((resolve) => (complete = resolve)),
    success: (v) => abandoned.push(v),
    failure: () => {},
  });
  stopped.request();
  stopped.destroy();
  complete("tarde");
  await flush();
  assert.deepEqual(abandoned, []);
});
test("novas prescrições atualizam séries limpas e mantêm somente os campos digitados", () => {
  const before = {
    ex: [{ reps_done: "", weight_kg: "20", logged: false, logKey: "ex:1" }],
  };
  const remote = {
    ex: [
      { reps_done: "", weight_kg: "25", logged: false, logKey: "ex:1" },
      { reps_done: "", weight_kg: "25", logged: false, logKey: "ex:2" },
    ],
  };
  assert.equal(mergeWorkoutSets(before, before, remote).ex[0].weight_kg, "25");
  const edited = { ex: [{ ...before.ex[0], reps_done: "12" }] };
  assert.equal(mergeWorkoutSets(edited, before, remote).ex[0].reps_done, "12");
  assert.equal(mergeWorkoutSets(edited, before, remote).ex[0].weight_kg, "25");
  const logged = { ex: [{ ...remote.ex[0], reps_done: "10", logged: true }] };
  assert.equal(mergeWorkoutSets(edited, before, logged).ex[0].reps_done, "10");
  assert.equal(mergeWorkoutSets(edited, before, {}).ex, undefined);
});
