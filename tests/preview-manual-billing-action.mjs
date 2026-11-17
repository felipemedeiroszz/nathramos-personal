// Real App Router React hooks; simulated actions only, no payment or remote write.
import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = await mkdtemp(join(tmpdir(), "manual-billing-action-"));
await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ManualBillingForm} from ${JSON.stringify(resolve("src/components/admin/student/ManualBillingForm.tsx"))};const locale=new URLSearchParams(location.search).get('locale')||'pt-BR';window.__calls=[];createRoot(document.getElementById('root')).render(<ManualBillingForm studentId="00000000-0000-4000-8000-000000000001" locale={locale} today="2026-11-17" requestKey="00000000-0000-4000-8000-000000000002" plans={[{id:'00000000-0000-4000-8000-000000000003',name_pt:'Plano teste',name_en:'Test plan',currency:'BRL',price_cents:15000}]}/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: join(out, "app.js"),
  bundle: true,
  jsx: "automatic",
  platform: "browser",
  alias: {
    react: resolve("node_modules/next/dist/compiled/react"),
    "react-dom": resolve("node_modules/next/dist/compiled/react-dom"),
  },
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "local-action",
      setup(b) {
        b.onResolve({ filter: /^@\/app\/actions\/manualBilling$/ }, (a) => ({
          path: a.path,
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `export async function recordStudentManualAction(previous,form){window.__calls.push(Object.fromEntries(form));return await new Promise(resolve=>{window.__finish=resolve;});}`,
          loader: "js",
        }));
      },
    },
  ],
});
const js = await readFile(join(out, "app.js"));
const server = createServer((req, res) => {
  if (req.url.startsWith("/app.js"))
    res.writeHead(200, { "Content-Type": "text/javascript" }).end(js);
  else
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/app.js"></script>',
      );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const en = locale === "en-US",
        page = await browser.newPage({ viewport: { width, height: 900 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await page.goto(origin + "/?locale=" + locale);
      await page.locator('select[name="operation"]').selectOption("payment");
      await page.locator('input[name="amount"]').fill("150,00");
      const key = await page.locator('input[name="requestKey"]').inputValue();
      const submit = page.locator('button[type="submit"]');
      await submit.click();
      await page.waitForFunction(() => window.__calls.length === 1);
      assert.equal(await submit.isDisabled(), true);
      assert.ok(
        (await submit.innerText()).includes(en ? "Saving" : "Salvando"),
      );
      await page.evaluate(() =>
        window.__finish({ success: false, message: "Fixture error" }),
      );
      await page.getByRole("alert").waitFor();
      assert.equal(await submit.isDisabled(), false);
      assert.equal(
        await page.locator('input[name="requestKey"]').inputValue(),
        key,
      );
      assert.equal(
        await page.locator('input[name="amount"]').inputValue(),
        "150,00",
      );
      await submit.click();
      await page.waitForFunction(() => window.__calls.length === 2);
      assert.equal(await submit.isDisabled(), true);
      await page.evaluate(() =>
        window.__finish({ success: true, message: "Fixture success" }),
      );
      await page.getByRole("status").waitFor();
      await page.waitForFunction(
        (key) =>
          document.querySelector('input[name="requestKey"]').value !== key,
        key,
      );
      assert.equal(await page.locator('input[name="amount"]').inputValue(), "");
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        "ManualBillingForm " +
          locale +
          " " +
          width +
          ": pending, erro, sucesso e nova chave OK; sem aviso de API antiga.",
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  if (
    dirname(resolve(out)) !== resolve(tmpdir()) ||
    !basename(out).startsWith("manual-billing-action-")
  )
    throw Error("Unexpected temporary directory");
  await rm(out, { recursive: true, force: true });
}
