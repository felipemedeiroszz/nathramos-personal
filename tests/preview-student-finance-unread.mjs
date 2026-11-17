// Real finance components and unread badges, with local services and no remote writes.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";
import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/student-finance-unread");
await mkdir(out, { recursive: true });
const plan = {
  id: "00000000-0000-4000-8000-000000000003",
  name_pt: "Acompanhamento mensal",
  name_en: "Monthly coaching",
  price_cents: 15000,
  currency: "BRL",
};
const payment = {
  id: "entry-1",
  amount_cents: 15000,
  currency: "BRL",
  method: "pix",
  paid_at: "2026-11-16T12:00:00Z",
};
const common = {
  "next/link": ({ children, ...props }) =>
    React.createElement("a", props, children),
};
const { StudentManualBillingPanel } = loadTs(
  "src/components/admin/student/StudentManualBillingPanel.tsx",
  {
    ...common,
    "@/lib/auth/access": { requireRole: async () => ({ role: "admin" }) },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        from: (table) => {
          let q = {
            select: () => q,
            eq: () => q,
            order: () => q,
            limit: () => q,
            then: (fn) =>
              Promise.resolve({
                data:
                  table === "plans"
                    ? [plan]
                    : table === "payments"
                      ? [payment]
                      : [],
                error: null,
              }).then(fn),
          };
          return q;
        },
      }),
    },
    "@/services/StudentRoutineService": { checked: (r) => r.data },
    "./ManualBillingForm": {
      ManualBillingForm: () => React.createElement("div", { id: "form-root" }),
    },
  },
);
const { StudentBillingHistoryPanel } = loadTs(
  "src/components/admin/student/StudentBillingHistoryPanel.tsx",
  {
    ...common,
    "@/services/StudentBillingHistoryService": {
      historyStatuses: ["paid", "pending"],
      BillingHistoryFilterError: class extends Error {},
      studentBillingHistory: async () => ({
        total: 1,
        page: 1,
        pages: 1,
        filters: {
          status: "all",
          provider: "all",
          type: "all",
          date: "created",
          from: "",
          to: "",
        },
        rows: [
          {
            ...payment,
            status: "paid",
            provider: "manual",
            created_at: payment.paid_at,
            due_at: null,
            refunded_amount_cents: 0,
            metadata: {},
            description_pt: "Mensalidade de novembro",
            description_en: "November membership",
            subscription: { plan },
          },
        ],
      }),
    },
  },
);
await build({
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{ManualBillingForm}from${JSON.stringify(resolve("src/components/admin/student/ManualBillingForm.tsx"))};import{MentorshipUnreadBadge}from${JSON.stringify(resolve("src/components/shared/MentorshipUnreadBadge.tsx"))};const locale=document.documentElement.lang;window.__count=3;window.fetch=async url=>({ok:true,json:async()=>({count:window.__count})});createRoot(document.getElementById('form-root')).render(<ManualBillingForm studentId="student" locale={locale} today="2026-11-17" requestKey="request" plans={${JSON.stringify([plan])}}/>);createRoot(document.getElementById('badges')).render(<><div>Mentoria <MentorshipUnreadBadge side="admin" locale={locale}/></div><div>Minha treinadora <MentorshipUnreadBadge side="student" locale={locale}/></div></>);`,
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
      name: "actions",
      setup(b) {
        b.onResolve({ filter: /^@\/app\/actions\/manualBilling$/ }, (a) => ({
          path: a.path,
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents:
            'export async function recordStudentManualAction(){return {success:true,message:"Salvo"}}',
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
  const locale = req.url.includes("en-US") ? "en-US" : "pt-BR";
  const html = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      await StudentManualBillingPanel({ studentId: "student", locale }),
      await StudentBillingHistoryPanel({
        studentId: "student",
        locale,
        params: {},
      }),
    ),
  );
  res.end(
    `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><style>body{background:#0b0c0e;color:#eee;padding:16px;font-family:Arial}main{max-width:1180px;margin:auto;display:grid;gap:24px}html{color-scheme:dark}#badges{display:flex;gap:24px;padding:16px}#badges>div{display:flex;gap:12px;align-items:center}</style><main><div id="badges"></div>${html}</main><script src="/app.js"></script></html>`,
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/" + locale);
      await page.waitForFunction(
        () => document.querySelectorAll('#badges [role="status"]').length === 2,
      );
      assert.equal(
        await page.locator('#badges [role="status"]').first().innerText(),
        "3",
      );
      await page.evaluate(() => {
        window.__count = 1;
        window.dispatchEvent(new Event("mentoring:unread-changed"));
      });
      await page.waitForFunction(
        () =>
          document.querySelector('#badges [role="status"]').textContent === "1",
      );
      await page.evaluate(() => {
        window.__count = 0;
        window.dispatchEvent(new Event("mentoring:unread-changed"));
      });
      await page.waitForFunction(
        () => !document.querySelector('#badges [role="status"]'),
      );
      await page
        .getByRole("button", {
          name: locale === "pt-BR" ? "Usar valor do plano" : "Use plan price",
        })
        .click();
      assert.equal(
        await page.locator('input[name="amount"]').inputValue(),
        "150,00",
      );
      await page.screenshot({
        path: join(out, `finance-${locale}-${width}.png`),
        fullPage: true,
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `overflow ${locale} ${width}`,
      );
      await page
        .locator("summary")
        .filter({
          hasText:
            locale === "pt-BR" ? "Filtrar pagamentos" : "Filter payments",
        })
        .click();
      assert(await page.locator('select[name="financeStatus"]').isVisible());
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `Financeiro e contadores ${locale} ${width}: layout, filtros, preço do plano e leitura 3→1→0 OK`,
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
