// Local UI fixtures: no production calls, credentials or student data.
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/daily-planning-ui");
await mkdir(out, { recursive: true });
const rule = {
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  on_date: null,
  condition: "all",
  alternative_group: "dieta-principal",
  priority: 0,
  notes: "",
  repeat_cycle: false,
  fallback_week_one: false,
  rest_weekdays: [],
  items: {},
};
const itemId = "00000000-0000-4000-8000-000000000004";
const dietItem = {
  key: "meal",
  kind: "diet",
  assignmentId: "00000000-0000-4000-8000-000000000001",
  itemId,
  kit: "Plano alimentar",
  name: "Aveia com frutas",
  quantity: 100,
  unit: "g",
  slot: "08:00",
  mealType: "breakfast",
  notes: "Orientação individual da sua treinadora.",
  done: false,
  foodId: "food",
  nutrition: { calories_kcal: 200, protein_g: 10, carbs_g: 20, fats_g: 5 },
};
const initial = {
  data: {
    date: "2026-11-03",
    weekStart: "2026-11-02",
    timezone: "America/Sao_Paulo",
    firstName: "Mariana",
    locale: "pt-BR",
    diet: [dietItem],
    supplements: [],
    plannedNutrition: dietItem.nutrition,
    consumedNutrition: {
      calories_kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    },
    water: [],
    waterTotal: 0,
    waterGoal: 2000,
    hydrationReminders: true,
    hydrationSilent: true,
    hydrationFrequency: 60,
    quietStart: null,
    quietEnd: null,
    shopping: [],
    sleep: [],
    weight: [],
    logs: [],
    workoutState: "rest",
    workoutNotes: "Recuperação programada.",
    workouts: [],
    prescriptionStatus: "current",
  },
  assignments: [
    {
      id: dietItem.assignmentId,
      kind: "diet",
      name: "Plano alimentar",
      start: "2026-11-01",
      end: null,
      notes: "Orientação do vínculo",
      rule,
      revision: 0,
      items: [
        {
          id: itemId,
          name: "Aveia com frutas",
          quantity: 100,
          unit: "g",
          slots: ["08:00"],
        },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      kind: "workout",
      name: "Treino de perna",
      start: "2026-11-01",
      end: null,
      notes: "",
      rule: { ...rule, alternative_group: null },
      revision: 0,
      items: [],
    },
  ],
  history: [],
  ruleVersions: [],
};
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {NextIntlClientProvider} from 'next-intl';import pt from './src/messages/pt-BR.json';import en from './src/messages/en-US.json';import {DailyPlanningClient} from './src/components/admin/student/DailyPlanningClient';window.__fixture=${JSON.stringify(initial)};const locale=new URLSearchParams(location.search).get('locale')||'pt-BR';createRoot(document.getElementById('root')).render(<NextIntlClientProvider locale={locale} messages={locale==='en-US'?en:pt} timeZone="America/Sao_Paulo"><main className="mx-auto max-w-5xl p-4"><DailyPlanningClient studentId="00000000-0000-4000-8000-000000000009" initial={window.__fixture}/></main></NextIntlClientProvider>);`;
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  jsx: "automatic",
  outfile: resolve(out, "app.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "fixtures",
      setup(b) {
        b.onResolve({ filter: /^next\/(navigation|link)$/ }, (a) => ({
          path: a.path,
          namespace: "stub",
        }));
        b.onResolve({ filter: /^@\/app\/actions\// }, (a) => ({
          path: a.path,
          namespace: "stub",
        }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
          loader: "tsx",
          resolveDir: process.cwd(),
          contents:
            a.path === "next/navigation"
              ? `export const useRouter=()=>({refresh(){}});export const useParams=()=>({locale:new URLSearchParams(location.search).get('locale')||'pt-BR'});export const usePathname=()=>'/pt-BR/admin/alunos/fixture';export const useSearchParams=()=>new URLSearchParams();`
              : a.path === "next/link"
                ? `import React from 'react';export default function Link(p){return <a {...p}/>}`
                : a.path.endsWith("dailyPlanning")
                  ? `export async function previewDailyPlanningAction(id,date){const f=structuredClone(window.__fixture);f.data.date=date;f.data.prescriptionStatus=date>'2026-11-03'?'preview':'current';return {success:true,planning:f}}export async function saveDailyPlanningAction(input){window.__saved=input;const a=window.__fixture.assignments.find(a=>a.id===input.assignmentId);a.rule=input.rule;a.revision++;return {success:true}}`
                  : `export async function recordHealthAction(){return {success:true}}export async function saveHydrationAction(){return {success:true}}export async function setRoutineItemAction(){return {success:true}}export async function setShoppingAction(){return {success:true}}export async function waterAction(){return {success:true}}`,
        }));
      },
    },
  ],
});
execFileSync(
  process.execPath,
  [
    "node_modules/tailwindcss/lib/cli.js",
    "-i",
    "src/app/globals.css",
    "-o",
    resolve(out, "base.css"),
    "--minify",
  ],
  { stdio: "pipe" },
);
await writeFile(
  resolve(out, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="base.css"></head><body style="font-family:Arial"><div id="root"></div><script src="app.js"></script></body></html>',
);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [390, 1440])
    for (const locale of ["pt-BR", "en-US"]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (e) => {
        errors.push(e.message);
        console.error(e.message);
      });
      page.setDefaultTimeout(8000);
      await page.goto(
        "file:///" +
          resolve(out, "index.html").replaceAll("\\", "/") +
          "?locale=" +
          locale,
      );
      await page
        .locator("h2")
        .first()
        .waitFor()
        .catch(async (e) => {
          console.error(await page.locator("body").innerText());
          await page.screenshot({ path: resolve(out, "failure.png") });
          throw e;
        });
      const editor = page
        .locator("details")
        .filter({
          has: page.locator("summary").filter({ hasText: "Plano alimentar" }),
        })
        .first();
      await editor.locator("summary").click();
      const qty = editor.locator("input[type=number]").last();
      await qty.fill("150");
      await editor
        .locator('input[placeholder="08:00, 18:00"]')
        .fill("09:00, 18:00");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await editor.screenshot({
        path: resolve(out, `editor-${locale}-${width}.png`),
      });
      await editor.locator("button[type=submit]").click();
      await page.waitForFunction(() => !!window.__saved);
      const saved = await page.evaluate(() => window.__saved);
      assert.equal(saved.rule.items[itemId].quantity, 150);
      assert.deepEqual(saved.rule.items[itemId].slots, ["09:00", "18:00"]);
      await editor.locator("summary").click();
      await page.locator("input[type=date]").first().fill("2026-11-09");
      await page.locator("form").first().locator("button").click();
      await page.waitForFunction(() =>
        document.body.innerText.includes("2026-11-09"),
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: resolve(out, `planning-${locale}-${width}.png`),
        fullPage: true,
      });
      await page.close();
    }
  console.log(
    "Daily planning UI: 4 desktop/mobile and PT/EN scenarios passed.",
  );
} finally {
  await browser.close();
}
