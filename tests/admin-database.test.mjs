import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
const A = "00000000-0000-4000-8000-000000000011",
  B = "00000000-0000-4000-8000-000000000012",
  C = "00000000-0000-4000-8000-000000000013",
  ADMIN = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
let db, food, kit, item;
before(async () => {
  db = await testDatabase();
  await db.query(
    "insert into auth.users(id,email,raw_user_meta_data) values($1,'qa+a@example.test','{\"full_name\":\"Alice\"}'),($2,'qa+b@example.test','{\"full_name\":\"Bruna\"}'),($3,'c@example.test','{\"full_name\":\"Carla\"}')",
    [A, B, C],
  );
  await db.query("update public.profiles set email='' where id=$1", [B]);
  const plan = (await db.query("select id from public.plans limit 1")).rows[0]
    .id;
  await db.query(
    "insert into public.subscriptions(user_id,plan_id,status,unit_amount_cents,created_at) values($1,$3,'canceled',100,now()-interval '1 year'),($1,$3,'active',100,now()),($2,$3,'canceled',100,now())",
    [A, B, plan],
  );
  food = (
    await db.query(
      "insert into public.diet_foods(name_pt,name_en,calories_kcal,serving_size,serving_unit) values('Arroz','Rice',200,100,'g') returning id",
    )
  ).rows[0].id;
  const saved = (
    await db.query(
      "select public.admin_save_content_kit('diet',$1,$2,$3) as kit",
      [
        { name_pt: "Kit inicial", name_en: "Initial kit", slug: "admin-kit" },
        [
          {
            food_id: food,
            quantity: 100,
            unit: "g",
            meal_type: "lunch",
            time_of_day: "12:00",
          },
        ],
        ADMIN,
      ],
    )
  ).rows[0].kit;
  kit = saved.id;
  item = (
    await db.query("select id from public.diet_kit_items where kit_id=$1", [
      kit,
    ])
  ).rows[0].id;
});
after(async () => {
  if (db) await db.close();
});
test("diretório filtra pela assinatura selecionada, sem incluir cancelamento antigo", async () => {
  const query = async (status, search = "", offset = 0, limit = 20) =>
    (
      await db.query(
        "select public.admin_student_directory($1,$2,$3,$4) as result",
        [search, status, limit, offset],
      )
    ).rows[0].result;
  assert.deepEqual(
    (await query("active")).students.map((s) => s.id),
    [A],
  );
  assert.deepEqual(
    (await query("canceled")).students.map((s) => s.id),
    [B],
  );
  assert.deepEqual(
    (await query("no_subscription")).students.map((s) => s.id),
    [C],
  );
  assert.equal((await query("", "qa+b@example.test")).students[0].id, B);
  const last = await query("", "", 999, 1);
  assert.equal(last.page, 3);
  assert.equal(last.total, 3);
  assert.equal(last.students.length, 1);
});
test("salvar kit mantém identidade e consumo; erro em item desfaz também a alteração do cabeçalho", async () => {
  const assignment = (
    await db.query(
      "insert into public.student_diet_kits(student_id,kit_id) values($1,$2) returning id",
      [A, kit],
    )
  ).rows[0].id;
  await db.query(
    "select public.set_student_routine($1,'diet',$2,$3,'12:00',true,current_date)",
    [A, assignment, item],
  );
  const metadata = {
    id: kit,
    name_pt: "Kit editado",
    name_en: "Edited kit",
    slug: "admin-kit",
  };
  const items = [
    {
      id: item,
      food_id: food,
      quantity: 150,
      unit: "g",
      meal_type: "lunch",
      time_of_day: "12:00",
    },
  ];
  await db.query("select public.admin_save_content_kit('diet',$1,$2,$3)", [
    metadata,
    items,
    ADMIN,
  ]);
  assert.equal(
    (
      await db.query("select id from public.diet_kit_items where kit_id=$1", [
        kit,
      ])
    ).rows[0].id,
    item,
  );
  assert.equal(
    (
      await db.query(
        "select id from public.student_routine_logs where item_id=$1",
        [item],
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    db.query("select public.admin_save_content_kit('diet',$1,$2,$3)", [
      { ...metadata, name_pt: "Should rollback" },
      [{ ...items[0], food_id: C }],
      ADMIN,
    ]),
    /Food unavailable/,
  );
  assert.equal(
    (await db.query("select name_pt from public.diet_kits where id=$1", [kit]))
      .rows[0].name_pt,
    "Kit editado",
  );
  assert.equal(
    Number(
      (
        await db.query(
          "select quantity from public.diet_kit_items where id=$1",
          [item],
        )
      ).rows[0].quantity,
    ),
    150,
  );
});
test("sincronizar atribuições atualiza metadados retidos, valida alunos e faz rollback em datas inválidas", async () => {
  const sync = (ids, start, end, notes, scope = "student", focus = A) =>
    db.query(
      "select public.admin_sync_content_assignments('diet',$1,$2,$3,$4,$5,$6,$7)",
      [scope, focus, ids, start, end, notes, ADMIN],
    );
  await sync([kit], null, null, "Nova orientação");
  assert.equal(
    (
      await db.query(
        "select notes from public.student_diet_kits where student_id=$1 and status='active'",
        [A],
      )
    ).rows[0].notes,
    "Nova orientação",
  );
  await assert.rejects(
    sync([kit], "2026-11-10", "2026-11-01", "Inválido"),
    /End date/,
  );
  assert.equal(
    (
      await db.query(
        "select notes from public.student_diet_kits where student_id=$1 and status='active'",
        [A],
      )
    ).rows[0].notes,
    "Nova orientação",
  );
  await assert.rejects(
    sync([ADMIN], null, null, "Inválido", "kit", kit),
    /Student unavailable/,
  );
  await sync([A, B], null, null, "Compartilhado", "kit", kit);
  assert.equal(
    (
      await db.query(
        "select id from public.student_diet_kits where kit_id=$1 and status='active'",
        [kit],
      )
    ).rows.length,
    2,
  );
});

test("novo kit inválido não deixa cabeçalho órfão e aluno não atua como editor", async () => {
  const metadata = {
    name_pt: "Não deve existir",
    name_en: "Should not exist",
    slug: "rollback-kit",
  };
  await assert.rejects(
    db.query("select public.admin_save_content_kit('diet',$1,$2,$3)", [
      metadata,
      [{ food_id: C, meal_type: "lunch" }],
      ADMIN,
    ]),
    /Food unavailable/,
  );
  assert.equal(
    (
      await db.query(
        "select id from public.diet_kits where slug='rollback-kit'",
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query("select public.admin_save_content_kit('diet',$1,'[]',$2)", [
      metadata,
      A,
    ]),
    /Staff required/,
  );
});

test('kit de suplementos mantém IDs e horários na edição transacional',async()=>{
 const supplement=(await db.query("insert into public.supplements(name_pt,name_en,category_pt,category_en,serving_size,serving_unit) values('Teste','Test','Teste','Test',5,'g') returning id")).rows[0].id
 const metadata={name_pt:'Suplementação',name_en:'Supplements',slug:'atomic-supplement-kit'}
 const draft={supplement_id:supplement,dosage:5,dosage_unit:'g',frequency_per_day:1,times_of_day:['08:00']}
 const saved=(await db.query("select public.admin_save_content_kit('supplement',$1,$2,$3) as kit",[metadata,[draft],ADMIN])).rows[0].kit
 const initial=(await db.query('select id from public.supplement_kit_items where kit_id=$1',[saved.id])).rows[0].id
 await db.query("select public.admin_save_content_kit('supplement',$1,$2,$3)",[{...metadata,id:saved.id},[{...draft,id:initial,dosage:10,times_of_day:['09:00']}],ADMIN])
 const updated=(await db.query('select id,dosage,times_of_day from public.supplement_kit_items where kit_id=$1',[saved.id])).rows[0]
 assert.equal(updated.id,initial);assert.equal(Number(updated.dosage),10);assert.deepEqual(updated.times_of_day,['09:00'])
})

test('cancelamento imediato encerra acesso e diretório não chama assinatura expirada de ativa',async()=>{
 await db.query("update public.subscriptions set status='canceled',ended_at=now(),current_period_end=now()+interval '20 days' where user_id=$1 and status='active'",[A])
 assert.equal((await db.query('select allowed from public.can_access_platform($1)',[A])).rows[0].allowed,false)
 await db.query("update public.subscriptions set status='active',ended_at=null,current_period_end=now()-interval '20 days' where user_id=$1",[A])
 const directory=(await db.query("select public.admin_student_directory('','active') as result")).rows[0].result
 assert.equal(directory.students.some(s=>s.id===A),false)
 const blocked=(await db.query("select public.admin_student_directory('','blocked') as result")).rows[0].result
 assert.equal(blocked.students.some(s=>s.id===A),true)
})
