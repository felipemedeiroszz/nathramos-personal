import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/kit-repetitions");
await mkdir(out, { recursive: true });
const messages = {};
for (const locale of ["pt-BR", "en-US"])
  messages[locale] = JSON.parse(
    await readFile(`src/messages/${locale}.json`, "utf8"),
  ).common;
await build({
  stdin: {
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import{KitItemUpsertModal}from${JSON.stringify(resolve("src/components/admin/workout/KitItemUpsertModal.tsx"))};import{KitRepetitionsField}from${JSON.stringify(resolve("src/components/admin/workout/KitRepetitionsField.tsx"))};const locale=new URLSearchParams(location.search).get('locale')||'pt-BR';window.__calls=[];window.fetch=async()=>new Response(JSON.stringify({items:[{exerciseId:'api-example',name:'barbell bench press',bodyParts:['chest'],targetMuscles:['pectorals'],secondaryMuscles:[],equipments:['barbell'],instructions:[],gifUrl:null}]}),{status:200});function App(){const[done,setDone]=useState(false),[value,setValue]=useState('12');return <NextIntlClientProvider locale={locale} messages={{common:${JSON.stringify(messages)}[locale]}} timeZone="America/Sao_Paulo"><div className="admin-shell">{done?<KitRepetitionsField itemId="00000000-0000-4000-8000-000000000001" value={value} locale={locale} onSaved={()=>setValue(String(window.__calls.at(-1).repetitions))}/>:<KitItemUpsertModal isOpen onClose={()=>{}} onSaved={()=>setDone(true)} kitId="00000000-0000-4000-8000-000000000001" nextOrder={0} programOptions={[]} exerciseOptions={[{id:'00000000-0000-4000-8000-000000000002',name_pt:'Agachamento',name_en:'Squat',primary_muscle:'quads',source:'custom'}]}/>}</div></NextIntlClientProvider>}createRoot(document.getElementById('root')).render(<App/>);`,
    loader: "tsx",
    resolveDir: process.cwd(),
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
      name: "actions",
      setup(b) {
        b.onResolve({ filter: /^@\/app\/actions\/workouts$/ }, (a) => ({
          path: a.path,
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents:
            "export async function addWorkoutKitItemAction(input){window.__calls.push({kind:'add',input});return{success:true}}export async function saveKitItemRepetitionsAction(itemId,repetitions,expected){window.__calls.push({kind:'edit',itemId,repetitions,expected});return window.__fail?{success:false,message:'Concurrent save test error'}:{success:true}}",
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
  if (["/app.js", "/base.css"].includes(req.url)) {
    res.setHeader(
      "Content-Type",
      req.url.endsWith(".js") ? "application/javascript" : "text/css",
    );
    res.end(await readFile(join(out, req.url.slice(1))));
  } else
    res.end(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><style>body{background:#111;color:#eee;font-family:Arial}</style><div id="root"></div><script src="/app.js"></script>',
    );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const source of ["catalog", "api"])
    for (const locale of ["pt-BR", "en-US"])
      for (const width of [390, 1440]) {
        const page = await browser.newPage({
            viewport: { width, height: 1100 },
          }),
          errors = [],
          en = locale === "en-US";
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(
          `http://127.0.0.1:${server.address().port}/?locale=${locale}`,
        );
        await page
          .getByRole("button", {
            name:
              source === "catalog"
                ? en
                  ? "Saved exercises"
                  : "Exercícios cadastrados"
                : en
                  ? "Catalog (API)"
                  : "Catálogo (API)",
            exact: true,
          })
          .click();
        await page
          .getByLabel(en ? "Day of week" : "Dia da semana", { exact: true })
          .selectOption("1");
        if (source === "catalog")
          await page
            .getByLabel(en ? "Exercise" : "Exercício", { exact: true })
            .selectOption("00000000-0000-4000-8000-000000000002");
        else
          await page
            .getByRole("button", {
              name: en ? /barbell bench press/ : /Supino reto com barra/i,
            })
            .click();
        const add = page.getByRole("button", {
          name: en ? "Add" : "Adicionar",
          exact: true,
        });
        assert(await add.isDisabled());
        await page
          .getByLabel(en ? "Repetitions per set" : "Repetições por série", {
            exact: true,
          })
          .fill("12");
        assert(await add.isEnabled());
        await page
          .getByRole("dialog")
          .screenshot({ path: join(out, `${source}-${locale}-${width}.png`) });
        await add.click();
        await page.waitForFunction(() =>
          window.__calls.some((call) => call.kind === "add"),
        );
        const call = await page.evaluate(() => window.__calls[0]);
        assert.equal(call.input.target_reps, 12);
        const input = page.getByLabel(
          en ? "Repetitions per set" : "Repetições por série",
          { exact: true },
        );
        await input.fill("15");
        await page.evaluate(() => (window.__fail = true));
        await page
          .getByRole("button", { name: en ? "Save" : "Salvar", exact: true })
          .click();
        await page.getByRole("alert").waitFor();
        assert.equal(await input.inputValue(), "15");
        await page.evaluate(() => (window.__fail = false));
        await page
          .getByRole("button", { name: en ? "Save" : "Salvar", exact: true })
          .click();
        await page.waitForFunction(
          () =>
            window.__calls.filter((call) => call.kind === "edit").length === 2,
        );
        assert.equal(
          await page.evaluate(() => window.__calls.at(-1).expected),
          "12",
        );
        assert.deepEqual(errors, []);
        await page.close();
        console.log(
          JSON.stringify({
            source,
            locale,
            width,
            targetSaved: true,
            failedDraftRetained: true,
          }),
        );
      }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
