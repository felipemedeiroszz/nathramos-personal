import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
import { testDatabase } from "./database.mjs";
const { createRefreshScheduler } = loadTs("src/lib/live/refresh.ts");

test("rascunho recebe mudanças quando limpo e preserva edição e resposta salva", () => {
  const slots = []; let cursor = 0, effects = [];
  const { useLiveDraft } = loadTs("src/hooks/useLiveDraft.ts", { react: {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useEffect(fn) { effects.push(fn); },
  } });
  const render = source => { cursor = 0; effects = []; const result = useLiveDraft(source); effects.forEach(fn => fn()); return result; };
  render({ name: "A" }); render({ name: "B" });
  let state = render({ name: "B" }); assert.equal(state.draft.name, "B");
  state.setDraft({ name: "rascunho" }); render({ name: "C" });
  state = render({ name: "C" }); assert.equal(state.draft.name, "rascunho"); assert.equal(state.dirty, true);
  state.accept({ name: "salvo" }); state = render({ name: "C" });
  assert.equal(state.draft.name, "salvo"); assert.equal(state.dirty, false);
  render({ name: "salvo" }); state = render({ name: "salvo" }); assert.equal(state.draft.name, "salvo");
  state.setDraft({name:"texto digitado após enviar"});
  state.markSaved({name:"versão enviada"});
  state=render({name:"salvo"});
  assert.equal(state.draft.name,"texto digitado após enviar");assert.equal(state.dirty,true);

});

test("eventos são agrupados, alterações bloqueadas ficam pendentes e limpeza cancela timers", () => {
  let time = 0, nextId = 0, refreshed = 0, blocked = false;
  const timers = new Map();
  const scheduler = createRefreshScheduler({ refresh: () => refreshed++, blocked: () => blocked, now: () => time,
    setTimer: (fn, ms) => { const id = ++nextId; timers.set(id, { fn, at: time + ms }); return id; }, clearTimer: id => timers.delete(id) });
  const advance = amount => {
    const end = time + amount;
    for (;;) {
      const candidate = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!candidate) break;
      time = candidate[1].at; timers.delete(candidate[0]); candidate[1].fn();
    }
    time = end;
  };
  for (let i = 0; i < 30; i++) scheduler.request();
  advance(200); assert.equal(refreshed, 1);
  scheduler.request(); advance(200); assert.equal(refreshed, 1);
  advance(800); assert.equal(refreshed, 2);
  blocked = true; scheduler.request(); advance(5000); assert.equal(refreshed, 2);
  blocked = false; scheduler.resume(); advance(200); assert.equal(refreshed, 3);
  scheduler.request(); scheduler.destroy(); advance(5000); assert.equal(refreshed, 3); assert.equal(timers.size, 0);
  scheduler.request(); assert.equal(timers.size, 0);
});

test("Realtime usa somente sinais e mantém consulta periódica se estiver indisponível", () => {
  let eventHandler, subscriptionHandler, authHandler, requests = 0, removed = 0, unsubscribed = 0, clean;
  const channel = { on(event, filter, callback) { assert.equal(event, "postgres_changes"); assert.equal(filter.table, "site_live_updates"); eventHandler = callback; return channel; }, subscribe(callback) { subscriptionHandler = callback; return channel; } };
  const { LiveDataRefresh } = loadTs("src/components/shared/LiveDataRefresh.tsx", {
    react: { useEffect: fn => { clean = fn(); } },
    "@/hooks/usePanelRefresh": { usePanelRefresh: () => () => requests++ },
    "@/lib/supabase/client": { createClientBrowser: () => ({ channel: () => channel, removeChannel: async () => { removed++; }, auth: { onAuthStateChange: callback => { authHandler = callback; return { data: { subscription: { unsubscribe: () => unsubscribed++ } } }; } } }) },
  });
  LiveDataRefresh();
  eventHandler({ new: { revision: 1 } }); subscriptionHandler("SUBSCRIBED"); authHandler("SIGNED_IN");
  assert.equal(requests, 3); clean(); assert.equal(removed, 1); assert.equal(unsubscribed, 1);
  const offline = loadTs("src/components/shared/LiveDataRefresh.tsx", { react: { useEffect: fn => fn() }, "@/hooks/usePanelRefresh": { usePanelRefresh: () => { requests++; return () => {}; } }, "@/lib/supabase/client": { createClientBrowser: () => { throw Error("not configured"); } } });
  assert.doesNotThrow(() => offline.LiveDataRefresh()); assert.equal(requests, 4);
});

const A = "80000000-0000-4000-8000-000000000001", B = "80000000-0000-4000-8000-000000000002";
let db;
before(async () => {
  db = await testDatabase();
  await db.query("insert into auth.users(id,email) values($1,'live-a@example.test'),($2,'live-b@example.test')", [A, B]);
});
after(async () => { if (db) await db.close(); });
async function revision(scope, audience = "00000000-0000-0000-0000-000000000000") {
  return Number((await db.query("select revision from site_live_updates where scope=$1 and audience_id=$2", [scope, audience])).rows[0]?.revision || 0);
}

test("configuração pública e rotina do aluno produzem sinais sem conteúdo privado", async () => {
  const publicBefore = await revision("public"), aBefore = await revision("user", A), bBefore = await revision("user", B);
  await db.exec("update platform_settings set value_pt='Marca live' where key='brand_name'");
  assert.ok(await revision("public") > publicBefore);
  await db.query("insert into water_intake_logs(user_id,amount_ml,logged_date,logged_time) values($1,250,current_date,'12:00:00')", [A]);
  assert.ok(await revision("user", A) > aBefore);
  assert.equal(await revision("user", B), bBefore);
  const fields = (await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='site_live_updates' order by ordinal_position")).rows.map(r => r.column_name);
  assert.deepEqual(fields, ["scope", "audience_id", "revision", "updated_at"]);
});

test("catálogos atualizam membros e exclusões também geram sinais", async () => {
  const members = await revision("members");
  await db.exec("update diet_foods set name_pt=name_pt||' updated' where id=(select id from diet_foods limit 1)");
  assert.ok(await revision("members") > members);
  const before = await revision("user", A);
  await db.query("delete from water_intake_logs where user_id=$1", [A]);
  assert.ok(await revision("user", A) > before);
});

test("anon lê somente sinal público; aluno não lê identificadores nem sinais de terceiros", async () => {
  await db.exec("set role anon");
  const publicRows = (await db.query("select scope from site_live_updates")).rows;
  assert.ok(publicRows.length > 0 && publicRows.every(r => r.scope === "public"));
  await assert.rejects(() => db.exec("update site_live_updates set revision=99"));
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [A]);
  await db.exec("set role authenticated");
  const rows = (await db.query("select scope,audience_id from site_live_updates")).rows;
  assert.ok(rows.some(r => r.scope === "user" && r.audience_id === A));
  assert.equal(rows.some(r => r.scope === "staff" || r.audience_id === B), false);
  await assert.rejects(() => db.exec("select site_touch_live_update('public')"));
  await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");
});

test("somente o transporte de sinais é adicionado à publicação; nenhuma tabela privada extra é exposta", async () => {
  const published = (await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime'")).rows.map(r => r.tablename);
  assert.ok(published.includes("site_live_updates"));
  assert.equal(published.includes("payments"), false);
  assert.equal(published.includes("student_routine_logs"), false);
  assert.equal(published.includes("profiles"), false);
});
