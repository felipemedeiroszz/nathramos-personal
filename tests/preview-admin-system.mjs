// Manual visual/interaction QA with local fixtures. No production services are called.
import { build } from "esbuild";
import ts from "typescript";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/admin-design-system");
await mkdir(out, { recursive: true });
await copyFile("public/logo.png", resolve(out, "logo.png"));
const base = {
  locale: "pt-BR",
  userId: "fixture",
  title: "Biblioteca",
  subtitle: "Organize o conteúdo e acompanhe suas atribuições.",
  searchValue: "",
  students: [],
  assignedByKit: {},
};
const views = [
  [
    "treinos",
    "src/app/[locale]/admin/treinos/OwnExercisesClient.tsx",
    "OwnExercisesClient",
    { ...base, exercises: [] },
    "content",
  ],
  [
    "alimentos",
    "src/app/[locale]/admin/alimentos/AdminAlimentosClient.tsx",
    "AdminAlimentosClient",
    { ...base, foods: [] },
    "content",
  ],
  [
    "suplementos",
    "src/app/[locale]/admin/suplementos/AdminSuplementosClient.tsx",
    "AdminSuplementosClient",
    { ...base, supplements: [] },
    "content",
  ],
  [
    "exames",
    "src/app/[locale]/admin/exames/AdminExamesClient.tsx",
    "AdminExamesClient",
    {
      ...base,
      exams: [],
      categories: [],
      studentOptions: [],
      studentNames: {},
    },
    "content",
  ],
  [
    "ebooks",
    "src/app/[locale]/admin/ebooks/AdminEbooksClient.tsx",
    "AdminEbooksClient",
    { ...base, ebooks: [] },
    "content",
  ],
  [
    "kits/treinos",
    "src/app/[locale]/admin/kits/treinos/AdminKitsClient.tsx",
    "AdminKitsClient",
    {
      ...base,
      kits: [],
      programOptions: [],
      exerciseOptions: [],
      difficultyLabels: {},
    },
    "kits",
  ],
  [
    "kits/dietas",
    "src/app/[locale]/admin/kits/dietas/AdminDietKitsClient.tsx",
    "AdminDietKitsClient",
    { ...base, kits: [], foods: [] },
    "kits",
  ],
  [
    "kits/suplementos",
    "src/app/[locale]/admin/kits/suplementos/AdminSupplementKitsClient.tsx",
    "AdminSupplementKitsClient",
    { ...base, kits: [], supplements: [] },
    "kits",
  ],
  [
    "mentoria",
    "src/components/admin/mentoring/AdminMentoriaClient.tsx",
    "AdminMentoriaClient",
    {
      currentUserId: "fixture",
      rooms: [],
      initialRoomId: null,
      initialMessages: [],
    },
    "relationship",
  ],
  [
    "reunioes",
    "src/components/admin/mentoring/AdminReunioesClient.tsx",
    "AdminReunioesClient",
    { meetings: [], students: [] },
    "relationship",
  ],
  [
    "notificacoes",
    "src/components/admin/notifications/AdminNotificationsClient.tsx",
    "AdminNotificationsClient",
    { history: [], historyTotal: 0, templates: [], studentCount: 0 },
    "relationship",
  ],
  [
    "redes-sociais",
    "src/components/admin/social/AdminSocialLinksClient.tsx",
    "AdminSocialLinksClient",
    { title: "Redes sociais", links: [] },
    "relationship",
  ],
  [
    "assinaturas",
    "src/components/admin/billing/AdminAssinaturasClient.tsx",
    "AdminAssinaturasClient",
    { title: "Assinaturas", subscriptions: [] },
    "finance",
  ],
  [
    "pagamentos",
    "src/components/admin/billing/AdminPagamentosClient.tsx",
    "AdminPagamentosClient",
    {
      title: "Pagamentos",
      payments: [
        {
          id: "fixture-payment",
          student_name: "Mariana Oliveira",
          description_pt: "Consultoria Premium",
          description_en: "Premium coaching",
          amount_cents: 29900,
          currency: "BRL",
          method: "credit_card",
          provider: "stripe",
          status: "paid",
          created_at: "2026-10-29T12:00:00Z",
          paid_at: "2026-10-29T12:00:00Z",
        },
      ],
    },
    "finance",
  ],
  [
    "planos",
    "src/components/admin/billing/AdminPlanoClient.tsx",
    "AdminPlanoClient",
    { plan: null },
    "finance",
  ],
  [
    "financeiro",
    "src/components/admin/billing/AdminFinanceiroClient.tsx",
    "AdminFinanceiroClient",
    {
      overview: { currency: "BRL" },
      revenueSeries: [
        { name: "Set", value: 14000 },
        { name: "Out", value: 18000 },
      ],
      statusCounts: [
        { status: "active", count: 24 },
        { status: "past_due", count: 3 },
      ],
      providerRevenue: [],
      topPlans: [],
      integration: {
        stripe: { configured: true, mode: "test" },
        asaas: { configured: false, environment: "sandbox" },
      },
      recentPayments: [],
    },
    "finance",
  ],
  [
    "configuracoes",
    "src/components/admin/settings/AdminSettingsClient.tsx",
    "AdminSettingsClient",
    {
      settings: {
        brand_name_pt: "Nath Ramos",
        brand_name_en: "Nath Ramos",
        brand_tagline_pt: "Personal Trainer",
        brand_tagline_en: "Personal Trainer",
        support_email: "suporte@example.test",
        support_whatsapp: "",
        support_hours_pt: "Segunda a sexta",
        support_hours_en: "Monday to Friday",
        maintenance_mode: false,
        maintenance_duration: 24,
        maintenance_duration_unit: "hours",
        maintenance_until: null,
        maintenance_active: false,
        signup_open: true,
        trial_days_default: 7,
      },
    },
    "system",
  ],
  [
    "auditoria",
    "src/components/admin/audit/AdminAuditoriaClient.tsx",
    "AdminAuditoriaClient",
    {
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
      entityTypes: [],
      actions: [],
      filters: { q: "", entity: "", action: "", from: "", to: "" },
    },
    "system",
  ],
  [
    "paginas",
    "src/components/admin/content/AdminContentPagesClient.tsx",
    "AdminContentPagesClient",
    {
      pages: [
        {
          slug: "termos",
          title_pt: "Termos de uso",
          title_en: "Terms of use",
          subtitle_pt: "",
          subtitle_en: "",
          blocks: [],
          isCustomized: true,
          updated_at: null,
        },
      ],
    },
    "system",
  ],
];
const importedActions = new Map();
const { globSync } = require("node:fs");
// Discover named imports so every action is replaced by a deterministic local stub.
for (const file of globSync("src/**/*.tsx")) {
  const source = ts.createSourceFile(
    file,
    await readFile(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  for (const node of source.statements)
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier.text?.startsWith("@/app/actions/")
    ) {
      const path = node.moduleSpecifier.text,
        names = importedActions.get(path) || new Set();
      for (const binding of node.importClause?.namedBindings?.elements || [])
        names.add((binding.propertyName || binding.name).text);
      importedActions.set(path, names);
    }
}
const imports = views
  .map((v, i) => `import {${v[2]} as View${i}} from './${v[1]}';`)
  .join("\n");
const fixtures = views
  .map(
    (v, i) =>
      `{path:${JSON.stringify(v[0])},Component:View${i},props:${JSON.stringify(v[3])},section:${JSON.stringify(v[4])}}`,
  )
  .join(",");
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {NextIntlClientProvider} from 'next-intl';import pt from './src/messages/pt-BR.json';import en from './src/messages/en-US.json';import {AdminLayoutClient} from './src/components/shared/AdminLayoutClient';import {AdminPageHeader} from './src/components/admin/AdminPageHeader';import {Button} from './src/components/ui/Button';import {Modal,ModalTitle} from './src/components/ui/Modal';import {Input} from './src/components/ui/Input';import {navigationForRole} from './src/components/admin/navigation';${imports}
const params=new URLSearchParams(location.search),locale=params.get('locale')||'pt-BR',role=params.get('role')||'admin';const views=[${fixtures}];const view=views.find(v=>v.path===(params.get('view')||'alimentos'))||views[0];window.__path='/'+locale+'/admin/'+view.path;const title=navigationForRole(role).flatMap(g=>g.items).find(i=>i.path===view.path);if(view.path==='financeiro')view.props.overview=new Proxy(view.props.overview,{get:(target,key)=>target[key]??0});function Demo(){const[open,setOpen]=React.useState(false);return <NextIntlClientProvider locale={locale} messages={locale==='en-US'?en:pt} timeZone="America/Sao_Paulo"><AdminLayoutClient locale={locale} role={role} firstName="Nath" lastName="Ramos" onLogout={()=>{window.__logout=true}}><div className="space-y-6"><AdminPageHeader locale={locale} section={view.section}><h1>{title?(locale==='en-US'?title.en:title.pt):view.path}</h1><p>Organize sua operação e acompanhe cada detalhe em um só lugar.</p></AdminPageHeader><view.Component {...view.props} locale={locale}/><Button variant="outline" onClick={()=>setOpen(true)}>Abrir modal de verificação</Button><Modal isOpen={open} onClose={()=>setOpen(false)} aria-label="Verificação do formulário"><ModalTitle>Revisar informações</ModalTitle><label className="mt-4 block text-xs">Nome<Input aria-label="Nome no modal" /></label><div className="mt-5 flex justify-end"><Button onClick={()=>setOpen(false)}>Concluir</Button></div></Modal></div></AdminLayoutClient></NextIntlClientProvider>}createRoot(document.getElementById('root')).render(<Demo/>);`;
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  jsx: "automatic",
  logOverride: { "duplicate-object-key": "silent" },
  outfile: resolve(out, "app.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "qa-stubs",
      setup(b) {
        b.onResolve({ filter: /^next\/(link|navigation|image)$/ }, (a) => ({
          path: a.path,
          namespace: "stub",
        }));
        b.onResolve({ filter: /^@\/app\/actions\// }, (a) => ({
          path: a.path,
          namespace: "stub",
        }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => {
          let contents;
          if (a.path === "next/link")
            contents = `import React from 'react';export default function Link({children,onClick,...props}){return <a {...props} onClick={e=>{e.preventDefault();window.__navigation=props.href;onClick?.(e)}}>{children}</a>}`;
          else if (a.path === "next/image")
            contents = `import React from 'react';export default function Image({fill,priority,...p}){return <img {...p} src={p.src==='/logo.png'?'logo.png':p.src} style={fill?{position:'absolute',width:'100%',height:'100%',objectFit:'contain'}:undefined}/>} `;
          else if (a.path === "next/navigation")
            contents = `export const useRouter=()=>({push:url=>window.__navigation=url,refresh:()=>{}});export const usePathname=()=>window.__path;export const useSearchParams=()=>new URLSearchParams();export const useParams=()=>({locale:new URLSearchParams(location.search).get("locale")||"pt-BR"});`;
          else
            contents = [...(importedActions.get(a.path) || [])]
              .map(
                (name) =>
                  `export async function ${name}(){return {success:false,message:'Visual fixture',items:[],unread:0}}`,
              )
              .join("\n");
          return { loader: "tsx", resolveDir: process.cwd(), contents };
        });
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
    resolve(out, "base.css"),
    "--minify",
  ],
  { stdio: "pipe" },
);
await writeFile(
  resolve(out, "admin.css"),
  await readFile("src/app/[locale]/admin/admin.css"),
);
await writeFile(
  resolve(out, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="admin.css"></head><body style="--font-inter:Arial;font-family:Arial"><div id="root"></div><script src="app.js"></script></body></html>',
);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [1440, 390]) {
    for (const [path] of views) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        "file:///" +
          resolve(out, "index.html").replaceAll("\\", "/") +
          "?view=" +
          path,
      );
      await page.waitForSelector("h1");
      await page
        .getByRole("button", { name: "Abrir modal de verificação" })
        .waitFor();
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      ) {
        const overflow = await page.evaluate(() =>
          [...document.querySelectorAll("*")]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 8)
            .map((e) => ({ tag: e.tagName, class: e.className })),
        );
        throw Error(
          path + " overflow " + width + " " + JSON.stringify(overflow),
        );
      }
      if (
        [
          "alimentos",
          "financeiro",
          "configuracoes",
          "notificacoes",
          "pagamentos",
        ].includes(path)
      )
        await page.screenshot({
          path: resolve(out, path + "-" + width + ".png"),
          fullPage: true,
        });
      if (path === "notificacoes") {
        const first = page.getByRole("tab").first();
        await first.focus();
        await page.keyboard.press("End");
        if (
          (await page.getByRole("tab").last().getAttribute("aria-selected")) !==
          "true"
        )
          throw Error("Tab End navigation");
        await page.keyboard.press("Home");
        if ((await first.getAttribute("aria-selected")) !== "true")
          throw Error("Tab Home navigation");
      }
      if (path === "alimentos") {
        await page
          .getByRole("button", { name: "Abrir modal de verificação" })
          .click();
        await page
          .getByRole("dialog", { name: "Verificação do formulário" })
          .waitFor();
        await page.keyboard.press("Shift+Tab");
        if (
          !(await page.evaluate(
            () => !!document.activeElement.closest("[role=dialog]"),
          ))
        )
          throw Error("Focus trap");
        await page.keyboard.press("Escape");
        if (await page.getByRole("dialog").count())
          throw Error("Modal Escape failed");
        await page
          .getByRole("button", { name: "Notificações", exact: true })
          .click();
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
        )
          throw Error("Notification overflow");
        await page.keyboard.press("Escape");
        await page.keyboard.press("Control+k");
        await page
          .getByLabel("Nome da página", { exact: true })
          .fill("assinatura");
        await page
          .getByRole("dialog")
          .getByRole("link", { name: "Assinaturas", exact: true })
          .waitFor();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        if (
          !(await page.evaluate(() => window.__navigation)).includes(
            "/assinaturas",
          )
        )
          throw Error("Command navigation");
        await page.getByLabel("Opções da conta", { exact: true }).click();
        if (await page.evaluate(() => window.__logout))
          throw Error("Avatar logged out");
        await page.keyboard.press("Escape");
        if (width === 390) {
          await page.getByLabel("Abrir navegação", { exact: true }).click();
          await page
            .getByRole("dialog", { name: "Navegação", exact: true })
            .waitFor();
          await page.keyboard.press("Escape");
          if (await page.getByRole("dialog").count())
            throw Error("Mobile drawer");
        }
      }
      if (path === "configuracoes" && width === 1440) {
        await page.evaluate(() => window.scrollTo(0, 500));
        const top = await page
          .locator("aside")
          .first()
          .evaluate((el) => el.getBoundingClientRect().top);
        if (Math.abs(top) > 1)
          throw Error("Sidebar must remain visible while scrolling");
      }
      const publicSurface = await page.evaluate(() =>
        getComputedStyle(document.body).getPropertyValue("--surface").trim(),
      );
      if (publicSurface !== "0 0% 4%")
        throw Error("Admin theme escaped its scope");
      if (errors.length) throw Error(path + ": " + errors.join("\n"));
      console.log(`${path} ${width}px OK`);
      await page.close();
    }
  }
  for (const locale of ["pt-BR", "en-US"]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
    });
    await page.goto(
      "file:///" +
        resolve(out, "index.html").replaceAll("\\", "/") +
        "?view=alimentos&role=coach&locale=" +
        locale,
    );
    await page.waitForSelector("h1");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    if (
      await dialog
        .getByRole("link", {
          name: /Assinaturas|Subscriptions|Pagamentos|Payments/,
        })
        .count()
    )
      throw Error("Coach sees financial navigation");
    await page.close();
    console.log(locale + " coach navigation OK");
  }
} finally {
  await browser.close();
}
