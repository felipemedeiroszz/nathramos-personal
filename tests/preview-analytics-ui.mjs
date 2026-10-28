import { build } from "esbuild";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/luis.medeiros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const out = path.resolve("artifacts/analytics-ui");
await mkdir(out, { recursive: true });
const navigation = path.join(out, "navigation.mjs"),
  link = path.join(out, "link.mjs");
await writeFile(
  navigation,
  `export const usePathname=()=>'/pt-BR/admin/relatorios';export const useRouter=()=>({push:url=>{window.location.href=url},refresh:()=>{window.location.reload()}});`,
);
await writeFile(
  link,
  `import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`,
);
const admin = JSON.parse(
  await readFile(path.join(out, "fixture.json"), "utf8"),
);
admin.students[0].name = "Mariana de Almeida Santos";
admin.financial.statuses = [
  { name: "active", value: 16 },
  { name: "trialing", value: 4 },
  { name: "past_due", value: 3 },
  { name: "canceled", value: 2 },
];
const coach = JSON.parse(
  await readFile(path.join(out, "coach-fixture.json"), "utf8"),
);
await writeFile(
  path.join(out, "visual-fixtures.json"),
  JSON.stringify({ admin, coach }),
);
await writeFile(
  path.join(out, "entry.mjs"),
  `import React from 'react';import {createRoot} from 'react-dom/client';import {AnalyticsClient} from '../../src/components/admin/analytics/AnalyticsClient';import {analyticsFilters} from '../../src/lib/analytics/model';import fixtures from './visual-fixtures.json';const params=new URLSearchParams(window.location.search);const role=params.get('role')||'admin',locale=params.get('locale')||'pt-BR',report=fixtures[role];const filters=analyticsFilters({...Object.fromEntries(params),from:params.get('from')||report.meta.from,to:params.get('to')||report.meta.to,grain:params.get('grain')||'week'});createRoot(document.getElementById('app')).render(React.createElement(AnalyticsClient,{report,filters,locale}));`,
);
await build({
  entryPoints: [path.join(out, "entry.mjs")],
  outfile: path.join(out, "bundle.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  alias: {
    "@": path.resolve("src"),
    "next/navigation": navigation,
    "next/link": link,
  },
  logLevel: "silent",
});
const styles = (await readdir(".next/static/css")).filter((name) =>
  name.endsWith(".css"),
);
const css = styles
  .map((name) => `<link rel="stylesheet" href="/_next/static/css/${name}">`)
  .join("");
const cssSource = (
  await Promise.all(
    styles.map((name) => readFile(".next/static/css/" + name, "utf8")),
  )
).join("");
const font = cssSource.match(/\.([\w-]+)\{--font-inter:/)?.[1] || "";
const requests = [];
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let target;
    if (url.pathname === "/api/admin/analytics/export") {
      requests.push(Object.fromEntries(url.searchParams));
      const format = url.searchParams.get("format");
      res.setHeader(
        "Content-Type",
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.end(
        await readFile(
          path.join(out, format === "pdf" ? "report.pdf" : "report.xlsx"),
        ),
      );
      return;
    }
    if (url.pathname.startsWith("/_next/static/")) {
      target = path.resolve(
        ".next/static",
        url.pathname.slice("/_next/static/".length),
      );
      assert.ok(target.startsWith(path.resolve(".next/static") + path.sep));
      res.setHeader(
        "Content-Type",
        target.endsWith(".css")
          ? "text/css"
          : target.endsWith(".woff2")
            ? "font/woff2"
            : "application/javascript",
      );
      res.end(await readFile(target));
      return;
    }
    if (url.pathname === "/bundle.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.end(await readFile(path.join(out, "bundle.js")));
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body class="${font} bg-background text-text"><main id="app" class="mx-auto max-w-7xl p-4 md:p-8"></main><script src="/bundle.js"></script></body></html>`,
    );
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const role of ["admin", "coach"])
    for (const locale of ["pt-BR", "en-US"])
      for (const width of [390, 1280]) {
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
          acceptDownloads: true,
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(base + `/?role=${role}&locale=${locale}`);
        await page.waitForSelector(".recharts-surface");
        await page.evaluate(() => document.fonts.ready);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          ),
          false,
          `${role} ${locale} ${width} overflows`,
        );
        assert.equal(
          await page.locator(".recharts-surface").count(),
          role === "admin" ? 4 : 1,
        );
        if (role === "coach")
          assert.equal(
            await page
              .getByRole("heading", {
                name:
                  locale === "pt-BR"
                    ? "Análise financeira"
                    : "Financial analysis",
                exact: true,
              })
              .count(),
            0,
          );
        await page.screenshot({
          path: path.join(out, `panel-${role}-${locale}-${width}.png`),
          fullPage: true,
        });
        if (role === "admin" && locale === "pt-BR" && width === 1280) {
          await page.locator(".recharts-curve").first().hover({ force: true });
          for (const [format, label] of [
            ["pdf", "Baixar PDF"],
            ["xlsx", "Baixar Excel"],
          ]) {
            const event = page.waitForEvent("download");
            await page
              .getByRole("button", { name: label, exact: true })
              .click();
            const download = await event;
            await download.saveAs(
              path.join(out, "browser-" + format + "." + format),
            );
            assert.equal(requests.at(-1).from, "2025-01-01");
            assert.equal(requests.at(-1).currency, "BRL");
          }
          await page.evaluate(() => {
            window.print = () => {
              window.printed = true;
            };
          });
          await page
            .getByRole("button", { name: "Imprimir", exact: true })
            .click();
          assert.equal(await page.evaluate(() => window.printed), true);
          await page.pdf({
            path: path.join(out, "print.pdf"),
            format: "A4",
            printBackground: true,
          });
          await page.locator("select[name=grain]").selectOption("month");
          await page
            .getByRole("button", { name: "Aplicar filtros", exact: true })
            .click();
          await page.waitForURL("**grain=month**");
        }
        assert.deepEqual(errors, []);
        console.log(
          "PASS",
          role,
          locale,
          width,
          "charts/download/print checks",
        );
        await page.close();
      }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
