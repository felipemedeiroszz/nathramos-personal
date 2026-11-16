import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
const a = "00000000-0000-4000-8000-000000000071",
  b = "00000000-0000-4000-8000-000000000072";
let db;
before(async () => {
  db = await testDatabase();
  await db.query(
    "insert into auth.users(id,email) values($1,'story-a@example.test'),($2,'story-b@example.test')",
    [a, b],
  );
  await db.query(
    "insert into subscriptions(user_id,plan_id,status,unit_amount_cents,current_period_end) select id,(select id from plans limit 1),'active',0,now()+interval '30 days' from profiles where id in ($1,$2)",
    [a, b],
  );
});
after(async () => {
  await db?.close();
});
async function create(actor, input) {
  return (
    await db.query("select community_story_mutate($1,'create',$2) id", [
      actor,
      JSON.stringify({
        request_id: crypto.randomUUID(),
        caption: "Hoje tem treino 💪",
        theme: "gold",
        text_position: "center",
        ...input,
      }),
    ])
  ).rows[0].id;
}
async function read(actor) {
  return (await db.query("select community_story_read($1) data", [actor]))
    .rows[0].data;
}
test("story dura 24h, aceita texto e emojis, retries não duplicam e expiração retira do feed", async () => {
  const request_id = crypto.randomUUID();
  const id = await create(a, { request_id });
  assert.equal(await create(a, { request_id }), id);
  const row = (
    await db.query(
      "select expires_at-created_at duration from community_stories where id=$1",
      [id],
    )
  ).rows[0];
  assert.ok(row.duration);
  assert.ok(
    (await read(b)).some((s) => s.id === id && s.caption.includes("💪")),
  );
  await db.query(
    "update community_stories set expires_at=now()-interval '1 second' where id=$1",
    [id],
  );
  assert.ok(!(await read(b)).some((s) => s.id === id));
});
test("imagem exige dono e reserva válida; limpeza preserva imagem ativa e remove após expirar", async () => {
  const path = a + "/" + crypto.randomUUID() + ".webp";
  await db.query(
    "insert into community_uploads(path,owner_id,created_at) values($1,$2,now()-interval '2 days')",
    [path, a],
  );
  await assert.rejects(create(b, { image_path: path }));
  const id = await create(a, { image_path: path });
  await db.query("select * from community_unused_uploads()");
  assert.equal(
    (
      await db.query("select deleting from community_uploads where path=$1", [
        path,
      ])
    ).rows[0].deleting,
    false,
  );
  await db.query(
    "update community_stories set expires_at=now()-interval '1 second' where id=$1",
    [id],
  );
  await db.query("select * from community_unused_uploads()");
  assert.equal(
    (
      await db.query("select deleting from community_uploads where path=$1", [
        path,
      ])
    ).rows[0].deleting,
    true,
  );
  await assert.rejects(create(a, { image_path: path }));
});
test("só autor ou admin exclui story; bloqueio impede publicar e sem acesso impede ler", async () => {
  const id = await create(a, {});
  await assert.rejects(
    db.query("select community_story_mutate($1,'delete',$2)", [
      b,
      JSON.stringify({ id }),
    ]),
  );
  await db.query("select community_story_mutate($1,'delete',$2)", [
    admin,
    JSON.stringify({ id }),
  ]);
  assert.ok(!(await read(b)).some((s) => s.id === id));
  await db.query(
    "insert into community_restrictions(user_id,blocked_until,reason,updated_by) values($1,now()+interval '1 day','Teste',$2)",
    [a, admin],
  );
  await assert.rejects(create(a, {}));
  await db.query("delete from community_restrictions where user_id=$1", [a]);
  await db.query("update subscriptions set status='blocked' where user_id=$1", [
    b,
  ]);
  await assert.rejects(read(b));
});
test("tabelas e funções de stories não podem ser acessadas diretamente por aluno", async () => {
  assert.equal(
    (
      await db.query(
        "select has_function_privilege('authenticated','community_story_read(uuid)','execute') allowed",
      )
    ).rows[0].allowed,
    false,
  );
  await db.exec("set role authenticated");
  try {
    await assert.rejects(db.query("select * from community_stories"));
  } finally {
    await db.exec("reset role");
  }
});

test("limite diário conta stories excluídos e retry não consome nova publicação", async () => {
  for (let i = 0; i < 20; i++) await create(admin, {});
  await assert.rejects(create(admin, {}), /Story daily limit/);
  const rows = await read(admin);
  const item = rows.find((s) => s.author_id === admin);
  await db.query("select community_story_mutate($1,'delete',$2)", [
    admin,
    JSON.stringify({ id: item.id }),
  ]);
  await assert.rejects(create(admin, {}), /Story daily limit/);
});

test("posição livre persiste em percentuais e rejeita coordenadas inválidas", async () => {
  const id = await create(a, { text_x: 23.5, text_y: 81 });
  const row = (await read(a)).find((s) => s.id === id);
  assert.equal(row.text_x, 23.5);
  assert.equal(row.text_y, 81);
  for (const coords of [
    { text_x: -1, text_y: 50 },
    { text_x: 50, text_y: 101 },
    { text_x: 20 },
    { text_y: 30 },
  ])
    await assert.rejects(create(a, coords));
  const legacy = await create(a, { text_position: "top" });
  const old = (await read(a)).find((s) => s.id === legacy);
  assert.equal(old.text_x, null);
  assert.equal(old.text_y, null);
  assert.equal(old.text_position, "top");
});

test("tamanho de texto e emojis persiste; stories antigos usam 100% e banco limita escala", async () => {
  const id = await create(a, { text_scale: 1.75, text_x: 30, text_y: 60 });
  const saved = (await read(a)).find((s) => s.id === id);
  assert.equal(saved.text_scale, 1.75);
  assert.equal(saved.text_x, 30);
  assert.equal(saved.text_y, 60);
  const legacy = await create(a, {});
  assert.equal((await read(a)).find((s) => s.id === legacy).text_scale, 1);
  for (const text_scale of [0.49, 2.01, -1])
    await assert.rejects(create(a, { text_scale }));
});
