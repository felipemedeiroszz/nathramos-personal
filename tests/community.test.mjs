import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";

const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
const coach = "00000000-0000-4000-8000-000000000003";
let db;
before(async () => {
  db = await testDatabase();
  await db.query(
    "insert into auth.users(id,email) values($1,'one@test.example'),($2,'two@test.example'),($3,'coach@test.example')",
    [a, b, coach],
  );
  await db.query(
    "update profiles set full_name=case when id=$1 then 'Alice' else 'Bruno' end where id in ($1,$2)",
    [a, b],
  );
  await db.query("update profiles set role='coach' where id=$1", [coach]);
  await db.query(
    "insert into subscriptions(user_id,plan_id,status,unit_amount_cents) select id,(select id from plans limit 1),'active',100 from profiles where id in ($1,$2)",
    [a, b],
  );
});
after(async () => {
  await db?.close();
});
async function mutate(actor, action, input) {
  return (
    await db.query("select community_mutate($1,$2,$3) id", [
      actor,
      action,
      JSON.stringify(input),
    ])
  ).rows[0].id;
}
async function feed(actor, filter = {}) {
  return (
    await db.query("select community_read($1,$2) result", [
      actor,
      JSON.stringify(filter),
    ])
  ).rows[0].result;
}
async function asUser(actor, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query(
      "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",
      [actor],
    );
    return tx.query(sql, params);
  });
}
test("publicação aceita texto ou fotos, rejeita imagens alheias e recupera tentativa repetida", async () => {
  const request = randomUUID();
  const id = await mutate(a, "post", {
    body: "Meu primeiro treino",
    images: [],
    request_id: request,
  });
  assert.equal(
    await mutate(a, "post", {
      body: "Meu primeiro treino",
      images: [],
      request_id: request,
    }),
    id,
  );
  await assert.rejects(
    mutate(a, "post", { body: "", images: [], request_id: randomUUID() }),
    /Invalid publication/,
  );
  const paths = Array.from(
    { length: 4 },
    () => a + "/" + randomUUID() + ".webp",
  );
  for (const path of paths)
    await db.query(
      "insert into community_uploads(path,owner_id) values($1,$2)",
      [path, a],
    );
  await assert.rejects(
    mutate(a, "post", { body: "", images: paths, request_id: randomUUID() }),
    /Invalid publication/,
  );
  await assert.rejects(
    mutate(b, "post", {
      body: "",
      images: paths.slice(0, 1),
      request_id: randomUUID(),
    }),
    /Invalid images/,
  );
  const photoRequest = randomUUID();
  const photo = await mutate(a, "post", {
    body: "",
    images: paths.slice(0, 3),
    request_id: photoRequest,
  });
  assert.equal(
    await mutate(a, "post", {
      body: "",
      images: paths.slice(0, 3),
      request_id: photoRequest,
    }),
    photo,
  );
  const posts = (await feed(b)).items;
  assert.equal(posts.length, 2);
  assert.equal(posts[0].id, photo);
  assert.equal(posts[0].images.length, 3);
  await assert.rejects(
    mutate(b, "edit", { id, version: 1, body: "Invadido", images: [] }),
    /unavailable/,
  );
  await mutate(a, "edit", {
    id,
    version: 1,
    body: "Conquista editada",
    images: [],
  });
  await assert.rejects(
    mutate(a, "edit", { id, version: 1, body: "Versão velha", images: [] }),
    /Publication changed/,
  );
});
test("reação única, comentários idempotentes, respostas e notificações usam a mesma transação", async () => {
  const post = await mutate(b, "post", {
    body: "Conquista",
    images: [],
    request_id: randomUUID(),
  });
  await Promise.all([
    mutate(a, "react", { post_id: post, kind: "love" }),
    mutate(a, "react", { post_id: post, kind: "strength" }),
  ]);
  const snapshot = (await feed(a, { post })).items[0];
  assert.equal(snapshot.reaction_count, 1);
  assert.equal(snapshot.my_reaction, "strength");
  const request = randomUUID();
  await mutate(a, "comment", {
    post_id: post,
    parent_id: null,
    body: "Parabéns!",
    request_id: request,
  });
  await mutate(a, "comment", {
    post_id: post,
    parent_id: null,
    body: "Parabéns!",
    request_id: request,
  });
  const parent = (
    await db.query("select id from community_comments where post_id=$1", [post])
  ).rows[0].id;
  await mutate(b, "comment", {
    post_id: post,
    parent_id: parent,
    body: "Obrigada!",
    request_id: randomUUID(),
  });
  assert.equal((await feed(a, { post })).items[0].comment_count, 2);
  const notifications = (
    await db.query(
      "select user_id,url from notifications where payload->>'community_post'=$1",
      [post],
    )
  ).rows;
  assert.equal(notifications.length, 2);
  assert.equal(
    notifications.every((n) => n.url.includes("/comunidade?post=" + post)),
    true,
  );
  await assert.rejects(
    mutate(b, "delete_comment", { id: parent }),
    /Delete denied/,
  );
  await mutate(a, "delete_comment", { id: parent });
  const thread = (
    await db.query("select community_thread($1,$2,'comments') result", [
      a,
      post,
    ])
  ).rows[0].result;
  assert.equal(thread[0].deleted, true);
  assert.equal(thread[0].body, "");
  assert.equal(thread[1].body, "Obrigada!");
  const elsewhere = await mutate(a, "post", {
    body: "Outro",
    images: [],
    request_id: randomUUID(),
  });
  await assert.rejects(
    mutate(a, "comment", {
      post_id: elsewhere,
      parent_id: parent,
      body: "Inválido",
      request_id: randomUUID(),
    }),
    /Reply unavailable/,
  );
});
test("moderação exclusiva do admin audita exclusões e bloqueio temporário", async () => {
  const post = await mutate(a, "post", {
    body: "Moderação",
    images: [],
    request_id: randomUUID(),
  });
  await assert.rejects(
    mutate(b, "delete_post", { post_id: post }),
    /Delete denied/,
  );
  await assert.rejects(
    mutate(coach, "delete_post", { post_id: post, reason: "Teste" }),
    /Community access denied/,
  );
  await assert.rejects(
    mutate(b, "restrict", { user_id: a, until: null, reason: "Teste" }),
    /Administrator required/,
  );
  await mutate(admin, "restrict", {
    user_id: a,
    until: new Date(Date.now() + 3600000).toISOString(),
    reason: "Revisão",
  });
  await assert.rejects(
    mutate(a, "comment", {
      post_id: post,
      parent_id: null,
      body: "Bloqueado",
      request_id: randomUUID(),
    }),
    /participation suspended/,
  );
  assert.equal((await feed(a, { post })).items.length, 1);
  await mutate(admin, "restrict", {
    user_id: a,
    until: null,
    reason: "Revisado",
  });
  await mutate(a, "comment", {
    post_id: post,
    parent_id: null,
    body: "Liberado",
    request_id: randomUUID(),
  });
  await mutate(admin, "delete_post", {
    post_id: post,
    reason: "Revisão de conteúdo",
  });
  assert.equal((await feed(b, { post })).items.length, 0);
  const audit = (
    await db.query(
      "select admin_id,details from audit_logs where action='community.post_deleted' and entity_id=$1",
      [post],
    )
  ).rows[0];
  assert.equal(audit.admin_id, admin);
  assert.equal(audit.details.reason, "Revisão de conteúdo");
  const history = await feed(admin, { author: a, mode: "comments" });
  assert.ok(history.items.every((c) => c.author_id === a));
  assert.ok(
    (await feed(admin, { mode: "members", q: "Alice" })).items.some(
      (c) => c.author_id === a,
    ),
  );
  await assert.rejects(feed(a, { mode: "comments" }), /Administrator required/);
  await assert.rejects(
    asUser(a, "select * from community_posts"),
    /permission denied/,
  );
  await assert.rejects(
    asUser(a, "select community_mutate($1,'post',$2)", [
      a,
      JSON.stringify({ body: "X", images: [], request_id: randomUUID() }),
    ]),
    /permission denied/,
  );
});
test("limite anti-spam é persistente e assinaturas vencidas e contas suspensas não entram", async () => {
  for (let i = 0; i < 10; i++) {
    const count = Number(
      (
        await db.query(
          "select count(*) n from community_posts where author_id=$1",
          [a],
        )
      ).rows[0].n,
    );
    if (count >= 10) break;
    await mutate(a, "post", {
      body: "Registro " + i,
      images: [],
      request_id: randomUUID(),
    });
  }
  await assert.rejects(
    mutate(a, "post", { body: "Limite", images: [], request_id: randomUUID() }),
    /rate limit/,
  );
  await db.query(
    "update auth.users set banned_until=now()+interval '1 day' where id=$1",
    [a],
  );
  await assert.rejects(feed(a), /Community access denied/);
  await db.query("update auth.users set banned_until=null where id=$1", [a]);
  await db.query("update subscriptions set status='blocked' where user_id=$1", [
    a,
  ]);
  await assert.rejects(feed(a), /Community access denied/);
});
test("limpeza remove somente arquivos abandonados e impede anexar arquivos em exclusão", async () => {
  const path = b + "/" + randomUUID() + ".webp";
  await db.query(
    "insert into community_uploads(path,owner_id,created_at) values($1,$2,now()-interval '2 days')",
    [path, b],
  );
  const rows = (await db.query("select * from community_unused_uploads()"))
    .rows;
  assert.ok(rows.some((r) => r.path === path));
  assert.ok(rows.every((r) => r.deleting));
  await assert.rejects(
    mutate(b, "post", { body: "", images: [path], request_id: randomUUID() }),
    /Invalid images/,
  );
});
test("validação da API limita tamanhos, reações, filtros e UUIDs", () => {
  const { communityActionSchema, communityFilterSchema } = loadTs(
    "src/lib/community.ts",
    {},
  );
  assert.equal(
    communityActionSchema.safeParse({
      action: "react",
      post_id: randomUUID(),
      kind: "invalid",
    }).success,
    false,
  );
  assert.equal(
    communityActionSchema.safeParse({
      action: "comment",
      post_id: randomUUID(),
      parent_id: null,
      body: " ",
      request_id: randomUUID(),
    }).success,
    false,
  );
  assert.equal(
    communityFilterSchema.safeParse({ cursor: new Date().toISOString() })
      .success,
    false,
  );
});

test("paginação por data e UUID não perde publicações com horários iguais", async () => {
  await db.query(
    `
    insert into community_posts(author_id,body,request_id,created_at)
    select $1,'Paginação '||n,gen_random_uuid(),'2040-01-01T12:00:00Z' from generate_series(1,25) n
  `,
    [b],
  );
  const filter = {
    author: b,
    from: "2039-01-01T00:00:00Z",
    to: "2041-01-01T00:00:00Z",
  };
  const first = (await feed(admin, filter)).items;
  assert.equal(first.length, 21);
  const cursor = first[19];
  const { communityFilterSchema } = loadTs("src/lib/community.ts", {});
  assert.equal(
    communityFilterSchema.safeParse({
      cursor: cursor.created_at,
      cursor_id: cursor.id,
    }).success,
    true,
  );
  const second = (
    await feed(admin, {
      ...filter,
      cursor: cursor.created_at,
      cursor_id: cursor.id,
    })
  ).items;
  assert.equal(second.length, 5);
  assert.equal(
    new Set([...first.slice(0, 20), ...second].map((p) => p.id)).size,
    25,
  );
});

test("Storage recusa leitura e upload diretos no bucket privado da comunidade",async()=>{
  const path=b+"/"+randomUUID()+".webp";
  await db.exec("grant select,insert on storage.objects to authenticated");
  await db.query("insert into storage.objects(bucket_id,name,owner) values('community-images',$1,$2)",[path,b]);
  await assert.rejects(asUser(b,"insert into storage.objects(bucket_id,name,owner) values('community-images',$1,$2)",[b+"/"+randomUUID()+".webp",b]),/row-level security/);
  assert.equal((await asUser(b,"select id from storage.objects where bucket_id='community-images'")).rows.length,0);
});
