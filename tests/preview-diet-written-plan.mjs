import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  out = resolve("artifacts/diet-written-plan");
await mkdir(out, { recursive: true });
const pt = JSON.parse(await readFile("src/messages/pt-BR.json", "utf8")),
  en = JSON.parse(await readFile("src/messages/en-US.json", "utf8"));
await build({
  stdin: {
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import{DietKitModal}from${JSON.stringify(resolve("src/components/admin/diet/DietKitModal.tsx"))};import{DietWrittenPlan}from${JSON.stringify(resolve("src/components/shared/DietWrittenPlan.tsx"))};const locale=new URLSearchParams(location.search).get('locale')||'pt-BR',messages=locale==='en-US'?${JSON.stringify({ common: en.common, adminDietKits: en.adminDietKits })}:${JSON.stringify({ common: pt.common, adminDietKits: pt.adminDietKits })};window.__calls=[];function App(){const[saved,setSaved]=useState(null);return <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Sao_Paulo">{saved?<main id="student-plan"><h1>{locale==='en-US'?saved.name_en:saved.name_pt}</h1><DietWrittenPlan text={locale==='en-US'?saved.description_en:saved.description_pt} locale={locale}/></main>:<DietKitModal isOpen onClose={()=>{}} onSaved={()=>setSaved(window.__calls.at(-1).kit)}/>}</NextIntlClientProvider>}createRoot(document.getElementById('root')).render(<App/>);`,
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
        b.onResolve({ filter: /^@\/app\/actions\/content$/ }, (a) => ({
          path: a.path,
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents:
            "export async function saveDietKitAction(input){window.__calls.push(input);return await new Promise(resolve=>window.__finish=resolve)}",
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
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><style>body{background:#0b0c0e;color:#eee;font-family:Arial}html{color-scheme:dark}#student-plan{max-width:850px;margin:24px auto;padding:16px}h1{font-size:24px;margin-bottom:20px}</style><div id="root"></div><script src="/app.js"></script>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const english = locale === "en-US",
        page = await browser.newPage({ viewport: { width, height: 1000 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/?locale=" + locale);
      const example = page.getByRole("button", {
        name: english ? "Use meal example" : "Usar exemplo de refeições",
        exact: true,
      });
      await example.click();
      const editor = page.getByRole("textbox", {
        name: english
          ? "Meals and guidance (EN)"
          : "Refeições e orientações (PT)",
      });
      assert.match(await editor.inputValue(), /100 g/);
      await editor.fill(
        (await editor.inputValue()) + "\nCustom preserved note.",
      );
      await example.click();
      await page.getByRole("alert").waitFor();
      await page
        .getByRole("button", {
          name: english ? "Cancel" : "Cancelar",
          exact: true,
        })
        .filter({ visible: true })
        .first()
        .click();
      assert.match(await editor.inputValue(), /Custom preserved note/);
      await page
        .getByRole("button", {
          name: english ? "Student preview" : "Prévia do aluno",
          exact: true,
        })
        .click();
      const preview = page.getByLabel(
        english ? "Meal plan preview" : "Prévia do plano alimentar",
      );
      assert.equal(await preview.getByRole("listitem").count(), 17);
      assert.equal(await preview.getByRole("heading", { level: 3 }).count(), 7);
      await preview.scrollIntoViewIfNeeded();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: join(out, `editor-${locale}-${width}.png`),
        fullPage: true,
      });
      const save = page.getByRole("button", {
        name: english ? "Save" : "Salvar",
        exact: true,
      });
      await save.click();
      await page.waitForFunction(() => window.__calls.length === 1);
      await page.waitForFunction(
        () => document.querySelector('button[type="submit"]').disabled,
      );
      assert.equal(
        await page.evaluate(() => window.__calls[0].items.length),
        0,
      );
      await page.evaluate(() =>
        window.__finish({ success: false, message: "Falha simulada" }),
      );
      await page.getByText("Falha simulada", { exact: true }).waitFor();
      await page
        .getByRole("button", {
          name: english ? "Edit text" : "Editar texto",
          exact: true,
        })
        .click();
      assert.match(await editor.inputValue(), /Custom preserved note/);
      await save.click();
      await page.waitForFunction(() => window.__calls.length === 2);
      await page.evaluate(() => window.__finish({ success: true }));
      await page.locator("#student-plan").waitFor();
      assert.equal(await page.locator("#student-plan li").count(), 17);
      assert.match(
        await page.locator("#student-plan").innerText(),
        english ? /not the entire day/ : /não para o dia inteiro/,
      );
      assert.match(
        await page.locator("#student-plan").innerText(),
        /Custom preserved note/,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: join(out, `student-${locale}-${width}.png`),
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `Kit dieta ${locale} ${width}: modelo, edição, confirmação, prévia, erro preserva dados e plano do aluno OK`,
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
