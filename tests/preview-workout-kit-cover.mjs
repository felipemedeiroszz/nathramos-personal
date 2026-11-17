import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import sharp from "sharp";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  out = resolve("artifacts/workout-kit-cover");
await mkdir(out, { recursive: true });
const png = await sharp({
  create: { width: 800, height: 450, channels: 3, background: "#a39941" },
})
  .png()
  .toBuffer();
await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import{KitUpsertModal}from${JSON.stringify(resolve("src/components/admin/workout/KitUpsertModal.tsx"))};window.__uploads=[];window.__saved=[];const locale=new URLSearchParams(location.search).get('locale')||'pt-BR';createRoot(document.getElementById('root')).render(<NextIntlClientProvider locale={locale} messages={{common:{save:locale==='en-US'?'Save':'Salvar',cancel:locale==='en-US'?'Cancel':'Cancelar',loading:'...'}}} timeZone="America/Sao_Paulo"><KitUpsertModal isOpen onClose={()=>{}} kit={{id:'kit',name_pt:'Kit padrão',name_en:'Standard kit',slug:'kit-padrao',cover_image_url:location.origin+'/cover.png'}} onSubmit={async payload=>{window.__saved.push(payload)}}/></NextIntlClientProvider>);`,
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
        b.onResolve({ filter: /^@\/app\/actions\/workout-covers$/ }, (a) => ({
          path: a.path,
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents:
            'export async function uploadWorkoutKitCoverAction(form){window.__uploads.push(form.get("file").name);return await new Promise(resolve=>window.__finish=resolve)}',
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
  if (req.url.endsWith(".png")) {
    res.setHeader("Content-Type", "image/png");
    res.end(png);
    return;
  }
  res.end(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><style>body{background:#0b0c0e;color:#eee;font-family:Arial}html{color-scheme:dark}</style><div id="root"></div><script src="/app.js"></script>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const en = locale === "en-US",
        page = await browser.newPage({ viewport: { width, height: 1000 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/?locale=" + locale);
      const file = page.locator('input[type="file"]'),
        url = page.getByRole("textbox", {
          name: en ? "Or use an image URL" : "Ou use uma URL de imagem",
        }),
        save = page.getByRole("button", {
          name: en ? "Save" : "Salvar",
          exact: true,
        });
      await file.setInputFiles({
        name: "cover.png",
        mimeType: "image/png",
        buffer: png,
      });
      await page.waitForFunction(() => window.__uploads.length === 1);
      await page.waitForFunction(
        () => document.querySelector('button[type="submit"]').disabled,
      );
      await page.evaluate(() =>
        window.__finish({ success: false, message: "Falha de teste" }),
      );
      await page.getByRole("alert").waitFor();
      assert.equal(await url.inputValue(), origin + "/cover.png");
      await file.setInputFiles({
        name: "cover.png",
        mimeType: "image/png",
        buffer: png,
      });
      await page.waitForFunction(() => window.__uploads.length === 2);
      await page.evaluate(() =>
        window.__finish({
          success: true,
          url: location.origin + "/new-cover.png",
        }),
      );
      await page.waitForFunction(() =>
        document
          .querySelector('input[type="url"]')
          .value.endsWith("/new-cover.png"),
      );
      await page
        .getByRole("img", {
          name: en ? "Kit cover preview" : "Prévia da capa do kit",
        })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: join(out, `cover-${locale}-${width}.png`),
        fullPage: true,
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await save.click();
      await page.waitForFunction(() => window.__saved.length === 1);
      assert.equal(
        await page.evaluate(() => window.__saved[0].cover_image_url),
        origin + "/new-cover.png",
      );
      await file.setInputFiles({
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      });
      await page.getByRole("alert").waitFor();
      assert.equal(await page.evaluate(() => window.__uploads.length), 2);
      await page
        .getByRole("button", { name: en ? "Remove" : "Remover", exact: true })
        .click();
      assert.equal(await url.inputValue(), "");
      await save.click();
      await page.waitForFunction(() => window.__saved.length === 2);
      assert.equal(
        await page.evaluate(() => window.__saved[1].cover_image_url),
        null,
      );
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `Capa de kit ${locale} ${width}: upload, prévia, bloqueio ao enviar, erro preserva capa, salvar e remover OK`,
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
