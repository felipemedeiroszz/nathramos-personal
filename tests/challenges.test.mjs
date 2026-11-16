import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";
import { challengeConfig } from "./challenges-fixture.mjs";
const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002",
  other = "00000000-0000-4000-8000-000000000003";
let db;
before(async () => {
  db = await testDatabase();
  await db.query(
    "insert into auth.users(id,email) values($1,'challenge-a@example.test'),($2,'challenge-b@example.test'),($3,'challenge-c@example.test')",
    [a, b, other],
  );
  await db.query(
    "update profiles set full_name=case when id=$1 then 'Alice' else 'Bruno' end where id in ($1,$2)",
    [a, b],
  );
  await db.query(
    "insert into subscriptions(user_id,plan_id,status,unit_amount_cents) select id,(select id from plans limit 1),'active',100 from profiles where id in ($1,$2,$3)",
    [a, b, other],
  );
});
after(async () => {
  await db?.close();
});
const call = async (actor, action, input) =>
  (
    await db.query("select challenge_mutate($1,$2,$3) id", [
      actor,
      action,
      JSON.stringify(input),
    ])
  ).rows[0].id;
const read = async (actor, filter) =>
  (
    await db.query("select challenge_read($1,$2) result", [
      actor,
      JSON.stringify(filter),
    ])
  ).rows[0].result;

async function create(config = challengeConfig()) {
  const request = randomUUID();
  const id = await call(admin, "create", {
    title: config.title,
    start_date: config.start_date,
    end_date: config.end_date,
    request_id: request,
  });
  assert.equal(
    await call(admin, "create", {
      title: config.title,
      start_date: config.start_date,
      end_date: config.end_date,
      request_id: request,
    }),
    id,
  );
  await call(admin, "save", {
    ...config,
    challenge_id: id,
    version: 1,
    reason: "",
  });
  await call(admin, "publish", { challenge_id: id });
  return id;
}
async function join(id, actor = a) {
  const detail = await read(actor, { id });
  return call(actor, "join", {
    challenge_id: id,
    accept_rules: true,
    version: detail.challenge.version,
  });
}
test("somente administrador configura e publica; inscrições respeitam capacidade, ACL e consentimento", async () => {
  await assert.rejects(
    call(a, "create", {
      title: "Inválido",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 10000).toISOString(),
      request_id: randomUUID(),
    }),
    /Administrator required/,
  );
  const id = await create();
  const detail = await read(a, { id });
  assert.equal(detail.goals.length, 1);
  assert.equal(detail.prizes.length, 1);
  await assert.rejects(
    call(a, "join", {
      challenge_id: id,
      accept_rules: false,
      version: detail.challenge.version,
    }),
    /Accept current rules/,
  );
  const enrollment = await join(id);
  assert.equal(await join(id), enrollment);
  await join(id, b);
  await assert.rejects(join(id, other), /full/);
  const exclusive = await create(
    challengeConfig({ visibility: "exclusive", audience: [a] }),
  );
  await assert.rejects(read(b, { id: exclusive }), /access denied/);
  assert.ok((await read(a, {})).items.some((c) => c.id === exclusive));
  assert.ok(!(await read(b, {})).items.some((c) => c.id === exclusive));
  await assert.rejects(
    call(a, "save", { challenge_id: id }),
    /Administrator required/,
  );
});
test("validação manual computa pontos uma única vez e recusa fraude, duplicidade e retroatividade", async () => {
  const id = await create();
  await join(id);
  const detail = await read(a, { id });
  const goal = detail.goals[0];
  assert.equal(Number(detail.progress[0].progress), 0);
  const input = {
    challenge_id: id,
    goal_id: goal.id,
    recorded_value: 3,
    activity_date: new Date().toISOString(),
    proof_image: null,
    notes: "",
    request_id: randomUUID(),
  };
  const activity = await call(a, "activity", input);
  assert.equal(await call(a, "activity", input), activity);
  assert.equal(Number((await read(a, { id })).participant.total_points), 0);
  await assert.rejects(
    call(a, "review", {
      challenge_id: id,
      activity_id: activity,
      approved: true,
      reason: "Fraude",
    }),
    /Administrator required/,
  );
  await call(admin, "review", {
    challenge_id: id,
    activity_id: activity,
    approved: true,
    reason: "Comprovado",
  });
  await call(admin, "review", {
    challenge_id: id,
    activity_id: activity,
    approved: true,
    reason: "Repetido",
  });
  assert.equal(Number((await read(a, { id })).participant.total_points), 5);
  assert.equal(
    (
      await db.query(
        "select count(*) n from challenge_points where activity_id=$1",
        [activity],
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(
    call(a, "activity", {
      ...input,
      activity_date: new Date().toISOString(),
      request_id: randomUUID(),
    }),
    /already has a record/,
  );
  await assert.rejects(
    call(a, "activity", {
      ...input,
      activity_date: new Date(Date.now() - 3 * 86400000).toISOString(),
      request_id: randomUUID(),
    }),
    /outside allowed/,
  );
  await call(admin, "review", {
    challenge_id: id,
    activity_id: activity,
    approved: false,
    reason: "Revisão do comprovante",
  });
  assert.equal(Number((await read(a, { id })).participant.total_points), 0);
  const notifications = (
    await db.query(
      "select count(*) n from notifications where payload->>'challenge_id'=$1",
      [id],
    )
  ).rows[0].n;
  assert.ok(Number(notifications) > 0);
});
test("pontuação por período respeita teto; ajustes são idempotentes e auditados", async () => {
  const base = challengeConfig({
    start_date: new Date(Date.now() - 4 * 86400000).toISOString(),
  });
  base.goals[0].requires_approval = false;
  const id = await create(base);
  const enrollment = await join(id);
  await db.query(
    "update challenge_participants set joined_at=now()-interval '4 days' where id=$1",
    [enrollment],
  );
  const goal = (await read(a, { id })).goals[0];
  for (let day = 0; day < 3; day++)
    await call(a, "activity", {
      challenge_id: id,
      goal_id: goal.id,
      recorded_value: 100,
      activity_date: new Date(Date.now() - day * 86400000).toISOString(),
      proof_image: null,
      notes: "",
      request_id: randomUUID(),
    });
  assert.equal(Number((await read(a, { id })).participant.total_points), 10);
  const adjustment = {
    challenge_id: id,
    participant_id: enrollment,
    points: 2,
    reason: "Correção documentada",
    request_id: randomUUID(),
  };
  await call(admin, "adjust", adjustment);
  await call(admin, "adjust", adjustment);
  assert.equal(Number((await read(a, { id })).participant.total_points), 12);
  await assert.rejects(
    call(admin, "adjust", {
      ...adjustment,
      points: -100,
      request_id: randomUUID(),
    }),
    /cannot be negative/,
  );
  assert.equal(Number((await read(a, { id })).participant.total_points), 12);
  assert.ok(
    (await read(admin, { id })).audit.some((row) => row.action === "adjust"),
  );
});
test("apuração aguarda pendências, congela o resultado e publica revisão sem alterar o histórico", async () => {
  const id = await create();
  await join(id);
  const goal = (await read(a, { id })).goals[0];
  const activity = await call(a, "activity", {
    challenge_id: id,
    goal_id: goal.id,
    recorded_value: 3,
    activity_date: new Date().toISOString(),
    proof_image: null,
    notes: "",
    request_id: randomUUID(),
  });
  await call(admin, "close", {
    challenge_id: id,
    reason: "Encerramento de teste",
  });
  assert.equal((await read(admin, { id })).challenge.status, "review");
  await assert.rejects(
    call(admin, "confirm", { challenge_id: id, reason: "", winners: [] }),
    /pending validations/,
  );
  await call(admin, "review", {
    challenge_id: id,
    activity_id: activity,
    approved: true,
    reason: "Validado",
  });
  const ready = await read(admin, { id });
  assert.equal(ready.result.revision, 1);
  await call(admin, "confirm", {
    challenge_id: id,
    reason: "Classificação revisada",
    winners: [],
  });
  const final = await read(a, { id });
  assert.equal(final.challenge.status, "completed");
  assert.equal(final.winners[0].user_id, a);
  assert.equal(Number(final.winners[0].final_points), 5);
  await assert.rejects(
    call(admin, "adjust", {
      challenge_id: id,
      participant_id: final.participant.id,
      points: 1,
      reason: "Sem revisão",
      request_id: randomUUID(),
    }),
    /closed/,
  );
  await assert.rejects(
    db.query(
      "update challenge_results set snapshot='{}' where challenge_id=$1",
      [id],
    ),
    /immutable/,
  );
  await call(admin, "correct", {
    challenge_id: id,
    reason: "Revisão formal da apuração",
  });
  await call(admin, "adjust", {
    challenge_id: id,
    participant_id: final.participant.id,
    points: 1,
    reason: "Ajuste após revisão",
    request_id: randomUUID(),
  });
  await call(admin, "confirm", {
    challenge_id: id,
    reason: "Segunda apuração",
    winners: [],
  });
  const revisions = (
    await db.query(
      "select revision,snapshot,published_at from challenge_results where challenge_id=$1 order by revision",
      [id],
    )
  ).rows;
  assert.equal(revisions.length, 2);
  assert.equal(Number(revisions[0].snapshot.ranking[0].total_points), 5);
  assert.equal(Number(revisions[1].snapshot.ranking[0].total_points), 6);
});
test("encerramento automático é repetível, rejeita pendências conforme regra e respeita empates", async () => {
  const id = await create(
    challengeConfig({
      tie_breakers: [],
      tie_policy: "manual",
      pending_policy: "reject",
    }),
  );
  await join(id, a);
  await join(id, b);
  await db.query(
    "update challenges set end_date=now()-interval '1 millisecond' where id=$1",
    [id],
  );
  await db.query("select challenge_process()");
  await db.query("select challenge_process()");
  const result = await read(admin, { id });
  assert.equal(result.challenge.status, "review");
  assert.equal(result.result.revision, 1);
  await assert.rejects(
    call(admin, "confirm", { challenge_id: id, reason: "", winners: [] }),
    /tied placements/,
  );
  await call(admin, "confirm", {
    challenge_id: id,
    reason: "Critério administrativo publicado",
    winners: [{ user_id: b, placement: 1 }],
  });
  const official = await read(a, { id });
  assert.equal(official.winners.length, 1);
  assert.equal(official.winners[0].user_id, b);
  assert.equal(official.my_rank.rank_position, 2);
  assert.equal((await read(b, { id })).my_rank.rank_position, 1);
  assert.equal(
    (await read(admin, { id })).result.snapshot.administrative_decision[0]
      .user_id,
    b,
  );
});
test("comprovantes de terceiros ficam privados e regras após início exigem justificativa", async () => {
  const config = challengeConfig();
  config.goals[0].proof_type = "photo";
  const id = await create(config);
  await join(id, a);
  await join(id, b);
  const goal = (await read(a, { id })).goals[0];
  const path = id + "/" + randomUUID() + ".webp";
  await db.query(
    "select challenge_reserve_upload($1,$2,$3,'proof','image/webp')",
    [a, id, path],
  );
  assert.equal(
    (await db.query("select challenge_asset($1,$2) type", [a, path])).rows[0]
      .type,
    "image/webp",
  );
  await assert.rejects(
    db.query("select challenge_asset($1,$2)", [b, path]),
    /Private proof/,
  );
  await assert.rejects(
    call(b, "activity", {
      challenge_id: id,
      goal_id: goal.id,
      recorded_value: 3,
      activity_date: new Date().toISOString(),
      proof_image: path,
      notes: "",
      request_id: randomUUID(),
    }),
    /Invalid or reused proof/,
  );
  const current = (await read(admin, { id })).challenge;
  await assert.rejects(
    call(admin, "save", {
      ...config,
      challenge_id: id,
      version: current.version,
      reason: "",
    }),
    /reason required/,
  );
  await call(admin, "save", {
    ...config,
    title: "Título revisado",
    challenge_id: id,
    version: current.version,
    reason: "Esclarecimento das regras",
  });
  assert.equal((await read(a, { id })).challenge.title, "Título revisado");
});
test("validação do payload impede valores e modalidades fora das regras", () => {
  const { challengeConfigSchema, challengeActionSchema } = loadTs(
    "src/lib/challenges.ts",
    {},
  );
  assert.equal(
    challengeConfigSchema.safeParse(challengeConfig()).success,
    true,
  );
  assert.equal(
    challengeActionSchema.safeParse({
      action: "adjust",
      challenge_id: randomUUID(),
      participant_id: randomUUID(),
      points: 0,
      reason: "Teste",
      request_id: randomUUID(),
    }).success,
    false,
  );
});

test("metas combinadas diárias, semanais e totais pontuam no servidor", async () => {
  const config = challengeConfig({ max_participants: null });
  const base = {
    ...config.goals[0],
    requires_approval: false,
    frequency: "total",
    target_value: 2,
    points: 20,
    max_points: 20,
  };
  config.goals = [
    {
      ...base,
      title: "Treinos",
      goal_type: "workout",
      frequency: "weekly",
      points: 30,
      max_points: 30,
    },
    { ...base, title: "Cardio", goal_type: "cardio", frequency: "total" },
    {
      ...base,
      title: "Água",
      goal_type: "water",
      frequency: "daily",
      target_value: 3,
      points: 5,
      max_points: 10,
    },
  ];
  const id = await create(config);
  await join(id);
  for (const goal of (await read(a, { id })).goals) {
    await call(a, "activity", {
      challenge_id: id,
      goal_id: goal.id,
      recorded_value: goal.target_value,
      activity_date: null,
      proof_image: null,
      notes: "Total consolidado",
      request_id: randomUUID(),
    });
  }
  assert.equal(Number((await read(a, { id })).participant.total_points), 55);
  assert.equal(
    (
      await db.query(
        "select count(*) n from challenge_points where challenge_id=$1",
        [id],
      )
    ).rows[0].n,
    3,
  );
});

test("empate compartilhado preserva ganhadores e impede acesso direto ao livro de pontos", async () => {
  const id = await create(
    challengeConfig({ tie_breakers: [], tie_policy: "shared" }),
  );
  await join(id, a);
  await join(id, b);
  await call(admin, "close", {
    challenge_id: id,
    reason: "Apuração compartilhada",
  });
  await call(admin, "confirm", {
    challenge_id: id,
    reason: "Empate conforme regras",
    winners: [],
  });
  const detail = await read(a, { id });
  assert.equal(detail.winners.length, 2);
  assert.ok(detail.winners.every((w) => w.placement === 1));
  await assert.rejects(
    db.query("delete from challenge_winners where challenge_id=$1", [id]),
    /immutable/,
  );
  await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [a]);
    await assert.rejects(
      tx.query("select * from challenge_points"),
      /permission denied/,
    );
  });
});

test("duplicação cria outro rascunho e preserva todas as metas e colocações", async () => {
  const config = challengeConfig({ winner_type: "top3", winner_count: 3 });
  config.prizes = [1, 2, 3].map((placement) => ({
    ...config.prizes[0],
    placement,
    name: "Prêmio " + placement,
  }));
  const id = await create(config);
  const request = randomUUID();
  const copy = await call(admin, "duplicate", {
    challenge_id: id,
    request_id: request,
  });
  assert.equal(
    await call(admin, "duplicate", { challenge_id: id, request_id: request }),
    copy,
  );
  const detail = await read(admin, { id: copy });
  assert.equal(detail.challenge.status, "draft");
  assert.deepEqual(
    detail.prizes.map((p) => p.name),
    ["Prêmio 1", "Prêmio 2", "Prêmio 3"],
  );
  assert.equal(detail.goals.length, config.goals.length);
  assert.equal(detail.participant_count, 0);
});

test("encerramento manual notifica os participantes uma única vez", async () => {
  const id = await create();
  await join(id);
  await call(admin, "close", {
    challenge_id: id,
    reason: "Encerramento administrativo",
  });
  await db.query("select challenge_process()");
  const { rows } = await db.query(
    "select count(*) n from challenge_notification_events where challenge_id=$1 and user_id=$2 and event_key='ended'",
    [id, a],
  );
  assert.equal(Number(rows[0].n), 1);
});

test("registro recusado pode ser corrigido no mesmo horário sem duplicar pontos", async () => {
  const id = await create();
  await join(id);
  const goal = (await read(a, { id })).goals[0];
  const input = {
    challenge_id: id,
    goal_id: goal.id,
    recorded_value: 1,
    activity_date: new Date().toISOString(),
    proof_image: null,
    notes: "Total inicial",
    request_id: randomUUID(),
  };
  const first = await call(a, "activity", input);
  await call(admin, "review", {
    challenge_id: id,
    activity_id: first,
    approved: false,
    reason: "Corrigir o total",
  });
  const second = await call(a, "activity", {
    ...input,
    recorded_value: 3,
    notes: "Total corrigido",
    request_id: randomUUID(),
  });
  assert.notEqual(first, second);
  await call(admin, "review", {
    challenge_id: id,
    activity_id: second,
    approved: true,
    reason: "Conferido",
  });
  assert.equal(Number((await read(a, { id })).participant.total_points), 5);
  await assert.rejects(
    call(admin, "review", {
      challenge_id: id,
      activity_id: first,
      approved: true,
      reason: "Tentativa duplicada",
    }),
    /challenge_activities_daily_unique/,
  );
  assert.equal(Number((await read(a, { id })).participant.total_points), 5);
});

test("decisão administrativa em modalidade compartilhada coincide com o ranking oficial", async () => {
  const id = await create(
    challengeConfig({
      winner_type: "top3",
      winner_count: 3,
      max_participants: 3,
      tie_breakers: [],
      tie_policy: "shared",
      prizes: [1, 2, 3].map((placement) => ({
        ...challengeConfig().prizes[0],
        placement,
        name: "Prêmio " + placement,
      })),
    }),
  );
  await join(id, a);
  await join(id, b);
  await join(id, other);
  await call(admin, "close", { challenge_id: id, reason: "Encerramento" });
  await call(admin, "confirm", {
    challenge_id: id,
    reason: "Ordem definida conforme revisão",
    winners: [
      { user_id: b, placement: 1 },
      { user_id: other, placement: 2 },
      { user_id: a, placement: 3 },
    ],
  });
  const official = await read(a, { id });
  assert.equal(official.my_rank.rank_position, 3);
  assert.equal((await read(b, { id })).my_rank.rank_position, 1);
  assert.equal(official.winners.find((w) => w.user_id === other).placement, 2);
});

test("novas mudanças de posição com o mesmo saldo geram novos avisos", async () => {
  const config = challengeConfig({ tie_breakers: [] });
  config.goals[0].requires_approval = false;
  const id = await create(config);
  const first = await join(id, a),
    second = await join(id, b);
  const adjust = async (participant, points) =>
    call(admin, "adjust", {
      challenge_id: id,
      participant_id: participant,
      points,
      reason: "Conferência de ranking",
      request_id: randomUUID(),
    });
  await adjust(first, 5);
  await adjust(second, 10);
  await adjust(second, -10);
  await adjust(second, 10);
  const { rows } = await db.query(
    "select count(*) n from challenge_notification_events where challenge_id=$1 and user_id=$2 and event_key like 'rank:v%'",
    [id, a],
  );
  assert.equal(Number(rows[0].n), 3);
});

test("saída de um participante atualiza a posição e avisa quem subiu", async () => {
  const id = await create(challengeConfig({ tie_breakers: [] }));
  const first = await join(id, a);
  await join(id, b);
  await call(admin, "adjust", {
    challenge_id: id,
    participant_id: first,
    points: 10,
    reason: "Pontuação verificada",
    request_id: randomUUID(),
  });
  const before = (
    await db.query(
      "select count(*) n from challenge_notification_events where challenge_id=$1 and user_id=$2 and event_key like 'rank:v%'",
      [id, b],
    )
  ).rows[0].n;
  await call(a, "leave", { challenge_id: id });
  assert.equal((await read(b, { id })).my_rank.rank_position, 1);
  const after = (
    await db.query(
      "select count(*) n from challenge_notification_events where challenge_id=$1 and user_id=$2 and event_key like 'rank:v%'",
      [id, b],
    )
  ).rows[0].n;
  assert.equal(Number(after), Number(before) + 1);
});
