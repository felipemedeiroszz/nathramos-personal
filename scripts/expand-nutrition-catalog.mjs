import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
export function normalizeCatalogName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
export function selectNewCatalogRows(candidates, existing) {
  const ids = new Set(existing.map((row) => row.id)),
    names = new Set(existing.map((row) => normalizeCatalogName(row.name_pt)));
  return candidates.filter((row) => {
    const name = normalizeCatalogName(row.name_pt);
    if (ids.has(row.id) || names.has(name)) return false;
    ids.add(row.id);
    names.add(name);
    return true;
  });
}
export function validateCatalogManifest(manifest) {
  for (const table of ["diet_foods", "supplements"]) {
    if (!Array.isArray(manifest[table])) throw Error("Invalid catalog bundle");
    const names = new Set();
    for (const row of manifest[table]) {
      const key = normalizeCatalogName(row.name_pt || "");
      if (
        !key ||
        names.has(key) ||
        !row.id ||
        !row.name_en ||
        !row.category_pt ||
        !row.category_en ||
        !row.description_pt?.includes("https://") ||
        !(row.serving_size > 0) ||
        row.serving_unit !== "g"
      )
        throw Error("Invalid or duplicate catalog entry");
      names.add(key);
      if (table === "diet_foods") {
        for (const key of [
          "calories_kcal",
          "protein_g",
          "carbs_g",
          "fats_g",
          "fiber_g",
        ])
          if (!Number.isFinite(row[key]) || row[key] < 0)
            throw Error("Invalid nutrition value");
        if (row.serving_size !== 100)
          throw Error("Foods must use a 100 g reference");
      } else if (
        row.suggested_times_pt.length ||
        row.suggested_times_en.length ||
        row.benefits_pt.length ||
        row.benefits_en.length
      )
        throw Error(
          "This bundle must not prescribe schedules or health claims",
        );
    }
  }
}
async function existingRows(db, table) {
  let result = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from(table)
      .select("id,name_pt,brand")
      .order("id")
      .range(offset, offset + 999);
    if (error)
      throw Error(`Unable to read ${table}: ${error.code || "database error"}`);
    result.push(...data);
    if (data.length < 1000) return result;
  }
}
async function main() {
  const manifest = JSON.parse(
    await readFile(
      new URL(
        "../data/catalog/expanded-nutrition-2026-11.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  validateCatalogManifest(manifest);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const plans = [];
  for (const table of ["diet_foods", "supplements"]) {
    const existing = await existingRows(db, table),
      rows = selectNewCatalogRows(manifest[table], existing);
    plans.push({ table, rows, existing: existing.length });
  }
  const apply = process.argv.includes("--apply");
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      plans: plans.map((p) => ({
        table: p.table,
        existing: p.existing,
        toCreate: p.rows.length,
        names: p.rows.map((r) => r.name_pt),
      })),
    }),
  );
  if (!apply) return;
  for (const plan of plans) {
    if (!plan.rows.length) continue;
    const { data, error } = await db
      .from(plan.table)
      .insert(plan.rows)
      .select("id");
    if (error)
      throw Error(
        `Insert failed for ${plan.table}: ${error.code || "database error"}`,
      );
    const { error: auditError } = await db
      .from("audit_logs")
      .insert({
        table_name: plan.table,
        operation: "INSERT",
        action: "catalog.expand",
        entity_type: plan.table,
        details: {
          bundle: "expanded-nutrition-2026-11",
          created: data.length,
          ids: data.map((row) => row.id),
        },
      });
    if (auditError)
      throw Error(
        `${plan.table}: ${data.length} entries were created but audit registration failed: ${auditError.code || "database error"}`,
      );
    console.log(JSON.stringify({ table: plan.table, created: data.length }));
  }
  for (const plan of plans) {
    const rows = await existingRows(db, plan.table);
    console.log(
      JSON.stringify({
        table: plan.table,
        total: rows.length,
        remaining: selectNewCatalogRows(manifest[plan.table], rows).length,
      }),
    );
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
