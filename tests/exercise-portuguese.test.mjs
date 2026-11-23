import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";
import { exerciseTranslationPatch } from "../scripts/backfill-exercise-portuguese.mjs";
const entries = JSON.parse(
  await readFile("src/data/exercise-portuguese.json", "utf8"),
);
const jsonMock = {
  "../data/exercise-catalog-fallback.json": JSON.parse(
    await readFile("src/data/exercise-catalog-fallback.json", "utf8"),
  ),
  "../data/exercise-portuguese.json": entries,
  "../data/exercise-names-portuguese.json": entries,
};
const language = loadTs("src/lib/exercise-portuguese.ts", jsonMock);
const row = entries.find((item) => item.nameEn === "barbell bench press");
test("Portuguese labels survive an older API payload that lacks localized fields", () => {
  const { exerciseContent, exerciseTerm } = loadTs(
    "src/lib/exercise-language.ts",
    jsonMock,
  );
  for (const name of [
    "upward facing dog",
    "assisted hanging knee raise",
    "impossible dips",
    "push-up inside leg kick",
  ]) {
    const source = entries.find((entry) => entry.nameEn === name);
    const raw = { exerciseId: source.id, name, instructions: [] };
    assert.equal(exerciseContent(raw, "pt-BR").name, source.namePt);
    assert.equal(exerciseContent(raw, "en-US").name, name);
  }
  assert.equal(exerciseTerm("back", "pt-BR"), "Costas");
  assert.equal(exerciseTerm("upper arms", "pt-BR"), "Braços");
});
test("local bundle includes unique IDs and Portuguese names/instructions without media", () => {
  assert.equal(entries.length, 1324);
  assert.equal(new Set(entries.map((item) => item.id)).size, entries.length);
  for (const item of entries) {
    assert(item.namePt.trim());
    assert.notEqual(item.namePt, item.nameEn);
    assert(item.instructionsPt.length >= 2);
    assert(
      item.instructionsPt.every(
        (step) => typeof step === "string" && step.trim(),
      ),
    );
    assert(!("gifUrl" in item));
  }
  assert(language.portugueseExercise(row.id, "renamed by provider"));
  assert.match(row.instructionsPt[1], /pegada pronada/);
  assert(!row.instructionsPt[1].includes("palmas para cima"));
  assert(
    language.portugueseExercise("new-id", "Machine Narrow Grip Seated Row"),
  );
  assert.equal(
    language.portugueseExercise("unknown", "Unknown new movement"),
    null,
  );
});
test("Portuguese and English searches preserve the provider language and filter contract", () => {
  assert.equal(language.englishExerciseSearch("supino"), "bench press");
  assert.equal(language.englishExerciseSearch("remada"), "row");
  assert.equal(
    language.englishExerciseSearch("elevação lateral"),
    "lateral raise",
  );
  assert.equal(
    language.englishExerciseSearch("dumbbell curl"),
    "dumbbell curl",
  );
  assert.equal(language.englishExerciseSearch(row.namePt), row.nameEn);
});
test("existing imports translate only copied English or missing fields and preserve manual locks", () => {
  const existing = {
    external_id: row.id,
    name_en: row.nameEn,
    name_pt: row.nameEn,
    instructions_en: ["Original"],
    instructions_pt: ["Original"],
    translation_locked: false,
  };
  assert.deepEqual(language.untranslatedExerciseFields(existing), {
    name_pt: row.namePt,
    instructions_pt: row.instructionsPt,
  });
  assert.deepEqual(
    exerciseTranslationPatch(existing),
    language.untranslatedExerciseFields(existing),
  );
  assert.deepEqual(
    language.untranslatedExerciseFields({
      ...existing,
      translation_locked: true,
    }),
    {},
  );
  assert.deepEqual(
    exerciseTranslationPatch({ ...existing, translation_locked: true }),
    {},
  );
  assert.deepEqual(
    language.untranslatedExerciseFields({
      ...existing,
      name_pt: "Meu supino",
      instructions_pt: ["Minha orientação"],
    }),
    {},
  );
});
test("live API normalization retains English fields, adds Portuguese and translates search upstream", async () => {
  const before = globalThis.fetch;
  let requested;
  globalThis.fetch = async (url) => {
    requested = new URL(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
          {
            exerciseId: row.id,
            name: row.nameEn,
            instructions: ["Step:1 English instruction"],
            bodyParts: ["chest"],
            equipments: ["barbell"],
            targetMuscles: ["pectorals"],
          },
        ],
        meta: { total: 1 },
      }),
    };
  };
  try {
    const { listExercises } = loadTs("src/lib/exercisedb.ts", jsonMock);
    const result = await listExercises({
      name: "supino",
      bodyParts: "chest",
      limit: 24,
    });
    assert(result.ok);
    assert.equal(requested.searchParams.get("name"), "bench press");
    assert.equal(requested.searchParams.get("bodyParts"), "chest");
    assert.equal(result.data.items[0].name, row.nameEn);
    assert.equal(result.data.items[0].namePt, row.namePt);
    assert.deepEqual(result.data.items[0].instructions, [
      "English instruction",
    ]);
    assert.deepEqual(result.data.items[0].instructionsPt, row.instructionsPt);
  } finally {
    globalThis.fetch = before;
  }
});
test("catalog SSR translates card and filter labels in Portuguese while keeping API option values", () => {
  for (const locale of ["pt-BR", "en"]) {
    const { ExerciseCatalogClient } = loadTs(
      "src/app/[locale]/admin/treinos/ExerciseCatalogClient.tsx",
      {
        ...jsonMock,
        "next-intl": {
          useLocale: () => locale,
          useTranslations: () => (key) => key,
        },
      },
    );
    const html = renderToStaticMarkup(
      React.createElement(ExerciseCatalogClient, {
        initialItems: [
          {
            exerciseId: row.id,
            name: row.nameEn,
            namePt: row.namePt,
            instructions: [],
            instructionsPt: row.instructionsPt,
            bodyParts: ["chest"],
            equipments: ["barbell"],
            targetMuscles: ["pectorals"],
            secondaryMuscles: [],
            gifUrl: null,
          },
        ],
        initialMeta: { total: 1, hasNextPage: false },
        initialError: null,
        bodyParts: ["chest"],
        muscles: ["pectorals"],
        equipments: ["barbell"],
      }),
    );
    assert(html.includes('value="chest"'));
    assert(html.includes(locale === "pt-BR" ? row.namePt : row.nameEn));
    assert(html.includes(locale === "pt-BR" ? "Peito" : "chest"));
    assert(html.includes(locale === "pt-BR" ? "Peitorais" : "pectorals"));
  }
});

test("adding an API exercise to a kit persists Portuguese and retains manually locked imports", async () => {
  let payload;
  let existing = null;
  const db = {
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      maybeSingle: async () => ({ data: existing, error: null }),
      insert(value) {
        payload = value;
        return {
          select: () => ({
            single: async () => ({
              data: { id: "new", ...value },
              error: null,
            }),
          }),
        };
      },
    }),
  };
  const { ExerciseDBService } = loadTs("src/services/ExerciseDBService.ts", {
    ...jsonMock,
    "../lib/supabase/server": { createServiceClientSSR: async () => db },
    "./AuditLogService": { AuditLogService: {} },
  });
  const api = {
    exerciseId: row.id,
    name: row.nameEn,
    instructions: ["English step"],
    bodyParts: ["chest"],
    targetMuscles: ["pectorals"],
    secondaryMuscles: [],
    equipments: ["barbell"],
    gifUrl: null,
  };
  assert(await ExerciseDBService.ensureFromApiExercise(api));
  assert.equal(payload.name_pt, row.namePt);
  assert.equal(payload.name_en, row.nameEn);
  assert.deepEqual(payload.instructions_pt, row.instructionsPt);
  assert.deepEqual(payload.instructions_en, ["English step"]);
  existing = {
    id: "existing",
    name_en: row.nameEn,
    name_pt: "Minha versão",
    instructions_pt: ["Meu texto"],
    instructions_en: ["Original"],
    translation_locked: true,
    external_id: row.id,
  };
  payload = null;
  assert.deepEqual(
    await ExerciseDBService.ensureFromApiExercise(api),
    existing,
  );
  assert.equal(payload, null);
});
