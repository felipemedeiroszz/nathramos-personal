import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const mocks = {
  "next/navigation": {
    useRouter: () => ({ push() {}, refresh() {} }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/pt-BR/admin/financeiro",
  },
  "next/link": (props) => React.createElement("a", props, props.children),
  "@/app/actions/admin": {},
  "react-dom": {
    useFormState: () => [null, "#"],
    useFormStatus: () => ({ pending: false }),
  },
};
const { AdminAlunosClient } = loadTs(
  "src/app/[locale]/admin/alunos/AdminAlunosClient.tsx",
  mocks,
);
const { StudentPasswordResetForm } = loadTs(
  "src/components/admin/StudentPasswordResetForm.tsx",
  mocks,
);
const { AdminCurrencySelector } = loadTs(
  "src/components/admin/billing/AdminCurrencySelector.tsx",
  mocks,
);
const students = [
  {
    id: "fixture-a",
    full_name: "Aluno de teste",
    email: "aluno@example.test",
    country: "Brasil",
    created_at: "2026-10-01T12:00:00Z",
    subscription: {
      status: "active",
      plan_name: "Acompanhamento",
      provider: "stripe",
      current_period_end: "2026-11-01T12:00:00Z",
    },
  },
  {
    id: "fixture-b",
    full_name: "Outro aluno de teste",
    email: "outro@example.test",
    country: "Brasil",
    created_at: "2026-10-02T12:00:00Z",
    subscription: null,
  },
];
const views = [
  [
    "alunos",
    AdminAlunosClient,
    {
      locale: "pt-BR",
      students,
      total: 3,
      page: 1,
      totalPages: 2,
      search: "",
      status: "",
      limit: 2,
    },
  ],
  [
    "senha",
    StudentPasswordResetForm,
    { studentId: "fixture-a", studentName: "Aluno de teste" },
  ],
  ["moeda", AdminCurrencySelector, { currency: "BRL" }],
];
const fixtureQueue = {
  counts: { exam: 2, chat: 3, workout: 1, diet: 1, meeting: 1 },
  items: [
    {
      kind: "exam",
      id: "exam",
      student_id: "fixture-a",
      student: "Aluno de teste",
      label: "Hemograma",
    },
    {
      kind: "chat",
      id: "chat",
      student_id: "fixture-a",
      student: "Aluno de teste",
      label: "3",
    },
    {
      kind: "workout",
      id: "fixture-b",
      student_id: "fixture-b",
      student: "Outro aluno de teste",
      label: "",
    },
  ],
};
const fixtureFinance = {
  paid_cents: 125900,
  failed_webhooks: 2,
  pending_webhooks: 1,
  expired_active: 3,
  missing_external_ids: 1,
  paid_without_active_subscription: 0,
};
const serverMocks = {
  ...mocks,
  "server-only": {},
  "@/lib/auth/platform": {
    requirePlatformUser: async () => ({
      userId: "fixture-admin",
      role: "admin",
      staff: true,
    }),
  },
  "@/lib/auth/access": {
    requireRole: async () => ({ userId: "fixture-admin", role: "admin" }),
  },
  "@/lib/supabase/server": {
    createServiceClientSSR: async () => ({
      rpc: async (name) => ({
        data: name === "admin_work_queue" ? fixtureQueue : fixtureFinance,
        error: null,
      }),
    }),
  },
  "@/app/actions/reconciliation": {},
};
const { AdminWorkQueue } = loadTs(
  "src/components/admin/AdminWorkQueue.tsx",
  serverMocks,
);
const { FinanceChecks } = loadTs(
  "src/components/admin/billing/FinanceChecks.tsx",
  serverMocks,
);
const { AdminDataControls } = loadTs(
  "src/components/admin/AdminDataControls.tsx",
  serverMocks,
);
const { StudentCoachForm } = loadTs(
  "src/components/admin/StudentCoachForm.tsx",
  serverMocks,
);
for (const locale of ["pt-BR", "en-US"]) {
  const queue = await AdminWorkQueue({ locale }),
    finance = await FinanceChecks({
      locale,
      params: { currency: "BRL", from: "2026-10-01", to: "2026-10-28" },
    });
  views.push(
    ["fila-" + locale, () => queue, {}],
    ["conferencia-" + locale, () => finance, {}],
    [
      "filtros-" + locale,
      AdminDataControls,
      {
        params: { currency: "BRL" },
        total: 91,
        page: 1,
        size: 30,
        locale,
        finance: true,
        exportUrl: "/api/admin/payments/export",
      },
    ],
    [
      "coach-" + locale,
      StudentCoachForm,
      {
        studentId: "fixture-a",
        coaches: [{ id: "fixture-coach", full_name: "Coach de teste" }],
        current: "fixture-coach",
        locale,
      },
    ],
  );
}
const out = resolve("artifacts/auditoria-admin-ui");
await mkdir(out, { recursive: true });
const styles = (await readdir(".next/static/css")).filter((f) =>
  f.endsWith(".css"),
);
const css = styles
  .map(
    (f) =>
      `<link rel="stylesheet" href="${pathToFileURL(resolve(".next/static/css", f))}">`,
  )
  .join("");
const cssSource = (
  await Promise.all(
    styles.map((f) => readFile(".next/static/css/" + f, "utf8")),
  )
).join("");
const fontClass = cssSource.match(/\.([\w-]+)\{--font-inter:/)?.[1] || "";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const [name, Component, props] of views) {
    const body = renderToStaticMarkup(React.createElement(Component, props));
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body class="${fontClass} bg-background text-text" style="${fontClass ? "" : "--font-inter:Arial"}"><main class="max-w-7xl mx-auto p-4 md:p-8 space-y-5"><h1 class="text-2xl font-bold">Administração · ${name}</h1>${body}</main></body></html>`;
    const file = resolve(out, name + ".html");
    await writeFile(file, html);
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      await page.goto(pathToFileURL(file).href);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: resolve(out, `${name}-${width}.png`),
        fullPage: true,
      });
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        throw new Error(`${name} overflows at ${width}px`);
      console.log(`${name} ${width}px: no document overflow`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
