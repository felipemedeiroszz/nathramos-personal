import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
import { testDatabase } from "./database.mjs";
const { upsertWorkoutKitItemSchema } = loadTs("src/schemas/workouts.ts");
const id = "00000000-0000-4000-8000-000000000071";
test("performed repetitions are required, whole and independent of the prescribed target", () => {
  const { logWorkoutSetSchema } = loadTs("src/schemas/workouts.ts");
  const base = { session_id: id, exercise_id: id };
  for (const reps of [undefined, "", " ", 1.5, -1])
    assert(
      !logWorkoutSetSchema.safeParse({ ...base, reps_done: reps }).success,
    );
  assert.equal(
    logWorkoutSetSchema.parse({ ...base, reps_done: 10 }).reps_done,
    10,
  );
  assert.equal(
    logWorkoutSetSchema.parse({ ...base, reps_done: 0 }).reps_done,
    0,
  );
});
test("kit exercise targets accept whole repetitions only and retain legacy items", () => {
  const item = { kit_id: id, exercise_id: id, day_of_week: 1 };
  assert(upsertWorkoutKitItemSchema.safeParse(item).success);
  assert(
    upsertWorkoutKitItemSchema.safeParse({ ...item, target_reps: 12 }).success,
  );
  for (const reps of [0, -1, 2.5, 1001, "10-12"]) {
    assert(
      !upsertWorkoutKitItemSchema.safeParse({ ...item, target_reps: reps })
        .success,
    );
  }
});
test("repetition edits persist on the canonical kit exercise, survive materialization and reject stale saves", async () => {
  const db = await testDatabase();
  try {
    const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
    const exercise = (
      await db.query(
        "insert into exercises(name_pt,name_en,primary_muscle,created_by_id) values('Agachamento','Squat','quads',$1) returning id",
        [admin],
      )
    ).rows[0].id;
    const kit = (
      await db.query(
        "insert into workout_kits(name_pt,name_en,slug,created_by_id) values('Meta por exercício','Exercise targets','rep-targets',$1) returning id",
        [admin],
      )
    ).rows[0].id;
    const item = (
      await db.query(
        "insert into workout_kit_items(kit_id,exercise_id,day_of_week,order_index) values($1,$2,1,0) returning id",
        [kit, exercise],
      )
    ).rows[0].id;
    const initial = (
      await db.query(
        "select id,reps,sets from workout_exercises where source_kit_item_id=$1",
        [item],
      )
    ).rows[0];
    const supabase = {
      from(table) {
        assert.equal(table, "workout_exercises");
        let patch,
          source,
          expected,
          hasExpected = false;
        const query = {
          update(value) {
            patch = value;
            return query;
          },
          eq(key, value) {
            if (key === "source_kit_item_id") source = value;
            else {
              assert.equal(key, "reps");
              expected = value;
              hasExpected = true;
            }
            return query;
          },
          is(key, value) {
            assert.equal(key, "reps");
            expected = value;
            hasExpected = true;
            return query;
          },
          select() {
            return query;
          },
          async maybeSingle() {
            assert.deepEqual(Object.keys(patch), ["reps"]);
            const result = await db.query(
              `update workout_exercises set reps=$1 where source_kit_item_id=$2 ${hasExpected ? "and reps is not distinct from $3" : ""} returning id,reps`,
              hasExpected
                ? [patch.reps, source, expected]
                : [patch.reps, source],
            );
            return { data: result.rows[0] || null, error: null };
          },
        };
        return query;
      },
    };
    const { WorkoutKitService } = loadTs("src/services/WorkoutKitService.ts", {
      "../lib/supabase/server": {
        createServiceClientSSR: async () => supabase,
      },
      "./AuditLogService": {},
      "./NotificationService": {},
    });
    await WorkoutKitService.setItemRepetitions(item, 12, initial.reps);
    await db.query("update workout_kit_items set order_index=3 where id=$1", [
      item,
    ]);
    const saved = (
      await db.query(
        "select id,reps,sets from workout_exercises where source_kit_item_id=$1",
        [item],
      )
    ).rows[0];
    assert.equal(saved.id, initial.id);
    assert.equal(saved.reps, "12");
    assert.equal(saved.sets, initial.sets);
    await assert.rejects(
      WorkoutKitService.setItemRepetitions(item, 15, initial.reps),
      /mudou/,
    );
    assert.equal(
      (
        await db.query("select reps from workout_exercises where id=$1", [
          saved.id,
        ])
      ).rows[0].reps,
      "12",
    );
    await assert.rejects(
      WorkoutKitService.setItemRepetitions(item, 2.5),
      /inteiras/,
    );
  } finally {
    await db.close();
  }
});
test("target actions authorize the owning coach before writes and validate a new exercise before inserting it", async () => {
  let writes = 0,
    creates = 0;
  const { saveKitItemRepetitionsAction, addWorkoutKitItemAction } = loadTs(
    "src/app/actions/workouts.ts",
    {
      "@/lib/auth/platform": {
        requireOwnedKitItem: async (item) => {
          if (item !== id) throw Error("Acesso negado");
          return { userId: "coach" };
        },
        requireOwnedPrescription: async () => ({ userId: "coach" }),
      },
      "@/lib/auth/access": { requireRole: async () => ({ userId: "coach" }) },
      "next/cache": { revalidatePath() {} },
      "@/services/WorkoutService": { WorkoutService: {} },
      "@/services/WorkoutKitService": {
        WorkoutKitService: {
          setItemRepetitions: async () => {
            writes++;
          },
          upsertKitItem: async () => {
            creates++;
            return { id };
          },
        },
      },
      "@/services/AuditLogService": {
        AuditLogService: { log: async () => true },
      },
      "@/lib/supabase/server": {},
    },
  );
  assert.equal(
    (await saveKitItemRepetitionsAction("other", 12)).success,
    false,
  );
  assert.equal(writes, 0);
  assert.equal((await saveKitItemRepetitionsAction(id, 12)).success, true);
  assert.equal(writes, 1);
  assert.equal(
    (
      await addWorkoutKitItemAction({
        kit_id: id,
        exercise_id: id,
        day_of_week: 1,
        target_reps: 0,
      })
    ).success,
    false,
  );
  assert.equal(creates, 0);
  assert.equal(
    (
      await addWorkoutKitItemAction({
        kit_id: id,
        exercise_id: id,
        day_of_week: 1,
        target_reps: 12,
      })
    ).success,
    true,
  );
  assert.equal(creates, 1);
  assert.equal(writes, 2);
});
