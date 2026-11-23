import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/student-assigned");
await mkdir(out, { recursive: true });
const days = Array.from({ length: 6 }, (_, i) => ({
  id: `day${i}`,
  name: `Treino ${String.fromCharCode(65 + i)}`,
  week: 1,
  weekday: i + 1,
  available: i === 0,
}));
const items = [
  {
    id: "current",
    name: "Kit atual",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    availability: "available",
    days,
  },
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `next${i}`,
    name: `Próximo ciclo ${i + 1}`,
    startDate: `2027-0${i + 1}-01`,
    endDate: `2027-0${i + 1}-28`,
    availability: "scheduled",
    days: days.map((day) => ({ ...day, available: false })),
  })),
  {
    id: "past",
    name: "Ciclo anterior",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    availability: "ended",
  },
];
await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{AssignedContentPanel,AssignedContentLinks}from${JSON.stringify(resolve("src/components/student/AssignedContentPanel.tsx"))};const p=new URLSearchParams(location.search),locale=p.get('locale')||'pt-BR',kind=p.get('kind')||'workout';const rows=${JSON.stringify(items)};createRoot(document.getElementById('root')).render(<main className="student-shell student-content"><AssignedContentLinks counts={{workout:7,diet:7,supplement:7}} locale={locale}/><AssignedContentPanel items={kind==='workout'?rows:rows.map(({days,...row})=>row)} locale={locale} kind={kind}/><section id="conteudo-hoje"><div id="treino-dia-day0">Conteúdo de hoje</div></section></main>);`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  outfile: join(out, "app.js"),
  bundle: true,
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
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
await readFile("src/app/[locale]/(student)/student.css").then((data) =>
  import("node:fs/promises").then((fs) =>
    fs.writeFile(join(out, "student.css"), data),
  ),
);
const server = createServer(async (req, res) => {
  if (["/app.js", "/base.css", "/student.css"].includes(req.url)) {
    res.setHeader(
      "Content-Type",
      req.url.endsWith(".js") ? "application/javascript" : "text/css",
    );
    res.end(await readFile(join(out, req.url.slice(1))));
  } else
    res.end(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/student.css"><style>body{background:#0b0c0e;color:#eee;font-family:Arial}main{max-width:1100px;margin:auto;padding:16px}section{margin-bottom:24px}</style><div id="root"></div><script src="/app.js"></script>',
    );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const kind of ["workout", "diet", "supplement"])
    for (const locale of ["pt-BR", "en-US"])
      for (const width of [390, 1440]) {
        const page = await browser.newPage({
            viewport: { width, height: 1000 },
          }),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(
          `http://127.0.0.1:${server.address().port}/?kind=${kind}&locale=${locale}`,
        );
        await page
          .getByRole("heading", { name: "Próximo ciclo 5", exact: true })
          .waitFor();
        const region = page.getByRole("region", {
          name:
            locale === "pt-BR"
              ? "Todos os kits vinculados"
              : "All assigned kits",
        });
        assert.equal(await region.locator("article").count(), 7);
        const buttons = region.locator("button");
        assert((await buttons.count()) > 5);
        for (const button of await buttons.all())
          assert(await button.isDisabled());
        await buttons.first().evaluate((button) => button.click());
        assert.equal(new URL(page.url()).hash, "");
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
        await page.screenshot({
          path: join(out, `${kind}-${locale}-${width}.png`),
        });
        await region.locator("a").first().click();
        assert.equal(
          new URL(page.url()).hash,
          kind === "workout" ? "#treino-dia-day0" : "#conteudo-hoje",
        );
        assert.deepEqual(errors, []);
        await page.close();
        console.log(
          JSON.stringify({
            kind,
            locale,
            width,
            allVisible: true,
            lockedControls: true,
          }),
        );
      }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
