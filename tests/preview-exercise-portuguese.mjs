import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/exercise-pt/browser");
await mkdir(out, { recursive: true });
const entries = JSON.parse(
  await readFile("src/data/exercise-portuguese.json", "utf8"),
);
const translation = entries.find((row) => row.nameEn === "barbell bench press");
const exercise = {
  exerciseId: translation.id,
  name: translation.nameEn,
  namePt: translation.namePt,
  instructions: ["English instruction"],
  instructionsPt: translation.instructionsPt,
  gifUrl: null,
  bodyParts: ["chest"],
  targetMuscles: ["pectorals"],
  secondaryMuscles: ["triceps"],
  equipments: ["barbell"],
};
const messages = {};
for (const locale of ["pt-BR", "en-US"])
  messages[locale] = JSON.parse(
    await readFile(`src/messages/${locale}.json`, "utf8"),
  ).adminExerciseCatalog;
await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import{ExerciseCatalogClient}from${JSON.stringify(resolve("src/app/[locale]/admin/treinos/ExerciseCatalogClient.tsx"))};const locale=new URLSearchParams(location.search).get('locale')||'pt-BR';createRoot(document.getElementById('root')).render(<React.StrictMode><NextIntlClientProvider locale={locale} messages={{adminExerciseCatalog:${JSON.stringify(messages)}[locale]}} timeZone="America/Sao_Paulo"><ExerciseCatalogClient initialItems={[${JSON.stringify(exercise)}]} initialMeta={{total:1,hasNextPage:false}} initialError={null} bodyParts={['chest']} muscles={['pectorals']} equipments={['barbell']}/></NextIntlClientProvider></React.StrictMode>);`,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  outfile: join(out, "app.js"),
  platform: "browser",
  jsx: "automatic",
  alias: {
    react: resolve("node_modules/next/dist/compiled/react"),
    "react-dom": resolve("node_modules/next/dist/compiled/react-dom"),
  },
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
const requests = [];
const failRefresh = process.env.EXERCISE_QA_FAIL_REFRESH === "1";
const server = createServer(async (req, res) => {
  if (req.url.startsWith("/api/exercisedb/exercises")) {
    requests.push(req.url);
    res.setHeader("Content-Type", "application/json");
    if (failRefresh && !req.url.includes("/exercises/")) {
      res.statusCode = 429;
      res.end(JSON.stringify({ code: "rate_limited" }));
      return;
    }
    res.end(
      JSON.stringify(
        req.url.includes("/exercises/")
          ? { exercise }
          : { items: [exercise], total: 1, hasNextPage: false },
      ),
    );
  } else if (["/app.js", "/base.css"].includes(req.url)) {
    res.setHeader(
      "Content-Type",
      req.url.endsWith(".js") ? "application/javascript" : "text/css",
    );
    res.end(await readFile(join(out, req.url.slice(1))));
  } else
    res.end(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><style>body{background:#0b0c0e;color:#eee;padding:16px;font-family:Arial}</style><div id="root"></div><script src="/app.js"></script>',
    );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const requestStart = requests.length;
      const page = await browser.newPage({ viewport: { width, height: 1000 } }),
        errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        `http://127.0.0.1:${server.address().port}/?locale=${locale}`,
      );
      await page
        .getByRole("heading", {
          name: locale === "pt-BR" ? translation.namePt : translation.nameEn,
          exact: true,
        })
        .waitFor();
      await page.waitForTimeout(600);
      assert.equal(
        requests.length,
        requestStart,
        "mount must not refetch SSR data, including StrictMode",
      );
      const options = await page
        .locator("select")
        .first()
        .locator("option")
        .allTextContents();
      assert(options.includes(locale === "pt-BR" ? "Peito" : "chest"));
      const detailsResponse = page.waitForResponse((response) =>
        response.url().includes("/api/exercisedb/exercises/"),
      );
      await page
        .getByRole("button", {
          name: messages[locale].viewDetails,
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await detailsResponse;
      assert(
        (await dialog.innerText()).includes(
          locale === "pt-BR"
            ? translation.instructionsPt[0]
            : "English instruction",
        ),
      );
      await page.screenshot({ path: join(out, `${locale}-${width}.png`) });
      await page.keyboard.press("Escape");
      await page
        .getByRole("textbox")
        .fill(locale === "pt-BR" ? "supino" : "bench press");
      await page.waitForResponse((response) => response.url().includes("q="));
      if (failRefresh) {
        await page.getByRole("status").waitFor();
        assert.equal(
          await page.locator("article").count(),
          1,
          "a refresh failure must preserve the last loaded exercise",
        );
      }
      assert(
        requests.some((url) =>
          url.includes(locale === "pt-BR" ? "q=supino" : "q=bench+press"),
        ),
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        JSON.stringify({ locale, width, modal: true, search: true, errors: 0 }),
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
