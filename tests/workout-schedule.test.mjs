import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
import { testDatabase } from "./database.mjs";
const { followingDate, assignmentPhase, workoutScheduleSchema } = loadTs(
  "src/lib/workout-schedule.ts",
);
test("date boundaries and schedule input are unambiguous", () => {
  assert.equal(followingDate("2028-02-28"), "2028-02-29");
  assert.equal(followingDate("2026-12-31"), "2027-01-01");
  const a = {
    status: "active",
    start_date: "2026-11-01",
    end_date: "2026-11-30",
  };
  assert.equal(assignmentPhase(a, "2026-10-31"), "scheduled");
  assert.equal(assignmentPhase(a, "2026-11-30"), "current");
  assert.equal(assignmentPhase(a, "2026-12-01"), "ended");
  const input = {
    student_id: "80000000-0000-4000-8000-000000000001",
    entries: [
      {
        kit_id: "80000000-0000-4000-8000-000000000002",
        start_date: "2026-11-01",
        end_date: "2026-11-30",
      },
    ],
  };
  assert(workoutScheduleSchema.safeParse(input).success);
  assert(
    !workoutScheduleSchema.safeParse({
      ...input,
      entries: [
        ...input.entries,
        {
          ...input.entries[0],
          start_date: "2026-11-30",
          end_date: "2026-12-30",
        },
      ],
    }).success,
  );
  assert(
    !workoutScheduleSchema.safeParse({
      ...input,
      entries: [{ ...input.entries[0], start_date: "2026-02-30" }],
    }).success,
  );
});
test("sequential kits are atomic, limited, non-overlapping, editable and switch by date", async () => {
  const db = await testDatabase(),
    admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
    student = "80000000-0000-4000-8000-000000000001",
    outsider = "80000000-0000-4000-8000-000000000002";
  try {
    await db.query(
      `insert into auth.users(id,email) values($1,'schedule-student@example.test'),($2,'schedule-outsider@example.test')`,
      [student, outsider],
    );
    await db.query("update profiles set role='coach' where id=$1", [outsider]);
    const kit = (
      await db.query(
        `insert into workout_kits(name_pt,name_en,slug,created_by_id) values('Kit teste','Test kit','schedule-test',$1) returning id`,
        [admin],
      )
    ).rows[0].id;
    const today = (
      await db.query(
        `select (now() at time zone 'America/Sao_Paulo')::date::text d`,
      )
    ).rows[0].d;
    function add(date, days) {
      const d = new Date(date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    }
    const entries = Array.from({ length: 6 }, (_, i) => ({
      kit_id: kit,
      start_date: add(today, i * 7),
      end_date: add(today, i * 7 + 6),
    }));
    const schedule = (items, actor = admin, edit = null) =>
      db.query("select schedule_student_workout_kits($1,$2,$3::jsonb,$4)", [
        actor,
        student,
        JSON.stringify(items),
        edit,
      ]);
    await assert.rejects(() => schedule(entries, student), /Acesso negado/);
    await assert.rejects(() => schedule(entries, outsider), /Acesso negado/);
    await schedule(entries);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from student_workout_kits where student_id=$1",
          [student],
        )
      ).rows[0].n,
      6,
    );
    for (let i = 0; i < 6; i++) {
      for (const date of [entries[i].start_date, entries[i].end_date]) {
        const current = (
          await db.query(
            `select start_date::text from student_workout_kits where student_id=$1 and status='active' and start_date<=$2::date and (end_date is null or end_date>=$2::date)`,
            [student, date],
          )
        ).rows;
        assert.deepEqual(current, [{ start_date: entries[i].start_date }]);
      }
    }
    await assert.rejects(
      () =>
        schedule([
          { kit_id: kit, start_date: add(today, 42), end_date: add(today, 48) },
        ]),
      /seis/,
    );
    await assert.rejects(
      () =>
        schedule([{ kit_id: kit, start_date: today, end_date: add(today, 2) }]),
      /sobrepõe/,
    );
    const first = (
      await db.query(
        "select id from student_workout_kits where student_id=$1 order by start_date limit 1",
        [student],
      )
    ).rows[0].id;
    await assert.rejects(
      () =>
        schedule(
          [{ ...entries[0], end_date: entries[1].start_date }],
          admin,
          first,
        ),
      /sobrepõe/,
    );
    await schedule([{ ...entries[0], end_date: add(today, 5) }], admin, first);
    assert.equal(
      (
        await db.query(
          "select end_date::text d from student_workout_kits where id=$1",
          [first],
        )
      ).rows[0].d,
      add(today, 5),
    );
    // Expired rows retain history but release a slot.
    await db.exec(
      "alter table student_workout_kits disable trigger guard_workout_schedule",
    );
    await db.query(
      "update student_workout_kits set start_date=$2,end_date=$3 where id=$1",
      [first, add(today, -10), add(today, -1)],
    );
    await db.exec(
      "alter table student_workout_kits enable trigger guard_workout_schedule",
    );
    await schedule([
      { kit_id: kit, start_date: add(today, 42), end_date: add(today, 48) },
    ]);
    await assert.rejects(
      () =>
        schedule(
          [{ kit_id: kit, start_date: today, end_date: today }],
          admin,
          first,
        ),
      /encerrados/,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from student_workout_kits where student_id=$1",
          [student],
        )
      ).rows[0].n,
      7,
    );
    assert.equal(
      (
        await db.query(
          `select has_function_privilege('authenticated','schedule_student_workout_kits(uuid,uuid,jsonb,uuid)','EXECUTE') allowed`,
        )
      ).rows[0].allowed,
      false,
    );
    // Batch errors roll back every period and audit record.
    await db.query(
      `update student_workout_kits set status='archived' where student_id=$1`,
      [student],
    );
    const before = (
      await db.query(
        "select count(*)::int n from student_workout_kits where student_id=$1",
        [student],
      )
    ).rows[0].n;
    await assert.rejects(
      () =>
        schedule([
          entries[0],
          { ...entries[1], start_date: entries[0].end_date },
        ]),
      /sobrepõe|sequência/,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from student_workout_kits where student_id=$1",
          [student],
        )
      ).rows[0].n,
      before,
    );
  } finally {
    await db.close();
  }
});
