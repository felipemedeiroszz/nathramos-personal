import { test } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";
test("last scheduled kit notifies administrators once, uses student time zone and cancels obsolete queued alerts", async () => {
  const db = await testDatabase(),
    admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
    student = "90000000-0000-4000-8000-000000000001",
    english = "90000000-0000-4000-8000-000000000002",
    coach = "90000000-0000-4000-8000-000000000003",
    banned = "90000000-0000-4000-8000-000000000004";
  try {
    await db.query(
      `insert into auth.users(id,email) values($1,'cycle-student@example.test'),($2,'cycle-admin@example.test'),($3,'cycle-coach@example.test'),($4,'cycle-banned@example.test')`,
      [student, english, coach, banned],
    );
    await db.query(`update profiles set role='admin' where id in($1,$2)`, [
      english,
      banned,
    ]);
    await db.query(`update profiles set role='coach' where id=$1`, [coach]);
    await db.query(`update profiles set language='en-US' where id=$1`, [
      english,
    ]);
    await db.query(
      `update profiles set timezone='America/Sao_Paulo',full_name='Aluno Teste' where id=$1`,
      [student],
    );
    await db.query(
      `update auth.users set banned_until='2099-01-01' where id=$1`,
      [banned],
    );
    const kit = (
      await db.query(
        `insert into workout_kits(name_pt,name_en,slug) values('Kit','Kit','cycle-notice') returning id`,
      )
    ).rows[0].id;
    const add = (days) => {
      const d = new Date("2040-01-01T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const entries = Array.from({ length: 6 }, (_, i) => ({
      kit_id: kit,
      start_date: add(i * 7),
      end_date: add(i * 7 + 6),
    }));
    await db.query("select schedule_student_workout_kits($1,$2,$3::jsonb)", [
      admin,
      student,
      JSON.stringify(entries),
    ]);
    const remind = async (time, scope = null) =>
      (
        await db.query(
          "select workout_cycle_remind($1::timestamptz,$2::uuid) result",
          [time, scope],
        )
      ).rows[0].result;
    assert.equal((await remind(add(34) + "T15:00:00Z")).created, 0);
    assert.equal((await remind(add(35) + "T02:59:59Z")).created, 0);
    assert.equal((await remind(add(35) + "T03:00:00Z", student)).created, 2);
    assert.equal((await remind(add(35) + "T15:00:00Z")).created, 0);
    const notifications = (
      await db.query(
        `select user_id,title,body,url,payload,sent_at from notifications where payload->>'event'='workout_cycle_update' order by user_id`,
      )
    ).rows;
    assert.equal(notifications.length, 2);
    assert(notifications.every((n) => [admin, english].includes(n.user_id)));
    assert(
      notifications.every((n) => n.url.endsWith("?tab=workouts#ficha-aluno")),
    );
    assert(
      notifications.every(
        (n) => n.payload.student_id === student && n.sent_at === null,
      ),
    );
    assert.match(
      notifications.find((n) => n.user_id === admin).body,
      /Aluno Teste/,
    );
    assert.match(
      notifications.find((n) => n.user_id === english).title,
      /Workout cycle/,
    );
    // Extend the sequence before queued push delivery: the previous alert becomes obsolete.
    await db.query(
      `update student_workout_kits set status='completed' where student_id=$1 and start_date=$2`,
      [student, entries[0].start_date],
    );
    await db.query("select schedule_student_workout_kits($1,$2,$3::jsonb)", [
      admin,
      student,
      JSON.stringify([{ kit_id: kit, start_date: add(42), end_date: add(48) }]),
    ]);
    assert.equal((await remind(add(36) + "T15:00:00Z")).cancelled, 2);
    assert(
      (
        await db.query(
          `select sent_at,error_text from notifications where payload->>'event'='workout_cycle_update'`,
        )
      ).rows.every((n) => n.sent_at && n.error_text),
    );
    assert.equal((await remind(add(42) + "T15:00:00Z")).created, 2);
    assert.equal((await remind(add(42) + "T16:00:00Z")).created, 0);
    assert.equal(
      (
        await db.query(
          `select has_function_privilege('authenticated','workout_cycle_remind(timestamptz,uuid)','EXECUTE') allowed`,
        )
      ).rows[0].allowed,
      false,
    );
  } finally {
    await db.close();
  }
});
test("standalone programs cannot be assigned directly through the service", async () => {
  const { WorkoutKitService } = loadTs("src/services/WorkoutKitService.ts", {
    "server-only": {},
    "../lib/supabase/server": {
      createServiceClientSSR: async () => {
        throw Error("Must not access the database");
      },
    },
  });
  await assert.rejects(
    () =>
      WorkoutKitService.assignToStudent(
        {
          student_id: "90000000-0000-4000-8000-000000000001",
          program_id: "90000000-0000-4000-8000-000000000002",
          start_date: "2040-01-01",
          end_date: "2040-01-31",
        },
        "admin",
      ),
    /Vincule um kit/,
  );
});
