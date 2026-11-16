import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";
const a = "00000000-0000-4000-8000-000000000081",
  b = "00000000-0000-4000-8000-000000000082",
  admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
let db, month, today;
before(async () => {
  db = await testDatabase();
  await db.query(
    "insert into auth.users(id,email) values($1,'monthly-a@example.test'),($2,'monthly-b@example.test')",
    [a, b],
  );
  await db.query(
    "insert into subscriptions(user_id,plan_id,status,unit_amount_cents,current_period_end) select id,(select id from plans limit 1),'active',0,now()+interval '90 days' from profiles where id in ($1,$2)",
    [a, b],
  );
  const state = await read(a);
  month = state.month;
  today = state.today;
});
after(async () => {
  await db?.close();
});
async function read(actor) {
  return (await db.query("select monthly_progress_read($1) data", [actor]))
    .rows[0].data;
}
async function photos(actor) {
  const result = {};
  for (const angle of ["front", "back", "left", "right"]) {
    const path = `${actor}/${month}/${angle}/${crypto.randomUUID()}.webp`;
    await db.query("select monthly_progress_reserve($1,$2,$3,$4)", [
      actor,
      month,
      angle,
      path,
    ]);
    await db.query(
      "update monthly_progress_uploads set ready=true where path=$1",
      [path],
    );
    result[angle] = path;
  }
  return result;
}
async function save(actor, images, version = 0, weight = 72.5, period = month) {
  return (
    await db.query("select monthly_progress_save($1,$2,$3,$4,$5) data", [
      actor,
      period,
      weight,
      JSON.stringify(images),
      version,
    ])
  ).rows[0].data;
}
test("registro exige quatro ângulos e peso, salva um mês e integra o histórico de peso", async () => {
  const images = await photos(a);
  await assert.rejects(save(a, { front: images.front }));
  await assert.rejects(save(a, { ...images, right: images.front }));
  const result = await save(a, images);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].version, 1);
  assert.equal(result.records[0].weight_kg, 72.5);
  assert.deepEqual(result.records[0].photos, images);
  assert.equal(
    Number(
      (
        await db.query(
          "select weight_kg from weight_logs where user_id=$1 and logged_date=$2",
          [a, today],
        )
      ).rows[0].weight_kg,
    ),
    72.5,
  );
  const revised = await save(a, images, 1, 73);
  assert.equal(revised.records.length, 1);
  assert.equal(revised.records[0].version, 2);
  await assert.rejects(save(a, images, 1, 74), /VERSION_CONFLICT/);
});
test("aluno não usa imagens alheias, outro mês ou uploads incompletos", async () => {
  const other = await photos(b);
  await assert.rejects(save(a, other, 2));
  assert.equal((await read(b)).records.length, 0);
  await assert.rejects(save(b, other, 0, 19));
  await assert.rejects(save(b, other, 0, 70.123));
  await assert.rejects(save(b, other, 0, 75, "2099-01-01"));
  await db.query(
    "update monthly_progress_uploads set ready=false where path=$1",
    [other.front],
  );
  await assert.rejects(save(b, other));
  await assert.rejects(
    db.query("select monthly_progress_reserve($1,$2,$3,$4)", [
      a,
      "2099-01-01",
      "front",
      other.front,
    ]),
  );
  await assert.rejects(read(admin));
});
test("limpeza preserva fotos do histórico e recupera uploads abandonados", async () => {
  const orphan = `${a}/${month}/front/${crypto.randomUUID()}.webp`;
  await db.query("select monthly_progress_reserve($1,$2,$3,$4)", [
    a,
    month,
    "front",
    orphan,
  ]);
  await db.query(
    "update monthly_progress_uploads set created_at=now()-interval '2 days' where user_id=$1",
    [a],
  );
  const rows = (
    await db.query("select * from monthly_progress_unused_uploads()")
  ).rows;
  assert.ok(rows.some((r) => r.path === orphan));
  const record = (await read(a)).records[0];
  for (const path of Object.values(record.photos))
    assert.ok(!rows.some((r) => r.path === path));
});
test("lembrete do dia 1 respeita fuso, registro concluído e deduplicação", async () => {
  const clock = (
    await db.query(
      "select (date_trunc('month',now() at time zone 'America/Sao_Paulo')+interval '12 hours') at time zone 'UTC' instant",
    )
  ).rows[0].instant;
  const first = (
    await db.query("select monthly_progress_remind($1) data", [clock])
  ).rows[0].data;
  assert.equal(first.created, 1);
  assert.equal(
    (await db.query("select monthly_progress_remind($1) data", [clock])).rows[0]
      .data.created,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from notifications where user_id=$1 and payload ? 'monthly_progress'",
        [a],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from notifications where user_id=$1 and payload ? 'monthly_progress'",
        [b],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select monthly_progress_remind($1::timestamptz+interval '1 day') data",
        [clock],
      )
    ).rows[0].data.created,
    0,
  );
});
test("tabelas e RPCs de evolução mensal não são expostos ao cliente autenticado", async () => {
  assert.equal(
    (
      await db.query(
        "select has_function_privilege('authenticated','monthly_progress_read(uuid)','execute') allowed",
      )
    ).rows[0].allowed,
    false,
  );
  await db.exec("set role authenticated");
  try {
    await assert.rejects(db.query("select * from student_monthly_progress"));
    await assert.rejects(db.query("select * from monthly_progress_uploads"));
  } finally {
    await db.exec("reset role");
  }
});
test("schema de preenchimento mensal recusa mês e fotos inválidos", () => {
  const { monthlyProgressSchema } = loadTs("src/lib/monthly-progress.ts");
  assert.equal(
    monthlyProgressSchema.safeParse({
      month: "2026-11-02",
      weight_kg: 70,
      photos: {},
      version: 0,
    }).success,
    false,
  );
});

test("rota de fotos mensais restringe leitura ao dono e mantém resposta privada", async () => {
  let downloads = 0;
  const own = `${a}/2026-11-01/front/00000000-0000-4000-8000-000000000001.webp`,
    foreign = `${b}/2026-11-01/front/00000000-0000-4000-8000-000000000001.webp`;
  const { GET } = loadTs(
    "src/app/api/student/monthly-progress/image/route.ts",
    {
      "@/services/MonthlyProgressService": {
        monthlyProgressActor: async () => ({ userId: a }),
      },
      "@/lib/auth/platform": { AccessError: class extends Error {} },
      "@/lib/supabase/server": {
        createServiceClientSSR: async () => ({
          from() {
            const filters = {};
            const query = {
              select: () => query,
              eq: (key, value) => {
                filters[key] = value;
                return query;
              },
              maybeSingle: async () => {
                assert.equal(filters.user_id, a);
                assert.equal(filters.ready, true);
                assert.equal(filters.deleting, false);
                return { data: filters.path === own ? { path: own } : null };
              },
            };
            return query;
          },
          storage: {
            from: () => ({
              download: async () => {
                downloads++;
                return { data: new Blob(["webp"]) };
              },
            }),
          },
        }),
      },
    },
  );
  const req = (path) => ({
    nextUrl: new URL(
      "http://localhost/api/student/monthly-progress/image?path=" +
        encodeURIComponent(path),
    ),
  });
  assert.equal((await GET(req(foreign))).status, 404);
  assert.equal(downloads, 0);
  const response = await GET(req(own));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(downloads, 1);
});
test("API mensal recusa anônimo e origem externa antes de gravar", async () => {
  let allowed = false,
    writes = 0;
  class AccessError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }
  const { GET, POST } = loadTs(
    "src/app/api/student/monthly-progress/route.ts",
    {
      "@/lib/auth/platform": { AccessError },
      "@/services/MonthlyProgressService": {
        monthlyProgressActor: async () => {
          if (!allowed) throw new AccessError("Entre", 401);
          return { userId: a };
        },
        readMonthlyProgress: async () => ({}),
        saveMonthlyProgress: async () => {
          writes++;
          return {};
        },
      },
    },
  );
  assert.equal((await GET()).status, 401);
  allowed = true;
  const req = new Request("http://localhost/api/student/monthly-progress", {
    method: "POST",
    headers: {
      origin: "https://evil.example",
      "content-type": "application/json",
    },
    body: "{}",
  });
  req.nextUrl = new URL(req.url);
  assert.equal((await POST(req)).status, 403);
  assert.equal(writes, 0);
});
