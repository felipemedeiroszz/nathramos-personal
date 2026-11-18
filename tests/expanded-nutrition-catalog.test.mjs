import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";
import {
  normalizeCatalogName,
  selectNewCatalogRows,
  validateCatalogManifest,
} from "../scripts/expand-nutrition-catalog.mjs";
const manifest = JSON.parse(
  await readFile("data/catalog/expanded-nutrition-2026-11.json", "utf8"),
);
test("catalog bundle validates against the actual food and supplement schemas", () => {
  validateCatalogManifest(manifest);
  const { upsertDietFoodSchema } = loadTs("src/schemas/diets.ts"),
    { upsertSupplementSchema } = loadTs("src/schemas/supplements.ts");
  assert.equal(manifest.diet_foods.length, 40);
  assert.equal(manifest.supplements.length, 10);
  for (const row of manifest.diet_foods) {
    assert(upsertDietFoodSchema.safeParse(row).success, row.name_pt);
    assert.equal(row.serving_size, 100);
    assert(row.protein_g + row.carbs_g + row.fats_g <= 105, row.name_pt);
  }
  for (const row of manifest.supplements) {
    assert(upsertSupplementSchema.safeParse(row).success, row.name_pt);
    assert.deepEqual(row.suggested_times_pt, []);
    assert.deepEqual(row.benefits_pt, []);
  }
});
test("duplicate detection preserves existing entries regardless of case, spaces or accents", () => {
  assert.equal(normalizeCatalogName("  Maçã-Fuji "), "macafuji");
  const candidate = manifest.diet_foods[0];
  assert.equal(
    selectNewCatalogRows(
      [candidate],
      [{ id: "custom", name_pt: " arroz INTEGRAL cozido " }],
    ).length,
    0,
  );
  assert.equal(
    selectNewCatalogRows(
      [candidate],
      [{ id: candidate.id, name_pt: "Custom name" }],
    ).length,
    0,
  );
  assert.equal(selectNewCatalogRows([candidate, candidate], []).length, 1);
});
test("repeatable SQL adds missing entries, leaves customized/inactive products untouched and audits additions", async () => {
  const db = await testDatabase();
  try {
    const sql = await readFile(
      "supabase/seeds/expanded_nutrition_catalog.sql",
      "utf8",
    );
    const custom = (
      await db.query(
        `insert into diet_foods(name_pt,name_en,calories_kcal,is_active) values(' arroz INTEGRAL cozido ','Custom rice',999,false) returning id`,
      )
    ).rows[0].id;
    const beforeFoods = (
        await db.query("select count(*)::int n from diet_foods")
      ).rows[0].n,
      beforeSupp = (await db.query("select count(*)::int n from supplements"))
        .rows[0].n;
    await db.exec(sql);
    const firstFoods = (
        await db.query("select count(*)::int n from diet_foods")
      ).rows[0].n,
      firstSupp = (await db.query("select count(*)::int n from supplements"))
        .rows[0].n;
    assert.equal(firstFoods, beforeFoods + 39);
    assert.equal(firstSupp, beforeSupp + 10);
    await db.exec(sql);
    assert.equal(
      (await db.query("select count(*)::int n from diet_foods")).rows[0].n,
      firstFoods,
    );
    assert.equal(
      (await db.query("select count(*)::int n from supplements")).rows[0].n,
      firstSupp,
    );
    const row = (
      await db.query(
        "select calories_kcal,is_active,name_en from diet_foods where id=$1",
        [custom],
      )
    ).rows[0];
    assert.equal(Number(row.calories_kcal), 999);
    assert.equal(row.is_active, false);
    assert.equal(row.name_en, "Custom rice");
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from audit_logs where action='catalog.expand'`,
        )
      ).rows[0].n,
      2,
    );
  } finally {
    await db.close();
  }
});
