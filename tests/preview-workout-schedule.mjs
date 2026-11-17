import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  out = resolve("artifacts/workout-schedule");
await mkdir(out, { recursive: true });
const kits = [
  {
    id: "80000000-0000-4000-8000-000000000002",
    name_pt: "Kit hipertrofia",
    name_en: "Hypertrophy kit",
  },
  {
    id: "80000000-0000-4000-8000-000000000003",
    name_pt: "Kit condicionamento",
    name_en: "Conditioning kit",
  },
];
await build({
  stdin: {
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{WorkoutScheduleModal}from${JSON.stringify(resolve("src/components/admin/workout/WorkoutScheduleModal.tsx"))};window.__calls=[];const params=new URLSearchParams(location.search);function App(){const[open,setOpen]=useState(true);return open?<WorkoutScheduleModal studentId="80000000-0000-4000-8000-000000000001" kits={${JSON.stringify(kits)}} locale={params.get('locale')||'pt-BR'} today="2026-11-17" nextStart="2026-11-17" edit={params.has('edit')?{id:'80000000-0000-4000-8000-000000000004',kit_id:'80000000-0000-4000-8000-000000000002',start_date:'2026-11-01',end_date:'2026-11-30'}:undefined} onClose={()=>setOpen(false)}/>:<p role="status">Saved</p>}createRoot(document.getElementById('root')).render(<App/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: join(out, "app.js"),
  bundle: true,
  platform: "browser",
  jsx: "automatic",
  alias: {
    react: resolve("node_modules/next/dist/compiled/react"),
    "react-dom": resolve("node_modules/next/dist/compiled/react-dom"),
  },
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "fixtures",
      setup(b) {
        b.onResolve(
          { filter: /^(next\/navigation|@\/app\/actions\/workouts)$/ },
          (a) => ({ path: a.path, namespace: "mock" }),
        );
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
          contents:
            a.path === "next/navigation"
              ? "export const useRouter=()=>({refresh(){}})"
              : "export async function scheduleWorkoutKitsAction(input){window.__calls.push(input);return await new Promise(resolve=>window.__finish=resolve)}",
          loader: "js",
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
    join(out, "base.css"),
    "--minify",
  ],
  { stdio: "pipe" },
);
const server = createServer(async (req, res) => {
  if (req.url === "/app.js" || req.url === "/base.css") {
    res.setHeader(
      "Content-Type",
      req.url.endsWith(".js") ? "application/javascript" : "text/css",
    );
    res.end(await readFile(join(out, req.url.slice(1))));
    return;
  }
  res.end(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><style>body{background:#0b0c0e;color:#eee;font-family:Arial}html{color-scheme:dark}</style><div id="root"></div><script src="/app.js"></script>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch({ headless: true, channel: "chrome" });
function add(days) {
  const d = new Date("2026-11-17T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const en = locale === "en-US",
        page = await browser.newPage({ viewport: { width, height: 1000 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/?locale=" + locale);
      for (let i = 0; i < 6; i++) {
        await page
          .locator(`select[name="kit-${i}"]`)
          .selectOption(kits[i % 2].id);
        assert.equal(
          await page.locator(`input[name="start-${i}"]`).inputValue(),
          add(i * 7),
        );
        await page.locator(`input[name="end-${i}"]`).fill(add(i * 7 + 6));
        if (i < 5)
          await page
            .getByRole("button", {
              name: en ? /Add next kit/ : /Adicionar próximo kit/,
            })
            .click();
      }
      assert.equal(
        await page
          .getByRole("button", {
            name: en ? /Add next kit/ : /Adicionar próximo kit/,
          })
          .count(),
        0,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: join(out, `schedule-${locale}-${width}.png`),
        fullPage: true,
      });
      await page
        .getByRole("button", {
          name: en ? "Save sequence" : "Salvar sequência",
          exact: true,
        })
        .click();
      await page.waitForFunction(() => window.__calls.length === 1);
      await page.waitForFunction(
        () => document.querySelector("fieldset").disabled,
      );
      await page.evaluate(() =>
        window.__finish({ success: false, message: "Erro de teste" }),
      );
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page.locator('input[name="end-5"]').inputValue(),
        add(41),
      );
      await page
        .getByRole("button", {
          name: en ? "Save sequence" : "Salvar sequência",
          exact: true,
        })
        .click();
      await page.waitForFunction(() => window.__calls.length === 2);
      assert.equal(
        await page.evaluate(() => window.__calls[1].entries.length),
        6,
      );
      await page.evaluate(() => window.__finish({ success: true }));
      await page.getByRole("status").waitFor();
      await page.goto(origin + "/?edit=1&locale=" + locale);
      assert.equal(
        await page.locator('input[name="start-0"]').getAttribute("readonly"),
        "",
      );
      assert.equal(
        await page.locator('select[name="kit-0"]').isDisabled(),
        true,
      );
      await page.locator('input[name="end-0"]').fill("2026-12-01");
      await page
        .getByRole("button", {
          name: en ? "Save period" : "Salvar período",
          exact: true,
        })
        .click();
      await page.waitForFunction(() => window.__calls.length === 1);
      assert.equal(
        await page.evaluate(() => window.__calls[0].assignment_id),
        "80000000-0000-4000-8000-000000000004",
      );
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `Programação ${locale} ${width}: seis kits, sequência de datas, erro preserva dados, salvamento e edição OK`,
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
