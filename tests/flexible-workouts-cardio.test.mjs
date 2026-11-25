import { test } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";
const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
  student = "f0000000-0000-4000-8000-000000000001",
  outsider = "f0000000-0000-4000-8000-000000000002";
test("cardio and drops validate actual quantities instead of accepting empty or malformed entries", () => {
  const { cardioLogSchema, cardioPlanSchema } = loadTs("src/lib/cardio.ts");
  assert(cardioLogSchema.safeParse({ status: "skipped" }).success);
  assert(!cardioLogSchema.safeParse({ status: "done" }).success);
  assert(
    !cardioLogSchema.safeParse({
      status: "done",
      activity_id: student,
      duration_min: 0,
    }).success,
  );
  assert(
    cardioLogSchema.safeParse({
      status: "done",
      activity_id: student,
      duration_min: 25,
    }).success,
  );
  assert(
    !cardioPlanSchema.safeParse({
      weekday: 8,
      activity_id: student,
      target_minutes: 20,
    }).success,
  );
  const { logWorkoutSetSchema } = loadTs("src/schemas/workouts.ts");
  const base = { session_id: student, exercise_id: student, reps_done: 15 };
  assert(
    logWorkoutSetSchema.safeParse({
      ...base,
      drop_steps: [
        { reps_done: 10, weight_kg: 15 },
        { reps_done: 12, weight_kg: 10 },
      ],
    }).success,
  );
  for (const drop of [
    { reps_done: 1.5, weight_kg: 10 },
    { reps_done: 10, weight_kg: -1 },
    { reps_done: "", weight_kg: 10 },
  ])
    assert(
      !logWorkoutSetSchema.safeParse({ ...base, drop_steps: [drop] }).success,
    );
});
test("all prescribed weekdays execute today; outsider and future cycles stay protected; drops and cardio persist atomically", async () => {
  const db = await testDatabase();
  try {
    await db.query(
      "insert into auth.users(id,email) values($1,'flex@test.example'),($2,'outsider-flex@test.example')",
      [student, outsider],
    );
    const today = (
      await db.query(
        "select (now() at time zone 'America/Sao_Paulo')::date::text d",
      )
    ).rows[0].d;
    const exercise = (
      await db.query(
        "insert into exercises(name_pt,name_en,primary_muscle,created_by_id) values('Teste','Test','quads',$1) returning id",
        [admin],
      )
    ).rows[0].id;
    const kit = (
      await db.query(
        "insert into workout_kits(name_pt,name_en,slug,created_by_id) values('Flexível','Flexible','flexible-test',$1) returning id",
        [admin],
      )
    ).rows[0].id;
    for (let weekday = 1; weekday <= 7; weekday++)
      await db.query(
        "insert into workout_kit_items(kit_id,exercise_id,day_of_week,order_index) values($1,$2,$3,0)",
        [kit, exercise, weekday],
      );
    await db.query(
      "insert into student_workout_kits(student_id,kit_id,start_date,end_date,status) values($1,$2,$3::date,$3::date+30,'active')",
      [student, kit, today],
    );
    const days = (
      await db.query(
        "select d.*,e.id exercise_item from workout_kits k join workout_days d on d.program_id=k.generated_program_id join workout_exercises e on e.day_id=d.id where k.id=$1 order by d.day_of_week",
        [kit],
      )
    ).rows;
    let first;
    for (const day of days) {
      const session = (
        await db.query("select * from start_student_workout($1,$2,$3,$4)", [
          student,
          day.id,
          day.program_id,
          today,
        ])
      ).rows[0];
      assert.equal(session.day_id, day.id);
      first ||= session;
    }
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from workout_sessions where user_id=$1",
          [student],
        )
      ).rows[0].n,
      7,
    );
    await assert.rejects(
      db.query("select * from start_student_workout($1,$2,$3,$4)", [
        outsider,
        days[0].id,
        days[0].program_id,
        today,
      ]),
      /not assigned/,
    );
    await db.query(
      "update student_workout_kits set start_date=$2::date+1,end_date=$2::date+30 where student_id=$1",
      [student, today],
    );
    await assert.rejects(
      db.query("select * from start_student_workout($1,$2,$3,$4)", [
        student,
        days[0].id,
        days[0].program_id,
        today,
      ]),
      /not assigned/,
    );
    await db.query(
      "update student_workout_kits set start_date=$2::date where student_id=$1",
      [student, today],
    );
    await db.query("update workout_kits set is_deleted=true where id=$1", [
      kit,
    ]);
    await assert.rejects(
      db.query("select * from start_student_workout($1,$2,$3,$4)", [
        student,
        days[0].id,
        days[0].program_id,
        today,
      ]),
      /not assigned/,
    );
    await db.query("update workout_kits set is_deleted=false where id=$1", [
      kit,
    ]);
    const payload = {
      session_id: first.id,
      workout_exercise_id: days[0].exercise_item,
      exercise_id: exercise,
      set_number: 1,
      reps_done: 15,
      weight_kg: 20,
      completed: true,
      failure_at_end: true,
      drop_steps: [
        { reps_done: 10, weight_kg: 15 },
        { reps_done: 12, weight_kg: 10 },
      ],
    };
    const log = (
      await db.query("select * from log_student_workout_set($1,$2)", [
        student,
        JSON.stringify(payload),
      ])
    ).rows[0];
    assert.deepEqual(log.drop_steps, payload.drop_steps);
    assert(log.failure_at_end);
    await assert.rejects(
      db.query("select * from log_student_workout_set($1,$2)", [
        outsider,
        JSON.stringify(payload),
      ]),
      /Session unavailable/,
    );
    await assert.rejects(
      db.query("select * from log_student_workout_set($1,$2)", [
        student,
        JSON.stringify({
          ...payload,
          drop_steps: [{ reps_done: -1, weight_kg: 10 }],
        }),
      ]),
      /valid_drop_steps/,
    );
    const activity = (
      await db.query("select id from cardio_activities where is_active limit 1")
    ).rows[0].id;
    await assert.rejects(
      db.query("select * from complete_student_workout($1,$2,$3)", [
        student,
        first.id,
        JSON.stringify({
          cardio: { status: "done", activity_id: activity, duration_min: 0 },
        }),
      ]),
      /check constraint/,
    );
    assert.equal(
      (
        await db.query(
          "select completed_at from workout_sessions where id=$1",
          [first.id],
        )
      ).rows[0].completed_at,
      null,
    );
    const completed = (
      await db.query("select * from complete_student_workout($1,$2,$3)", [
        student,
        first.id,
        JSON.stringify({
          cardio: { status: "done", activity_id: activity, duration_min: 25 },
        }),
      ])
    ).rows[0];
    assert.equal(Number(completed.total_volume_kg), 570);
    const cardio = (
      await db.query("select * from student_cardio_logs where student_id=$1", [
        student,
      ])
    ).rows[0];
    assert.equal(cardio.status, "done");
    assert.equal(cardio.duration_min, 25);
    assert.equal(cardio.activity_id, activity);
    // Completion retries do not duplicate or overwrite the cardio record.
    await db.query("select * from complete_student_workout($1,$2,$3)", [
      student,
      first.id,
      JSON.stringify({ cardio: { status: "skipped" } }),
    ]);
    assert.equal(
      (
        await db.query(
          "select status from student_cardio_logs where student_id=$1",
          [student],
        )
      ).rows[0].status,
      "done",
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from student_cardio_logs"),
      /permission denied/,
    );
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
test("available plans are sorted from today's weekday without depending on today's scheduled rule", async () => {
  const { WorkoutService } = loadTs("src/services/WorkoutService.ts", {
    "@/lib/auth/platform": {},
    "../lib/supabase/server": {},
    "./StudentRoutineService": {},
    "./AuditLogService": { AuditLogService: {} },
  });
  let all;
  WorkoutService.getTodayPlans = async (user, date, flag) => {
    all = flag;
    return [1, 4, 3, 7].map((n) => ({
      day: { id: String(n), day_of_week: n, week_number: 1, order_index: 0 },
    }));
  };
  const plans = await WorkoutService.getAvailablePlans(student, "2026-11-25");
  assert.equal(all, true);
  assert.deepEqual(
    plans.map((p) => p.day.day_of_week),
    [3, 4, 7, 1],
  );
});

test("cardio actions take student identity and execution date from the session, and deny student catalog edits", async () => {
  const calls = [];
  const db = {
    from(table) {
      return {
        upsert: async (payload) => {
          calls.push({ table, payload });
          return { error: null };
        },
      };
    },
  };
  const {
    saveCardioPlanAction,
    saveCardioLogAction,
    saveCardioActivityAction,
  } = loadTs("src/app/actions/cardio.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/platform": {
      requirePlatformUser: async () => ({ userId: student, staff: false }),
    },
    "@/lib/supabase/server": { createServiceClientSSR: async () => db },
    "@/services/CardioService": {
      CardioService: {
        activities: async () => [{ id: outsider, is_active: true }],
      },
    },
    "@/services/StudentAssignedContentService": {
      StudentAssignedContentService: { today: async () => "2026-11-25" },
    },
    "@/services/AuditLogService": { AuditLogService: { log: async () => {} } },
  });
  assert.equal(
    (await saveCardioActivityAction({ name_pt: "Teste", name_en: "Test" }))
      .success,
    false,
  );
  assert.equal(calls.length, 0);
  assert.equal(
    (
      await saveCardioPlanAction({
        student_id: outsider,
        weekday: 4,
        activity_id: outsider,
        target_minutes: 30,
      })
    ).success,
    true,
  );
  assert.equal(calls[0].payload.student_id, student);
  assert.equal(
    (
      await saveCardioLogAction({
        student_id: outsider,
        performed_on: "2030-01-01",
        status: "done",
        activity_id: outsider,
        duration_min: 25,
      })
    ).success,
    true,
  );
  assert.equal(calls[1].payload.student_id, student);
  assert.equal(calls[1].payload.performed_on, "2026-11-25");
  assert.equal(
    (
      await saveCardioLogAction({
        status: "skipped",
        duration_min: 25,
        activity_id: outsider,
      })
    ).success,
    true,
  );
  assert.equal(calls[2].payload.duration_min, null);
  assert.equal(calls[2].payload.activity_id, null);
});

test("a pending migration cannot silently discard drop stages through an older RPC", async () => {
  let writes = 0;
  const { WorkoutService } = loadTs("src/services/WorkoutService.ts", {
    "@/lib/auth/platform": {},
    "../lib/supabase/server": {},
    "./StudentRoutineService": {},
    "./AuditLogService": { AuditLogService: {} },
  });
  WorkoutService.getSupabase = async () => ({
    from: () => ({
      select: () => ({ limit: async () => ({ error: { code: "42703" } }) }),
    }),
    rpc: () => {
      writes++;
    },
  });
  await assert.rejects(
    WorkoutService.logSet(student, {
      session_id: student,
      exercise_id: student,
      reps_done: 12,
      drop_steps: [{ reps_done: 10, weight_kg: 5 }],
    }),
    /000067/,
  );
  assert.equal(writes, 0);
});
