// Browser QA of the real directory; only routing and fixture data are simulated.
import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/student-directory");
await mkdir(out, { recursive: true });
const students = [
  {
    id: "student-z",
    full_name: "Zélia de Albuquerque Cavalcante",
    email: "zelia.cavalcante@example.test",
    created_at: "2026-11-12T12:00:00Z",
    country: "Brasil",
    subscription: {
      status: "active",
      plan_name: "Acompanhamento mensal",
      provider: "stripe",
      current_period_end: "2026-12-10T12:00:00Z",
    },
  },
  {
    id: "student-a",
    full_name: "Ana Souza",
    email: "ana@example.test",
    created_at: "2026-10-01T12:00:00Z",
    country: "Brasil",
    subscription: {
      status: "expired",
      plan_name: "Consultoria trimestral",
      provider: "manual",
      current_period_end: "2026-11-01T12:00:00Z",
    },
  },
  {
    id: "student-b",
    full_name: "Bruno Oliveira",
    email: null,
    created_at: "2026-11-10T12:00:00Z",
    subscription: null,
  },
];
await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{AdminAlunosClient}from${JSON.stringify(resolve("src/app/[locale]/admin/alunos/AdminAlunosClient.tsx"))};const params=new URLSearchParams(location.search),locale=params.get('locale')||'pt-BR';window.__routes=[];createRoot(document.getElementById('root')).render(<AdminAlunosClient locale={locale} students={params.has('empty')?[]:${JSON.stringify(students)}} total={params.has('empty')?0:23} page={1} totalPages={params.has('empty')?1:2} limit={20} search={params.has('filtered')?'Ana':''} status={params.has('filtered')?'active':''}/>);`,
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
      name: "routing",
      setup(b) {
        b.onResolve({ filter: /^next\/(navigation|link)$/ }, (a) => ({
          path: a.path,
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
          contents: a.path.endsWith("navigation")
            ? "export function useRouter(){return {push(url){window.__routes.push(url)}}}"
            : 'import React from "react";export default function Link({children,prefetch,...props}){return React.createElement("a",props,children)}',
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
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><style>html{color-scheme:dark}body{background:#0b0c0e;padding:20px;font-family:Arial}#root{max-width:1180px;margin:auto}</style><div id="root"></div><script src="/app.js"></script>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 768, 1440]) {
      const en = locale === "en-US",
        page = await browser.newPage({ viewport: { width, height: 1000 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/?locale=" + locale);
      await page
        .getByRole("heading", {
          name: en ? "Students." : "Alunos.",
          exact: true,
        })
        .waitFor();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "horizontal overflow",
      );
      const visibleManagement = page
        .getByRole("link", {
          name: (en ? "Manage" : "Administrar") + " Ana Souza",
        })
        .filter({ visible: true });
      assert.equal(
        await visibleManagement.getAttribute("href"),
        `/${locale}/admin/alunos/student-a?tab=management`,
      );
      assert.equal(
        await page
          .getByRole("link", {
            name: (en ? "Finances for" : "Financeiro de") + " Ana Souza",
          })
          .filter({ visible: true })
          .getAttribute("href"),
        `/${locale}/admin/alunos/student-a?tab=billing`,
      );
      if (width >= 1024) {
        await page
          .getByRole("button", {
            name: en ? "Card view" : "Visualização em cards",
          })
          .click();
      }
      await page
        .getByRole("combobox", {
          name: en ? "Sort students on this page" : "Ordenar alunos da página",
        })
        .selectOption("name");
      assert.match(
        await page.locator("article").first().innerText(),
        /Ana Souza/,
      );
      await page
        .getByRole("combobox", {
          name: en ? "Sort students on this page" : "Ordenar alunos da página",
        })
        .selectOption("expiry");
      assert.match(
        await page.locator("article").first().innerText(),
        /Ana Souza/,
      );
      await page.screenshot({
        path: join(out, `directory-${locale}-${width}.png`),
        fullPage: true,
      });
      await page.getByRole("textbox").fill("Ana");
      await page
        .getByRole("button", { name: en ? "Search" : "Buscar", exact: true })
        .click();
      assert.equal(
        await page.evaluate(() => window.__routes.at(-1)),
        `/${locale}/admin/alunos?search=Ana`,
      );
      await page
        .getByRole("button", {
          name: en ? "Blocked" : "Bloqueados",
          exact: true,
        })
        .click();
      assert.equal(
        await page.evaluate(() => window.__routes.at(-1)),
        `/${locale}/admin/alunos?search=Ana&status=blocked`,
      );
      await page.goto(origin + "/?locale=" + locale + "&filtered=1");
      await page
        .getByRole("button", { name: en ? "Next page" : "Próxima página" })
        .click();
      assert.equal(
        await page.evaluate(() => window.__routes.at(-1)),
        `/${locale}/admin/alunos?search=Ana&status=active&page=2`,
      );
      await page
        .getByRole("button", {
          name: en ? "Remove status filter" : "Remover filtro de status",
        })
        .click();
      assert.equal(
        await page.evaluate(() => window.__routes.at(-1)),
        `/${locale}/admin/alunos?search=Ana`,
      );
      await page.goto(origin + "/?locale=" + locale + "&empty=1");
      await page
        .getByRole("heading", {
          name: en ? "No students found" : "Nenhum aluno encontrado",
        })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: en ? "Next page" : "Próxima página" })
          .isDisabled(),
        true,
      );
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `Diretório ${locale} ${width}: atalhos, busca, filtros, ordenação, paginação e vazio OK`,
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
