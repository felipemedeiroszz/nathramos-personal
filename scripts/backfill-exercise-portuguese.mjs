import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
const translations = JSON.parse(
  await readFile(
    new URL("../src/data/exercise-portuguese.json", import.meta.url),
    "utf8",
  ),
);
const normalized = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
export function exerciseTranslationPatch(row) {
  if (row.translation_locked) return {};
  const found =
    translations.find((item) => item.id === row.external_id) ||
    translations.find(
      (item) => normalized(item.nameEn) === normalized(row.name_en),
    );
  if (!found) return {};
  const patch = {};
  if (!row.name_pt?.trim() || row.name_pt.trim() === row.name_en.trim())
    patch.name_pt = found.namePt;
  if (
    !row.instructions_pt?.length ||
    JSON.stringify(row.instructions_pt) === JSON.stringify(row.instructions_en)
  )
    patch.instructions_pt = found.instructionsPt;
  return patch;
}
async function main() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw Error("Supabase environment required");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db
      .from("exercises")
      .select(
        "id,external_id,name_en,name_pt,instructions_en,instructions_pt,translation_locked,updated_at",
      )
      .eq("source", "exercisedb")
      .eq("is_deleted", false)
      .order("id")
      .range(start, start + 999);
    if (error) throw Error(`Read exercises: ${error.code}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const pending = rows
    .map((row) => ({ row, patch: exerciseTranslationPatch(row) }))
    .filter((item) => Object.keys(item.patch).length);
  console.log(
    JSON.stringify({
      mode: process.argv.includes("--apply") ? "apply" : "dry-run",
      imported: rows.length,
      pending: pending.length,
      locked: rows.filter((row) => row.translation_locked).length,
    }),
  );
  if (!process.argv.includes("--apply")) return;
  let updated = 0;
  for (const { row, patch } of pending) {
    const { data, error } = await db
      .from("exercises")
      .update(patch)
      .eq("id", row.id)
      .eq("translation_locked", false)
      .eq("updated_at", row.updated_at)
      .select("id,name_pt,instructions_pt")
      .maybeSingle();
    if (error) throw Error(`Update exercise: ${error.code}`);
    if (!data)
      throw Error(
        "Exercise changed concurrently; rerun after reviewing changes",
      );
    for (const key of Object.keys(patch))
      if (JSON.stringify(data[key]) !== JSON.stringify(patch[key]))
        throw Error("Translation verification failed");
    updated++;
    const audit = await db
      .from("audit_logs")
      .insert({
        table_name: "exercises",
        operation: "UPDATE",
        action: "exercise.translate_pt",
        entity_type: "exercises",
        entity_id: row.id,
        details: {
          fields: Object.keys(patch),
          bundle: "exercise-portuguese-2026-11",
        },
      });
    if (audit.error)
      throw Error(`Translation saved, audit failed: ${audit.error.code}`);
  }
  console.log(JSON.stringify({ updated, verified: updated }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
