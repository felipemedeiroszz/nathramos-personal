import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
  student = "00000000-0000-4000-8000-000000000091",
  other = "00000000-0000-4000-8000-000000000092";
let db, assignment, date;
before(async () => {
  db = await testDatabase();
  await db.query(
    "insert into auth.users(id,email) values($1,'daily@example.test'),($2,'daily-other@example.test')",
    [student, other],
  );
  await db.query(
    "update profiles set timezone='America/Sao_Paulo' where id=$1",
    [student],
  );
  date = (
    await db.query(
      "select (now() at time zone 'America/Sao_Paulo')::date::text as day",
    )
  ).rows[0].day;
  const kit = (
    await db.query(
      "insert into diet_kits(name_pt,name_en,slug,created_by_id) values('Dieta','Diet','daily-versioned',$1) returning id",
      [admin],
    )
  ).rows[0].id;
  assignment = (
    await db.query(
      "insert into student_diet_kits(student_id,kit_id,start_date,status) values($1,$2,$3,'active') returning id",
      [student, kit, date],
    )
  ).rows[0].id;
});
after(async () => {
  await db?.close();
});
test("regra por aluno protege carteira, revisão concorrente e passado", async () => {
  const rule = { weekdays: [1, 3], condition: "training" };
  await assert.rejects(
    db.query("select save_student_daily_rule($1,$2,$3,$4,$5,$6,0)", [
      other,
      student,
      "diet",
      assignment,
      date,
      rule,
    ]),
    /carteira/,
  );
  await assert.rejects(
    db.query("select save_student_daily_rule($1,$2,$3,$4,$5,$6,0)", [
      admin,
      other,
      "diet",
      assignment,
      date,
      rule,
    ]),
    /Vínculo/,
  );
  await db.query("select save_student_daily_rule($1,$2,$3,$4,$5,$6,0)", [
    admin,
    student,
    "diet",
    assignment,
    date,
    rule,
  ]);
  await assert.rejects(
    db.query("select save_student_daily_rule($1,$2,$3,$4,$5,$6,0)", [
      admin,
      student,
      "diet",
      assignment,
      date,
      rule,
    ]),
    /Programação alterada/,
  );
  await db.query("select save_student_daily_rule($1,$2,$3,$4,$5,$6,1)", [
    admin,
    student,
    "diet",
    assignment,
    date,
    { ...rule, weekdays: [2] },
  ]);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from student_rule_history where student_id=$1",
        [student],
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(
    db.query("select save_student_daily_rule($1,$2,$3,$4,'2020-01-01',$5,0)", [
      admin,
      student,
      "diet",
      assignment,
      rule,
    ]),
    /dias passados/,
  );
});
test("prescrição materializada arquiva revisões e consumo usa quantidade individual", async () => {
  const item = {
    assignmentId: assignment,
    itemId: "00000000-0000-4000-8000-000000000093",
    slot: "09:00",
    nutrition: { calories_kcal: 333, protein_g: 10, carbs_g: 20, fats_g: 5 },
  };
  const plan = {
    diet: [item],
    supplements: [],
    workouts: [],
    workoutState: "rest",
  };
  await db.query("select store_student_day($1,$2,$3)", [student, date, plan]);
  await db.query("select store_student_day($1,$2,$3)", [student, date, plan]);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from student_prescription_history where user_id=$1",
        [student],
      )
    ).rows[0].n,
    0,
  );
  await db.query("select set_student_routine($1,$2,$3,$4,$5,true,$6)", [
    student,
    "diet",
    assignment,
    item.itemId,
    "09:00",
    date,
  ]);
  assert.equal(
    Number(
      (
        await db.query(
          "select calories_kcal from student_routine_logs where user_id=$1",
          [student],
        )
      ).rows[0].calories_kcal,
    ),
    333,
  );
  await assert.rejects(
    db.query("select set_student_routine($1,$2,$3,$4,$5,true,$6)", [
      student,
      "diet",
      assignment,
      item.itemId,
      "08:00",
      date,
    ]),
    /não prescrito/,
  );
  await db.query("select store_student_day($1,$2,$3)", [
    student,
    date,
    { ...plan, diet: [] },
  ]);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from student_prescription_history where user_id=$1",
        [student],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    Number(
      (
        await db.query(
          "select calories_kcal from student_routine_logs where user_id=$1",
          [student],
        )
      ).rows[0].calories_kcal,
    ),
    333,
  );
  await assert.rejects(
    db.query("select set_student_routine($1,$2,$3,$4,$5,true,$6)", [
      student,
      "diet",
      assignment,
      item.itemId,
      "09:00",
      date,
    ]),
    /não prescrito/,
  );
  await assert.rejects(
    db.query("select store_student_day($1,'2020-01-01',$2)", [student, plan]),
    /current day/,
  );
});
test("aluno não lê regras de outros nem modifica snapshots diretamente", async () => {
  for (const table of [
    "student_daily_rules",
    "student_day_prescriptions",
    "student_prescription_history",
    "student_rule_history",
  ]) {
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
          student,
        ]);
        return tx.exec(`select * from ${table}`);
      }),
      /permission denied/,
    );
  }
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      return tx.query("select store_student_day($1,$2,$3)", [
        student,
        date,
        {},
      ]);
    }),
    /permission denied/,
  );
});
