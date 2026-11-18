import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const {
  parseDietWrittenPlan,
  dietGuidanceForAssignments,
  DIET_PLAN_EXAMPLE_PT,
  DIET_PLAN_EXAMPLE_EN,
} = loadTs("src/lib/diet-written-plan.ts");
test("provided example keeps five meals, quantities, alternatives and conditional guidance", () => {
  const sections = parseDietWrittenPlan(DIET_PLAN_EXAMPLE_PT),
    meals = sections.filter((s) => s.kind === "meal");
  assert.equal(meals.length, 5);
  assert.equal(
    meals.reduce((sum, s) => sum + s.lines.length, 0),
    17,
  );
  assert(meals[0].lines.includes("2 ovos: aproximadamente 100 g sem casca"));
  assert(meals.at(-1).lines.includes("Peixe, frango ou carne magra: 170 g"));
  const notes = sections
    .filter((s) => s.kind === "notes")
    .flatMap((s) => s.lines)
    .join("\n");
  assert.match(notes, /Se ainda sentir fome/);
  assert.match(notes, /240 ml a cada 15–20 minutos/);
  assert.match(notes, /não para o dia inteiro/);
  assert.equal(
    parseDietWrittenPlan(DIET_PLAN_EXAMPLE_EN).filter((s) => s.kind === "meal")
      .length,
    5,
  );
});
test("parser preserves arbitrary guidance and handles markdown headings without evaluating markup", () => {
  const sections = parseDietWrittenPlan(
    "## Café da manhã\r\n* Ovos: 100 g\r\n\r\n**Almoço**\r\n- Frango: 150 g\r\nSe sentir fome, consulte suas orientações.",
  );
  assert.equal(sections.filter((s) => s.kind === "meal").length, 2);
  assert.equal(sections.at(-1).kind, "notes");
  const { DietWrittenPlan } = loadTs(
    "src/components/shared/DietWrittenPlan.tsx",
  );
  const html = renderToStaticMarkup(
    React.createElement(DietWrittenPlan, {
      text: "Orientações\n<script>alert(1)</script>",
      locale: "pt-BR",
    }),
  );
  assert(!html.includes("<script>"));
  assert(html.includes("&lt;script&gt;"));
});
test("guidance uses the provided assignments, preserves optional notes and has language fallback", () => {
  const assignments = [
    {
      id: "a",
      notes: "Orientação individual.",
      kit: {
        name_pt: "Plano",
        name_en: "Plan",
        description_pt: DIET_PLAN_EXAMPLE_PT,
        description_en: "",
      },
    },
    {
      id: "deleted",
      kit: { is_deleted: true, description_pt: "Must not appear" },
    },
  ];
  const result = dietGuidanceForAssignments(assignments, true);
  assert.equal(result.length, 1);
  assert.equal(result[0].assignmentId, "a");
  assert.equal(result[0].kit, "Plan");
  assert.match(result[0].text, /Café da manhã/);
  assert.match(result[0].text, /Orientação individual/);
  assert.deepEqual(dietGuidanceForAssignments([], false), []);
});
test("written plan persists through the existing diet-kit schema without inventing catalog items", () => {
  const { saveDietKitSchema } = loadTs("src/schemas/diets.ts");
  const value = saveDietKitSchema.parse({
    kit: {
      name_pt: "Plano diário",
      name_en: "Daily plan",
      description_pt: DIET_PLAN_EXAMPLE_PT,
      description_en: DIET_PLAN_EXAMPLE_EN,
    },
    items: [],
  });
  assert.equal(value.kit.description_pt, DIET_PLAN_EXAMPLE_PT);
  assert.equal(value.items.length, 0);
  assert(
    !saveDietKitSchema.safeParse({
      kit: { ...value.kit, description_pt: "x".repeat(30001) },
      items: [],
    }).success,
  );
});
