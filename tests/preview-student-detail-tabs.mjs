// Navigation QA for the real student server page with local service fixtures.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { renderStudentDetail, student } from "./student-detail-fixture.mjs";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/admin-design-system/student-detail-tabs");
await mkdir(out, { recursive: true });
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
const css = await readFile(join(out, "base.css"));
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/base.css") {
      res.writeHead(200, { "Content-Type": "text/css" }).end(css);
      return;
    }
    const url = new URL(req.url, "http://localhost"),
      locale = url.pathname.includes("en-US") ? "en-US" : "pt-BR";
    const html = await renderStudentDetail(
      Object.fromEntries(url.searchParams),
      url.searchParams.get("qaRole") === "coach" ? "coach" : "admin",
      locale,
    );
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(
        `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><style>body{background:#0b0c0e;padding:20px;font-family:Arial,sans-serif}main{max-width:1180px;margin:0 auto}html{color-scheme:dark}</style><main>${html}</main>`,
      );
  } catch (error) {
    res.writeHead(500).end(error.message);
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const en = locale === "en-US",
        page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.goto(base + "/" + locale + "/admin/alunos/" + student);
      let nav = page.getByRole("navigation", {
        name: en ? "Student sections" : "Seções do aluno",
      });
      assert.equal(await nav.getByRole("link").count(), 8);
      assert.equal(
        await nav.locator('[aria-current="page"]').innerText(),
        en ? "Personal details" : "Dados pessoais",
      );
      assert.equal(
        await page.locator('[data-fixture="manual-payments"]').count(),
        0,
      );
      await page.screenshot({
        path: join(out, `profile-${locale}-${width}.png`),
        fullPage: true,
      });
      for (const [tab, label] of [
        ["workouts", en ? "Workouts" : "Treinos"],
        ["history", en ? "Sessions" : "Sessões"],
        ["diets", en ? "Diets" : "Dietas"],
        ["supplements", en ? "Supplements" : "Suplementos"],
        ["routine", en ? "Routine and health" : "Rotina e saúde"],
        ["billing", en ? "Billing" : "Financeiro"],
        ["management", en ? "Administration" : "Administração"],
      ]) {
        await nav.getByRole("link", { name: label, exact: true }).click();
        await page.waitForURL((url) => url.searchParams.get("tab") === tab);
        nav = page.getByRole("navigation", {
          name: en ? "Student sections" : "Seções do aluno",
        });
        assert.equal(
          await nav.locator('[aria-current="page"]').innerText(),
          label,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
      }
      await page.goto(
        base +
          "/" +
          locale +
          "/admin/alunos/" +
          student +
          "?qaRole=coach&tab=billing",
      );
      nav = page.getByRole("navigation", {
        name: en ? "Student sections" : "Seções do aluno",
      });
      assert.equal(await nav.getByRole("link").count(), 6);
      assert.equal(
        await page.locator('[data-fixture="manual-payments"]').count(),
        0,
      );
      await page.close();
      console.log(
        "Abas do aluno " +
          locale +
          " " +
          width +
          ": navegação, URL, permissões e layout aprovados.",
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
