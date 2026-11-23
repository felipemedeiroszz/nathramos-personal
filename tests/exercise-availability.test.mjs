import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadTs } from "./load-ts.mjs";
const translations = JSON.parse(
  await readFile("src/data/exercise-portuguese.json", "utf8"),
);
const snapshot = JSON.parse(
  await readFile("src/data/exercise-catalog-fallback.json", "utf8"),
);
const mocks = {
  "../data/exercise-portuguese.json": translations,
  "../data/exercise-catalog-fallback.json": snapshot,
};
const { createExerciseRequestCache } = loadTs(
  "src/lib/exercise-request-cache.ts",
);
test("cache coalesces concurrent calls and reuses a successful public response", async () => {
  let calls = 0,
    finish;
  const cache = createExerciseRequestCache();
  const fetcher = () => {
    calls++;
    return new Promise((resolve) => (finish = resolve));
  };
  const a = cache.request("same", 300, fetcher),
    b = cache.request("same", 300, fetcher);
  assert.equal(calls, 1);
  finish({ ok: true, data: { success: true, data: [] } });
  assert.deepEqual(await a, await b);
  assert(
    (
      await cache.request("same", 300, () => {
        throw Error("cache miss");
      })
    ).cached,
  );
});
test("429 honors cooldown across queries and retains expired successful pages", async () => {
  let now = 0,
    calls = 0;
  const cache = createExerciseRequestCache(() => now);
  await cache.request("old", 1, async () => ({
    ok: true,
    data: { data: [1] },
  }));
  now = 2000;
  const fetcher = async () => {
    calls++;
    return { ok: false, code: "rate_limited", retryAfterSeconds: 120 };
  };
  const stale = await cache.request("old", 1, fetcher);
  assert(stale.cached);
  assert.deepEqual(stale.data.data, [1]);
  assert.equal((await cache.request("new", 1, fetcher)).code, "rate_limited");
  assert.equal(calls, 1);
  now += 121000;
  await cache.request("new", 1, fetcher);
  assert.equal(calls, 2);
});
test("local catalog supports filtered Portuguese search, cursor pages, details and options", () => {
  const { fallbackExercisePage, fallbackExercise, fallbackOptions } = loadTs(
    "src/lib/exercise-catalog-fallback.ts",
    mocks,
  );
  const first = fallbackExercisePage({ limit: 24 });
  assert.equal(first.total, 1324);
  assert.equal(first.availability, "offline");
  assert.equal(first.items.length, 24);
  const second = fallbackExercisePage({ limit: 24, after: first.nextCursor });
  assert(second.hasPreviousPage);
  assert(
    !first.items.some((a) =>
      second.items.some((b) => b.exerciseId === a.exerciseId),
    ),
  );
  const previous = fallbackExercisePage({
    limit: 24,
    before: second.previousCursor,
  });
  assert.deepEqual(previous.items, first.items);
  const filtered = fallbackExercisePage({
    name: "supino",
    equipments: "barbell",
    limit: 25,
  });
  assert(filtered.items.length);
  assert(
    filtered.items.every(
      (row) =>
        row.equipments.includes("barbell") && row.name.includes("bench press"),
    ),
  );
  assert(fallbackExercise(first.items[0].exerciseId).instructionsPt.length);
  assert.equal(fallbackExercise("invented-id"), null);
  assert(
    fallbackOptions("bodyParts").some((option) => option.name === "chest"),
  );
});
test("upstream 429 serves offline data with HTTP-success semantics and does not loop provider calls", async () => {
  const savedFetch = globalThis.fetch,
    savedCache = globalThis.__exerciseRequestCache;
  delete globalThis.__exerciseRequestCache;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { status: 429, headers: new Headers({ "retry-after": "120" }) };
  };
  try {
    const api = loadTs("src/lib/exercisedb.ts", mocks);
    const first = await api.listExercises({ limit: 24 });
    assert(first.ok);
    assert.equal(first.data.availability, "offline");
    assert.equal(first.data.items.length, 24);
    const second = await api.listExercises({ limit: 24, name: "supino" });
    assert(second.ok && second.data.items.length > 0);
    assert((await api.getExercise(first.data.items[0].exerciseId)).ok);
    assert((await api.listBodyParts()).ok);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = savedFetch;
    globalThis.__exerciseRequestCache = savedCache;
  }
});
test("provider 404 remains a not-found response, never an invented detail", async () => {
  const savedFetch = globalThis.fetch,
    savedCache = globalThis.__exerciseRequestCache;
  delete globalThis.__exerciseRequestCache;
  globalThis.fetch = async () => ({ status: 404 });
  try {
    const api = loadTs("src/lib/exercisedb.ts", mocks);
    assert.equal(
      (await api.getExercise(snapshot[0].exerciseId)).code,
      "not_found",
    );
  } finally {
    globalThis.fetch = savedFetch;
    globalThis.__exerciseRequestCache = savedCache;
  }
});
