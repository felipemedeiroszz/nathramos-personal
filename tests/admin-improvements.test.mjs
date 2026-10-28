import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002",
  C = "10000000-0000-4000-8000-000000000003",
  ADMIN = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
let db, kit, food;
before(async () => {
  db = await testDatabase();
  await db.query(
    "insert into auth.users(id,email) values($1,'alice@test.test'),($2,'bruna@test.test'),($3,'coach@test.test')",
    [A, B, C],
  );
  await db.query("update profiles set role='coach' where id=$1", [C]);
  await db.query("select admin_assign_coach($1,$2,$3)", [ADMIN, A, C]);
  food = (
    await db.query(
      "insert into diet_foods(name_pt,name_en,calories_kcal,serving_size,serving_unit) values('Feijão','Beans',100,100,'g') returning id",
    )
  ).rows[0].id;
  kit = (
    await db.query("select admin_save_content_kit('diet',$1,'[]',$2) as kit", [
      { name_pt: "Kit", name_en: "Kit", slug: "improvements-kit" },
      C,
    ])
  ).rows[0].kit.id;
});
after(async () => {
  if (db) await db.close();
});
test("coach só gerencia seus alunos; somente admin pode redistribuir carteira", async () => {
  assert.equal(
    (await db.query("select can_manage_student($1,$2) as allowed", [A, C]))
      .rows[0].allowed,
    true,
  );
  assert.equal(
    (await db.query("select can_manage_student($1,$2) as allowed", [B, C]))
      .rows[0].allowed,
    false,
  );
  await assert.rejects(
    db.query("select admin_assign_coach($1,$2,$3)", [C, B, C]),
    /Administrador/,
  );
  const directory = (
    await db.query(
      "select admin_student_directory('','',20,0,'pt-BR',$1) as result",
      [C],
    )
  ).rows[0].result;
  assert.equal(directory.total, 1);
  assert.equal(directory.students[0].id, A);
  assert.equal("subscription" in directory.students[0], false);
  await assert.rejects(
    db.query(
      "select admin_sync_content_assignments('diet','student',$1,$2,null,null,null,$3)",
      [B, [kit], C],
    ),
    /outside coach scope/,
  );
});
test("RLS nega leitura de outro aluno mesmo com políticas legadas de coach", async () => {
  await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [C]);
    const rows = (
      await tx.query("select id from profiles where id in ($1,$2)", [A, B])
    ).rows;
    assert.deepEqual(
      rows.map((row) => row.id),
      [A],
    );
    assert.equal(
      (await tx.query("select * from subscriptions")).rows.length,
      0,
    );
  });
});
test("histórico registra antes/depois e rejeita edição de versão desatualizada", async () => {
  const current = (await db.query("select * from diet_kits where id=$1", [kit]))
    .rows[0];
  await db.query("select admin_save_content_kit('diet',$1,'[]',$2)", [
    { ...current, name_pt: "Versão nova" },
    C,
  ]);
  await assert.rejects(
    db.query("select admin_save_content_kit('diet',$1,'[]',$2)", [
      { ...current, name_pt: "Sobrescrita" },
      C,
    ]),
    /Recarregue/,
  );
  assert.equal(
    (await db.query("select name_pt from diet_kits where id=$1", [kit])).rows[0]
      .name_pt,
    "Versão nova",
  );
  const revision = (
    await db.query(
      "select * from prescription_revisions where table_name='diet_kits' and record_id=$1 order by id desc limit 1",
      [kit],
    )
  ).rows[0];
  assert.equal(revision.before_data.name_pt, "Kit");
  assert.equal(revision.after_data.name_pt, "Versão nova");
  assert.equal(revision.actor_id, C);
  await assert.rejects(
    db.query("select admin_save_content_kit('diet',$1,'[]',$2)", [
      { ...current, name_pt: "Terceiro" },
      B,
    ]),
    /Staff required/,
  );
});
test("fila de trabalho é calculada no banco dentro da carteira", async () => {
  await db.query(
    "insert into exams(user_id,title,exam_date) values($1,'Hemograma',current_date),($2,'Exame externo',current_date)",
    [A, B],
  );
  const queue = (await db.query("select admin_work_queue($1) as queue", [C]))
    .rows[0].queue;
  assert.equal(queue.counts.exam, 1);
  assert.equal(queue.counts.workout, 1);
  assert.equal(queue.counts.diet, 1);
  assert.ok(queue.items.every((item) => item.student_id === A));
});
test("paginação busca todos os registros antes do limite e impede coach de consultar financeiro", async () => {
  await db.query(
    "insert into diet_foods(name_pt,name_en,calories_kcal,serving_size,serving_unit) values('Banana','Banana',90,100,'g'),('Maçã','Apple',50,100,'g')",
  );
  const page = (
    await db.query("select admin_data_page($1,'diet_foods','{}',2,1) as page", [
      ADMIN,
    ])
  ).rows[0].page;
  assert.ok(page.total >= 3);
  assert.equal(page.page, 2);
  assert.equal(page.rows.length, 1);
  const match = (
    await db.query("select admin_data_page($1,'diet_foods',$2,1,1) as page", [
      ADMIN,
      { q: "Apple" },
    ])
  ).rows[0].page;
  assert.equal(match.total, 1);
  assert.equal(match.rows[0].name_en, "Apple");
  await assert.rejects(
    db.query("select admin_data_page($1,'payments')", [C]),
    /Administrador/,
  );
  await assert.rejects(
    db.query("select admin_data_page($1,'auth.users')", [ADMIN]),
    /Catálogo/,
  );
});
test("CSV neutraliza fórmulas e mantém aspas e quebras de linha; filtros validam datas e moeda", () => {
  const { csvCell } = loadTs("src/lib/admin/csv.ts");
  assert.equal(csvCell("=SUM(A1)"), `"'=SUM(A1)"`);
  assert.equal(csvCell('A"B'), '"A""B"');
  const { dataFilters } = loadTs("src/lib/admin/data-page.ts", {
    "server-only": {},
    "@/lib/auth/access": {},
    "@/lib/supabase/server": {},
  });
  assert.throws(() => dataFilters({ from: "2026-02-30" }), /Data inválida/);
  assert.throws(
    () => dataFilters({ from: "2026-10-10", to: "2026-10-01" }),
    /data final/,
  );
  assert.throws(() => dataFilters({ currency: "EUR" }), /Moeda/);
});
test("sincronização de atribuições rejeita snapshot antigo sem arquivar vínculos", async () => {
  const token = (
    await db.query(
      "select admin_assignment_fingerprint($1,'diet','student',$2) as token",
      [C, A],
    )
  ).rows[0].token;
  await db.query(
    "select admin_sync_content_assignments('diet','student',$1,$2,current_date,null,'Prescrição',$3,$4)",
    [A, [kit], C, token],
  );
  await assert.rejects(
    db.query(
      "select admin_sync_content_assignments('diet','student',$1,'{}',current_date,null,null,$2,$3)",
      [A, C, token],
    ),
    /Recarregue/,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as count from student_diet_kits where student_id=$1 and status='active'",
        [A],
      )
    ).rows[0].count,
    1,
  );
  const page = (
    await db.query("select admin_data_page($1,'diet_kits','{}') as page", [C])
  ).rows[0].page;
  assert.match(
    page.rows.find((row) => row.id === kit).assignment_fingerprint,
    /^[a-f0-9]{32}$/,
  );
});
test("RLS bloqueia escrita global do coach e edição de prescrição alheia", async () => {
  const adminKit = (
    await db.query("select admin_save_content_kit('diet',$1,'[]',$2) as kit", [
      { name_pt: "Admin", name_en: "Admin", slug: "admin-owned" },
      ADMIN,
    ])
  ).rows[0].kit.id;
  await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [C]);
    await assert.rejects(
      tx.query(
        "insert into diet_foods(name_pt,name_en,calories_kcal,serving_size,serving_unit) values('Inválido','Invalid',10,100,'g')",
      ),
      /row-level security/,
    );
  });
  const changed = await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [C]);
    return tx.query(
      "update diet_kits set name_pt='Inválido' where id=$1 returning id",
      [adminKit],
    );
  });
  assert.equal(changed.rows.length, 0);
});
test("conferência financeira separa moedas e respeita o dia em São Paulo", async () => {
  const plan = (await db.query("select id from plans limit 1")).rows[0].id;
  await db.query(
    "insert into payments(user_id,provider,status,amount_cents,currency,method,paid_at) values($1,'stripe','paid',1000,'BRL','credit_card','2026-10-28T02:59:00Z'),($1,'stripe','paid',2500,'BRL','credit_card','2026-10-28T03:00:00Z'),($1,'stripe','paid',9900,'USD','credit_card','2026-10-28T03:00:00Z')",
    [A],
  );
  const report = (
    await db.query(
      "select admin_finance_checks($1,'BRL','2026-10-28','2026-10-28') as report",
      [ADMIN],
    )
  ).rows[0].report;
  assert.equal(report.paid_cents, 2500);
  await assert.rejects(
    db.query(
      "select admin_finance_checks($1,'BRL','2026-10-28','2026-10-28')",
      [C],
    ),
    /Administrador/,
  );
});

test("reordenação de treino é atômica, mantém versão e rejeita item de outro kit", async () => {
  const workout = (
    await db.query(
      "insert into workout_kits(name_pt,name_en,slug,created_by_id) values('Treino','Workout','versioned-workout',$1) returning id,revision",
      [C],
    )
  ).rows[0];
  const exercise = (
    await db.query(
      "insert into exercises(name_pt,name_en,primary_muscle,equipment,difficulty) values('Agachamento','Squat','quads','body_weight','beginner') returning id",
    )
  ).rows[0].id;
  const item = (
    await db.query(
      "insert into workout_kit_items(kit_id,exercise_id,order_index) values($1,$2,1) returning id",
      [workout.id, exercise],
    )
  ).rows[0].id;
  const revision = (
    await db.query("select revision from workout_kits where id=$1", [
      workout.id,
    ])
  ).rows[0].revision;
  await assert.rejects(
    db.query("select admin_mutate_workout_items($1,$2,$3,'reorder',$4)", [
      C,
      workout.id,
      revision,
      [{ id: B, order_index: 0 }],
    ]),
    /Item de outro kit/,
  );
  assert.equal(
    (
      await db.query("select revision from workout_kits where id=$1", [
        workout.id,
      ])
    ).rows[0].revision,
    revision,
  );
  await db.query("select admin_mutate_workout_items($1,$2,$3,'reorder',$4)", [
    C,
    workout.id,
    revision,
    [{ id: item, order_index: 2 }],
  ]);
  await assert.rejects(
    db.query("select admin_mutate_workout_items($1,$2,$3,'remove',$4)", [
      C,
      workout.id,
      revision,
      [item],
    ]),
    /Recarregue/,
  );
  assert.equal(
    (
      await db.query("select order_index from workout_kit_items where id=$1", [
        item,
      ])
    ).rows[0].order_index,
    2,
  );
});

test("ação de remover atribuição verifica carteira antes de usar service role", async () => {
  let called = false;
  const actions = loadTs("src/app/actions/workouts.ts", {
    "@/lib/auth/platform": {
      requireManagedRecord: async () => {
        throw new Error("Aluno fora da carteira");
      },
    },
    "@/lib/auth/access": {
      requireRole: async () => ({ userId: C, role: "coach" }),
    },
    "@/services/WorkoutService": {},
    "@/services/WorkoutKitService": {
      WorkoutKitService: {
        unassign: async () => {
          called = true;
          return true;
        },
      },
    },
    "@/lib/supabase/server": {},
    "next/cache": { revalidatePath() {} },
  });
  const result = await actions.unassignWorkoutKitAction(A);
  assert.equal(result.success, false);
  assert.equal(called, false);
});

test("conferência de gateway considera estorno e não grava status ou expõe payload", async () => {
  let fail = false,
    updates = 0;
  const audits = [];
  const row = {
    id: A,
    provider: "stripe",
    external_id: "pi_fixture",
    status: "paid",
    amount_cents: 1000,
    currency: "BRL",
  };
  const actions = loadTs("src/app/actions/reconciliation.ts", {
    "@/lib/auth/access": {
      requireRole: async (allowed) => {
        assert.deepEqual(allowed, ["admin"]);
        return { userId: ADMIN };
      },
    },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ single: async () => ({ data: row, error: null }) }),
          }),
          update: () => {
            updates++;
            throw new Error("No writes allowed");
          },
        }),
      }),
    },
    "@/lib/payments/stripe": {
      getStripeClient: () => ({
        paymentIntents: {
          retrieve: async () => {
            if (fail) throw new Error("Provider unavailable");
            return {
              status: "succeeded",
              amount: 1000,
              currency: "brl",
              latest_charge: "ch_fixture",
              client_secret: "fixture-only-secret",
            };
          },
        },
        charges: {
          retrieve: async () => ({ amount: 1000, amount_refunded: 300 }),
        },
      }),
    },
    "@/lib/payments/asaas": {},
    "@/services/AuditLogService": {
      AuditLogService: {
        log: async (value) => {
          audits.push(value);
          return true;
        },
      },
    },
  });
  const form = new FormData();
  form.set("kind", "payments");
  form.set("id", A);
  form.set("locale", "en-US");
  const checked = await actions.inspectBillingRecordAction(null, form);
  assert.equal(checked.success, true);
  assert.match(checked.message, /partially_refunded/);
  assert.equal(JSON.stringify(checked).includes("fixture-only-secret"), false);
  assert.equal(JSON.stringify(audits).includes("fixture-only-secret"), false);
  fail = true;
  assert.equal(
    (await actions.inspectBillingRecordAction(null, form)).success,
    false,
  );
  assert.equal(updates, 0);
});

test("recorrência ativa no Asaas não é tratada como pagamento quitado", async () => {
  const actions = loadTs("src/app/actions/reconciliation.ts", {
    "@/lib/auth/access": { requireRole: async () => ({ userId: ADMIN }) },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: A,
                  provider: "asaas",
                  external_id: "sub_fixture",
                  status: "past_due",
                  external_status: "ACTIVE",
                  unit_amount_cents: 7900,
                  currency: "BRL",
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    },
    "@/lib/payments/stripe": {},
    "@/lib/payments/asaas": {
      AsaasProvider: {
        getSubscriptionStatus: async () => ({
          id: "sub_fixture",
          status: "ACTIVE",
          value: 79,
        }),
      },
    },
    "@/services/AuditLogService": {
      AuditLogService: { log: async () => true },
    },
  });
  const form = new FormData();
  form.set("kind", "subscriptions");
  form.set("id", A);
  form.set("locale", "en-US");
  const result = await actions.inspectBillingRecordAction(null, form);
  assert.equal(result.success, true);
  assert.match(result.message, /does not prove payment/);
  assert.equal(result.message.includes("past_due → active"), false);
});

test("exportação mantém o corte de criação entre páginas", async () => {
  const first = (
    await db.query("select admin_data_page($1,'diet_foods','{}',1,1) as page", [
      ADMIN,
    ])
  ).rows[0].page;
  assert.equal(typeof first.snapshot, "string");
  await db.query(
    "insert into diet_foods(name_pt,name_en,calories_kcal,serving_size,serving_unit,created_at) values('Posterior','Later',10,100,'g',$1::timestamptz+interval '1 second')",
    [first.snapshot],
  );
  const next = (
    await db.query("select admin_data_page($1,'diet_foods',$2,2,1) as page", [
      ADMIN,
      { _snapshot: first.snapshot },
    ])
  ).rows[0].page;
  assert.equal(next.total, first.total);
  assert.equal(next.snapshot, first.snapshot);
});
