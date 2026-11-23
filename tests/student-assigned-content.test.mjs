import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";
const { linkedAssignmentAvailability, sortAssignedContent } = loadTs(
  "src/lib/student/assigned-content.ts",
);
const date = "2026-11-23";
const base = {
  id: "current",
  student_id: "student",
  kit_id: "kit",
  status: "active",
  start_date: date,
  end_date: "2026-11-30",
  kit: {
    name_pt: "Kit atual",
    name_en: "Current kit",
    generated_program_id: "program",
  },
};
test("only a current assignment selected by today's scheduler unlocks; future, ended, paused and deleted remain visible and locked", () => {
  const selected = new Set(["current"]);
  assert.equal(linkedAssignmentAvailability(base, date, selected), "available");
  assert.equal(
    linkedAssignmentAvailability(
      { ...base, start_date: "2026-11-24" },
      date,
      selected,
    ),
    "scheduled",
  );
  assert.equal(
    linkedAssignmentAvailability(
      { ...base, start_date: "2026-11-01", end_date: "2026-11-22" },
      date,
      selected,
    ),
    "ended",
  );
  assert.equal(
    linkedAssignmentAvailability({ ...base, status: "paused" }, date, selected),
    "inactive",
  );
  assert.equal(
    linkedAssignmentAvailability(
      { ...base, kit: { is_deleted: true } },
      date,
      selected,
    ),
    "unavailable",
  );
  assert.equal(
    linkedAssignmentAvailability(base, date, new Set()),
    "not_today",
  );
  assert.equal(
    linkedAssignmentAvailability({ ...base, end_date: date }, date, selected),
    "available",
  );
});
function mockDb(tables) {
  const calls = [];
  return {
    calls,
    from(table) {
      let rows = [...(tables[table] || [])];
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          calls.push([table, key, value]);
          rows = rows.filter((row) => row[key] === value);
          return query;
        },
        in(key, values) {
          rows = rows.filter((row) => values.includes(row[key]));
          return query;
        },
        order() {
          return query;
        },
        range(start, end) {
          return Promise.resolve({
            data: rows.slice(start, end + 1),
            error: null,
          });
        },
        single() {
          return Promise.resolve({ data: rows[0], error: null });
        },
      };
      return query;
    },
  };
}
function serviceFor(tables) {
  const db = mockDb(tables);
  return {
    db,
    service: loadTs("src/services/StudentAssignedContentService.ts", {
      "server-only": {},
      "@/lib/supabase/server": { createServiceClientSSR: async () => db },
    }).StudentAssignedContentService,
  };
}
test("all own assignments survive pagination without leaking another student's links", async () => {
  const own = Array.from({ length: 502 }, (_, i) => ({
    ...base,
    id: `own-${i}`,
  }));
  const { db, service } = serviceFor({
    student_diet_kits: [
      ...own,
      { ...base, id: "foreign", student_id: "other" },
    ],
  });
  const rows = await service.list("student", "diet", {
    date,
    locale: "pt-BR",
    availableAssignmentIds: ["own-0"],
  });
  assert.equal(rows.length, 502);
  assert.equal((await service.counts("student")).diet, 502);
  assert(!rows.some((row) => row.id === "foreign"));
  assert.equal(rows[0].availability, "available");
  assert(
    db.calls.every(
      ([table, key, value]) =>
        table !== "student_diet_kits" ||
        (key === "student_id" && value === "student"),
    ),
  );
});
test("a direct request cannot start a workout that today's scheduler did not release", async () => {
  const { WorkoutService } = loadTs("src/services/WorkoutService.ts", {
    "@/lib/auth/platform": {},
    "../lib/supabase/server": {},
    "./StudentRoutineService": {},
    "./AuditLogService": { AuditLogService: {} },
  });
  WorkoutService.localToday = async () => ({ dateKey: date });
  WorkoutService.getTodayPlans = async () => [
    { day: { id: "today" }, program: { id: "program" } },
  ];
  WorkoutService.getSupabase = async () => {
    throw Error("A locked workout must never reach a write");
  };
  assert.equal(
    await WorkoutService.startSession("student", "future-day", "program"),
    null,
  );
  assert.equal(
    await WorkoutService.startSession(
      "student",
      "today",
      "program",
      "2026-11-24",
    ),
    null,
  );
});
test("the same workout kit scheduled in two periods never unlocks future days through a shared program ID", async () => {
  const { service } = serviceFor({
    student_workout_kits: [
      base,
      {
        ...base,
        id: "future",
        start_date: "2026-12-01",
        end_date: "2026-12-31",
      },
    ],
    workout_days: [
      {
        id: "monday",
        program_id: "program",
        name_pt: "Treino A",
        name_en: "Workout A",
        week_number: 1,
        day_of_week: 1,
        order_index: 0,
      },
      {
        id: "tuesday",
        program_id: "program",
        name_pt: "Treino B",
        name_en: "Workout B",
        week_number: 1,
        day_of_week: 2,
        order_index: 1,
      },
      {
        id: "week-two",
        program_id: "program",
        name_pt: "Próxima semana",
        name_en: "Next week",
        week_number: 2,
        day_of_week: 1,
        order_index: 2,
      },
    ],
  });
  const rows = await service.list("student", "workout", {
    date,
    locale: "pt-BR",
    availableAssignmentIds: ["current"],
    availableDays: [{ assignmentId: "current", dayId: "monday" }],
  });
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows[0].days.map((day) => day.available),
    [true, false, false],
  );
  assert(rows[1].days.every((day) => !day.available));
  assert.equal(rows[1].availability, "scheduled");
});
test("locked assignment controls have no navigation or executable action; only today's entries get anchors", () => {
  const { AssignedContentPanel } = loadTs(
    "src/components/student/AssignedContentPanel.tsx",
  );
  const items = [
    {
      id: "today",
      name: "Kit atual",
      startDate: date,
      endDate: null,
      availability: "available",
      days: [
        {
          id: "today-day",
          name: "Treino de hoje",
          week: 1,
          weekday: 1,
          available: true,
        },
        {
          id: "tomorrow-day",
          name: "Treino de amanhã",
          week: 1,
          weekday: 2,
          available: false,
        },
      ],
    },
    {
      id: "next",
      name: "Kit futuro",
      startDate: "2026-12-01",
      endDate: "2026-12-31",
      availability: "scheduled",
    },
  ];
  const html = renderToStaticMarkup(
    React.createElement(AssignedContentPanel, {
      items,
      locale: "pt-BR",
      kind: "workout",
    }),
  );
  assert(html.includes("Kit futuro"));
  assert(html.includes("01/12/2026"));
  assert(html.includes('href="#treino-dia-today-day"'));
  assert(!html.includes('href="#treino-dia-tomorrow-day"'));
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
});
