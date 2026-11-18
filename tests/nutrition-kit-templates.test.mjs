import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";
import {
  buildNutritionKits,
  missingKits,
} from "../scripts/create-nutrition-kits.mjs";

test("kit duplicate detection preserves customized, deleted and unpublished entries", () => {
  const candidate = { kit: { slug: "unique", name_pt: "Kit Proteína" } };
  assert.equal(
    missingKits(
      [candidate],
      [{ slug: "unique", name_pt: "Customized", is_deleted: true }],
    ).length,
    0,
  );
  assert.equal(
    missingKits(
      [candidate],
      [{ slug: "other", name_pt: " kit proteina ", is_published: false }],
    ).length,
    0,
  );
  assert.equal(missingKits([candidate], []).length, 1);
});

test("twenty complete kit templates save atomically with audit, preserve existing kits and never assign students", async () => {
  const db = await testDatabase();
  try {
    await db.exec(
      await readFile("supabase/seeds/expanded_nutrition_catalog.sql", "utf8"),
    );
    const kits = buildNutritionKits(
      (await db.query("select * from diet_foods")).rows,
      (await db.query("select * from supplements")).rows,
    );
    const { saveDietKitSchema } = loadTs("src/schemas/diets.ts");
    const { saveSupplementKitSchema } = loadTs("src/schemas/supplements.ts");
    const { parseDietWrittenPlan } = loadTs("src/lib/diet-written-plan.ts");
    assert.equal(kits.filter((k) => k.kind === "diet").length, 10);
    assert.equal(kits.filter((k) => k.kind === "supplement").length, 10);
    assert.equal(new Set(kits.map((k) => k.kit.slug)).size, 20);
    const beforeDiet = (await db.query("select * from diet_kits order by id"))
      .rows;
    const beforeSupp = (
      await db.query("select * from supplement_kits order by id")
    ).rows;
    const assignmentsBefore = (
      await db.query(
        "select (select count(*) from student_diet_kits)::int d, (select count(*) from student_supplement_kits)::int s",
      )
    ).rows;
    for (const kit of kits) {
      const parsed = (
        kit.kind === "diet" ? saveDietKitSchema : saveSupplementKitSchema
      ).safeParse(kit);
      assert(parsed.success, parsed.error?.message);
      if (kit.kind === "diet") {
        assert.equal(new Set(kit.items.map((i) => i.meal_type)).size, 5);
        assert(kit.items.length >= 15);
        for (const language of ["pt", "en"])
          assert.equal(
            parseDietWrittenPlan(kit.kit[`description_${language}`]).filter(
              (s) => s.kind === "meal",
            ).length,
            5,
          );
      } else {
        assert.equal(kit.items.length, 1);
        assert(kit.items[0].dosage > 0);
        assert.deepEqual(kit.items[0].times_of_day, []);
      }
      const result = await db.query(
        "select admin_save_content_kit($1,$2::jsonb,$3::jsonb,$4::uuid) saved",
        [
          kit.kind,
          JSON.stringify(kit.kit),
          JSON.stringify(kit.items),
          "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
        ],
      );
      const saved = result.rows[0].saved;
      assert(saved.id);
      const table =
        kit.kind === "diet" ? "diet_kit_items" : "supplement_kit_items";
      assert.equal(
        (
          await db.query(
            `select count(*)::int n from ${table} where kit_id=$1`,
            [saved.id],
          )
        ).rows[0].n,
        kit.items.length,
      );
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from audit_logs where entity_id=$1 and action=$2",
            [saved.id, `${kit.kind}_kit.save`],
          )
        ).rows[0].n,
        1,
      );
    }
    for (const [table, before, kind] of [
      ["diet_kits", beforeDiet, "diet"],
      ["supplement_kits", beforeSupp, "supplement"],
    ]) {
      const rows = (await db.query(`select * from ${table} order by id`)).rows;
      assert.equal(rows.length, before.length + 10);
      assert.equal(
        missingKits(
          kits.filter((k) => k.kind === kind),
          rows,
        ).length,
        0,
      );
      assert.deepEqual(
        rows.filter((row) => before.some((old) => old.id === row.id)),
        before,
      );
    }
    assert.deepEqual(
      (
        await db.query(
          "select (select count(*) from student_diet_kits)::int d, (select count(*) from student_supplement_kits)::int s",
        )
      ).rows,
      assignmentsBefore,
    );
    // Failure on an item rolls back its parent rather than leaving a blank kit.
    await assert.rejects(
      db.query(
        "select admin_save_content_kit('diet',$1::jsonb,$2::jsonb,$3::uuid)",
        [
          JSON.stringify({ ...kits[0].kit, slug: "invalid-template" }),
          JSON.stringify([
            {
              ...kits[0].items[0],
              food_id: "00000000-0000-4000-8000-000000000099",
            },
          ]),
          "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
        ],
      ),
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from diet_kits where slug='invalid-template'",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
