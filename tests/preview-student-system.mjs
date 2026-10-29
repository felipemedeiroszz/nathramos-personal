// Local fixture preview. Actions, realtime and fetch are stubbed; no remote records are changed.
import { build } from "esbuild";
import ts from "typescript";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { globSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/student-design-system");
await mkdir(out, { recursive: true });
await copyFile("public/logo.png", resolve(out, "logo.png"));
const nutrition = {
  calories_kcal: 450,
  protein_g: 30,
  carbs_g: 50,
  fats_g: 14,
};
const meal = {
  key: "meal-1",
  kind: "diet",
  assignmentId: "diet-assignment",
  itemId: "food-1",
  kit: "Plano alimentar",
  name: "Arroz integral com frango",
  quantity: 200,
  unit: "g",
  slot: "12:00",
  mealType: "lunch",
  notes: "Orientação da sua treinadora.",
  done: false,
  foodId: "food-1",
  nutrition,
};
const supplement = {
  ...meal,
  key: "supp-1",
  kind: "supplement",
  assignmentId: "supp-assignment",
  itemId: "supp-1",
  name: "Suplemento prescrito",
  quantity: 5,
  unit: "g",
  slot: "08:00",
  mealType: "other",
  foodId: null,
  nutrition: null,
  kit: "Suplementação",
};
const data = {
  date: "2026-10-29",
  weekStart: "2026-10-26",
  timezone: "America/Sao_Paulo",
  firstName: "Mariana",
  locale: "pt-BR",
  diet: [
    meal,
    {
      ...meal,
      key: "meal-2",
      itemId: "food-2",
      name: "Iogurte e frutas",
      quantity: 150,
      slot: "15:00",
      mealType: "afternoon_snack",
      done: true,
    },
    {
      ...meal,
      key: "meal-3",
      itemId: "food-3",
      name: "Jantar",
      slot: "20:00",
      mealType: "dinner",
    },
  ],
  supplements: [
    supplement,
    {
      ...supplement,
      key: "supp-2",
      itemId: "supp-2",
      slot: "20:00",
      done: true,
    },
  ],
  plannedNutrition: {
    calories_kcal: 1800,
    protein_g: 120,
    carbs_g: 180,
    fats_g: 60,
  },
  consumedNutrition: nutrition,
  water: [
    { id: 1, amount_ml: 500, logged_date: "2026-10-29", logged_time: "08:00" },
    { id: 2, amount_ml: 750, logged_date: "2026-10-29", logged_time: "11:30" },
    { id: 3, amount_ml: 1750, logged_date: "2026-10-28", logged_time: "19:30" },
  ],
  waterTotal: 1250,
  waterGoal: 2000,
  hydrationReminders: true,
  hydrationSilent: true,
  hydrationFrequency: 60,
  quietStart: "22:00",
  quietEnd: "07:00",
  shopping: [
    {
      foodId: "food-1",
      name: "Arroz integral",
      quantities: [{ quantity: 150, unit: "g" }],
      bought: false,
    },
    {
      foodId: "food-2",
      name: "Frango",
      quantities: [{ quantity: 200, unit: "g" }],
      bought: true,
    },
  ],
  sleep: [{ logged_date: "2026-10-29", total_minutes: 450 }],
  weight: [
    { logged_date: "2026-10-29", weight_kg: 62 },
    { logged_date: "2026-10-15", weight_kg: 62.5 },
  ],
  logs: [
    { kind: "diet", logged_date: "2026-10-29" },
    { kind: "supplement", logged_date: "2026-10-28" },
    { kind: "diet", logged_date: "2026-10-26" },
  ],
};
const program = {
  id: "program",
  title_pt: "Força e condicionamento",
  title_en: "Strength and conditioning",
};
const day = {
  id: "day",
  name_pt: "Treino A · Membros inferiores",
  name_en: "Workout A · Lower body",
  focus_pt: "Força e mobilidade",
  focus_en: "Strength and mobility",
};
const exercises = [
  {
    id: "workout-exercise",
    exercise_id: "exercise",
    sets: 2,
    reps: "10",
    weight_kg: 20,
    rest_seconds: 30,
    exercise: {
      id: "exercise",
      name_pt: "Agachamento",
      name_en: "Squat",
      primary_muscle: "quadriceps",
      equipment: "bodyweight",
      difficulty: "beginner",
    },
  },
];
const notice = {
  id: "notice-1",
  title: "Seu acompanhamento foi atualizado",
  body: "Sua treinadora atualizou as orientações da sua rotina.",
  read_at: null,
  created_at: "2026-10-29T12:00:00Z",
  type: "system",
  url: null,
};
const payment = {
  id: "payment",
  status: "paid",
  amount_cents: 29900,
  currency: "BRL",
  method: "credit_card",
  provider: "stripe",
  created_at: "2026-10-29T12:00:00Z",
  paid_at: "2026-10-29T12:00:00Z",
  refunded_amount_cents: 0,
  description_pt: "Consultoria mensal",
  description_en: "Monthly coaching",
};
const billing = {
  name: "Mariana",
  access: { allowed: true, status: "active" },
  subscription: {
    id: "subscription",
    status: "active",
    provider: "stripe",
    external_id: "sub_fixture",
    cancel_at_period_end: false,
    unit_amount_cents: 29900,
    currency: "BRL",
    billing_cycle_days: 30,
    current_period_end: "2026-11-29T12:00:00Z",
    plan: { name_pt: "Consultoria Premium", name_en: "Premium coaching" },
  },
  payments: { rows: [payment], page: 1, total: 1, size: 15, status: "all" },
  operations: [],
};
const views = [
  [
    "dashboard",
    "src/components/student/StudentHome.tsx",
    "StudentHome",
    {
      locale: "pt-BR",
      userId: "fixture",
      data,
      notices: [notice],
      upcoming: [
        {
          id: "meeting",
          title_pt: "Acompanhamento mensal",
          title_en: "Monthly coaching",
          start_at: "2026-11-02T14:00:00Z",
        },
      ],
      unread: 2,
    },
  ],
  [
    "dieta",
    "src/components/student/RoutineClients.tsx",
    "DailyItemsClient",
    {
      items: data.diet,
      kind: "diet",
      consumed: data.consumedNutrition,
      planned: data.plannedNutrition,
    },
  ],
  [
    "suplementos",
    "src/components/student/RoutineClients.tsx",
    "DailyItemsClient",
    { items: data.supplements, kind: "supplement" },
  ],
  [
    "hidratacao",
    "src/components/student/RoutineClients.tsx",
    "HydrationClient",
    { data },
  ],
  [
    "lista-compras",
    "src/components/student/RoutineClients.tsx",
    "ShoppingClient",
    { data },
  ],
  [
    "progresso",
    "src/components/student/RoutineClients.tsx",
    "HealthLogClient",
    {},
  ],
  [
    "treino",
    "src/components/student/workout/StudentWorkoutExecutionClient.tsx",
    "StudentWorkoutExecutionClient",
    {
      program,
      day,
      sessionId: "session",
      exercises,
      locale: "pt-BR",
      initialLogs: [],
    },
  ],
  [
    "ebooks",
    "src/app/[locale]/(student)/ebooks/EbookLibraryClient.tsx",
    "EbookLibraryClient",
    {
      locale: "pt-BR",
      ebooks: [
        {
          id: "ebook",
          title_pt: "Guia da sua jornada",
          title_en: "Your journey guide",
          summary_pt: "Conteúdo para complementar seu acompanhamento.",
          summary_en: "Content to complement your coaching.",
          categories_pt: ["Bem-estar"],
          categories_en: ["Wellness"],
          is_free: true,
          is_published: true,
          price_cents: 0,
          currency: "BRL",
          file_url: null,
        },
      ],
      paidIds: [],
      purchaseStatus: null,
    },
  ],
  [
    "exames",
    "src/app/[locale]/(student)/exames/StudentExamsClient.tsx",
    "StudentExamsClient",
    { locale: "pt-BR", exams: [], categories: [] },
  ],
  [
    "notificacoes",
    "src/components/shared/NotificationsCenterClient.tsx",
    "NotificationsCenterClient",
    { locale: "pt-BR", userId: "fixture", initialItems: [notice] },
  ],
  [
    "account",
    "src/components/shared/AccountPageClient.tsx",
    "AccountPageClient",
    {
      locale: "pt-BR",
      profile: {
        id: "fixture",
        first_name: "Mariana",
        last_name: "Oliveira",
        email: "mariana@example.test",
        phone: null,
        birth_date: "1995-04-15",
        gender: "female",
        height_cm: 165,
        weight_kg: 62,
        country: "Brasil",
        language: "pt-BR",
        avatar_url: null,
      },
      subscription: null,
      payments: [],
      access: { allowed: true, status: "active" },
      notificationPreferences: { email: {}, push: {} },
      notificationSettings: {},
      notificationDevices: 0,
    },
  ],
  [
    "assinatura",
    "src/components/payments/PaymentCenter.tsx",
    "PaymentCenter",
    { locale: "pt-BR", data: billing },
  ],
  [
    "conversas",
    "src/components/mentoring/MentorChat.tsx",
    "MentorChat",
    {
      roomId: "room",
      viewer: "user",
      currentUserId: "fixture",
      counterpartName: "Nath Ramos",
      initialMessages: [
        {
          id: "message",
          roomId: "room",
          senderId: "coach",
          senderType: "coach",
          content: "Olá, Mariana! Como foi o treino de hoje?",
          createdAt: "2026-10-29T12:00:00Z",
        },
      ],
      className: "h-[500px] rounded-[20px] border border-white/10 bg-surface",
    },
  ],
  [
    "empty-diet",
    "src/components/student/RoutineClients.tsx",
    "DailyItemsClient",
    { items: [], kind: "diet" },
  ],
  [
    "blocked",
    "src/components/student/RoutineSummary.tsx",
    "RoutineSummary",
    { data },
  ],
  [
    "maintenance",
    "src/components/student/RoutineSummary.tsx",
    "RoutineSummary",
    { data },
  ],
  [
    "expired",
    "src/components/student/RoutineSummary.tsx",
    "RoutineSummary",
    { data },
  ],
  [
    "billing-blocked",
    "src/components/payments/PaymentCenter.tsx",
    "PaymentCenter",
    {
      locale: "pt-BR",
      data: {
        ...billing,
        access: { allowed: false, status: "blocked" },
        subscription: {
          ...billing.subscription,
          status: "blocked",
          provider: "asaas",
          source: "asaas_pix",
          external_id: "pay_fixture",
          current_period_end: "2026-10-01T12:00:00Z",
        },
      },
    },
  ],
];
views.push([
  "start",
  "src/components/student/workout/StartWorkoutButton.tsx",
  "StartWorkoutButton",
  { dayId: "day", programId: "program" },
]);
const selected = process.env.STUDENT_VIEWS?.split(",");
const actions = new Map();
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
        names = actions.get(path) || new Set();
      for (const binding of node.importClause?.namedBindings?.elements || [])
        names.add((binding.propertyName || binding.name).text);
      actions.set(path, names);
    }
}
const imports = views
  .map((v, i) => `import {${v[2]} as View${i}} from './${v[1]}';`)
  .join("\n");
const fixtures = views
  .map(
    (v, i) =>
      `{path:${JSON.stringify(v[0])},Component:View${i},props:${JSON.stringify(v[3])}}`,
  )
  .join(",");
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {NextIntlClientProvider} from 'next-intl';import pt from './src/messages/pt-BR.json';import en from './src/messages/en-US.json';import {StudentLayoutClient} from './src/components/shared/StudentLayoutClient';import {StudentPageHeader} from './src/components/student/StudentPageHeader';import {studentNavigation} from './src/components/student/navigation';${imports}
const params=new URLSearchParams(location.search),locale=params.get('locale')||'pt-BR',key=params.get('view')||'dashboard',views=[${fixtures}],view=views.find(v=>v.path===key)||views[0];window.__path='/'+locale+'/'+(key==='billing-blocked'?'assinatura':key==='blocked'||key==='maintenance'||key==='expired'?'dashboard':key);window.__actions=[];window.__fail=false;window.fetch=async(url)=>new Response(JSON.stringify(String(url).includes('/api/workout/today')?{available:true,program:${JSON.stringify(program)},day:${JSON.stringify(day)},exerciseCount:4,estimatedMinutes:45}:String(url).includes('history')?{sessions:[]}:{}),{status:params.get('fail')==='true'?500:200,headers:{'Content-Type':'application/json'}});if(view.props.data?.date)view.props.data={...view.props.data,locale};if(view.props.locale)view.props.locale=locale;const item=studentNavigation.flatMap(g=>g.items).find(i=>i.path===key);createRoot(document.getElementById('root')).render(<NextIntlClientProvider locale={locale} messages={locale==='en-US'?en:pt} timeZone="America/Sao_Paulo"><StudentLayoutClient locale={locale} firstName="Mariana" subscriptionAllowed={!['blocked','billing-blocked'].includes(key)} accessExpiresAt={key==='expired'?'2020-01-01T12:00:00Z':undefined} maintenance={{active:key==='maintenance',until:null}} onLogout={async()=>{window.__logout=true}}><div className="space-y-6">{key!=='dashboard'&&key!=='account'&&key!=='ebooks'&&!key.includes('billing')&&key!=='assinatura'&&<StudentPageHeader locale={locale} title={item?(locale==='en-US'?item.en:item.pt):key} description={item?(locale==='en-US'?item.descriptionEn:item.description):undefined}/>}<view.Component {...view.props}/></div></StudentLayoutClient></NextIntlClientProvider>);`;
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  jsx: "automatic",
  outfile: resolve(out, "app.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  logOverride: { "duplicate-object-key": "silent" },
  plugins: [
    {
      name: "local-fixtures",
      setup(b) {
        b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, (a) => ({
          path: a.path,
          namespace: "stub",
        }));
        b.onResolve(
          {
            filter:
              /^@\/(app\/actions\/|lib\/supabase\/client|lib\/push\/client)/,
          },
          (a) => ({ path: a.path, namespace: "stub" }),
        );
        b.onResolve({ filter: /^react-dom$/ }, (a) =>
          a.importer.includes("src/") || a.importer.includes("src\\")
            ? { path: "forms", namespace: "stub" }
            : undefined,
        );
        b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => {
          let contents;
          if (a.path === "next/link")
            contents = `import React from 'react';export default function Link({children,onClick,...p}){return <a {...p} onClick={e=>{e.preventDefault();window.__navigation=p.href;onClick?.(e)}}>{children}</a>}`;
          else if (a.path === "next/image")
            contents = `import React from 'react';export default function Image({fill,priority,...p}){return <img {...p} src={p.src==='/logo.png'?'logo.png':p.src} style={fill?{position:'absolute',width:'100%',height:'100%',objectFit:'contain'}:undefined}/>} `;
          else if (a.path === "next/navigation")
            contents = `export const useRouter=()=>({push:url=>window.__navigation=url,refresh:()=>{window.__refresh=(window.__refresh||0)+1}});export const usePathname=()=>window.__path;export const useParams=()=>({locale:new URLSearchParams(location.search).get('locale')||'pt-BR'});export const useSearchParams=()=>new URLSearchParams();`;
          else if (a.path === "forms")
            contents = `export const useFormState=()=>[null,()=>{}];export const useFormStatus=()=>({pending:false});`;
          else if (a.path.includes("supabase"))
            contents = `export const createClientBrowser=()=>({channel:()=>{const c={on:()=>c,subscribe:f=>{f?.('SUBSCRIBED');return c}};return c},removeChannel:()=>{}});`;
          else if (a.path.includes("push/client"))
            contents = `export const registerServiceWorker=async()=>{};export const syncPushSubscription=async()=>{};export const pushSupported=()=>false;export const notificationPermission=()=> 'unsupported';export const enablePush=async()=>false;export const disablePush=async()=>{};`;
          else
            contents = [...(actions.get(a.path) || [])]
              .map(
                (name) =>
                  `export async function ${name}(...args){window.__actions.push({name:${JSON.stringify(name)},args});return {success:!window.__fail,message:window.__fail?'Não foi possível salvar.':undefined,items:[],unread:0}}`,
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
await copyFile(
  "src/app/[locale]/(student)/student.css",
  resolve(out, "student.css"),
);
await copyFile("src/app/[locale]/admin/admin.css", resolve(out, "admin.css"));
await writeFile(
  resolve(out, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="admin.css"><link rel="stylesheet" href="student.css"></head><body style="--font-inter:Arial;font-family:Arial"><div id="root"></div><script src="app.js"></script></body></html>',
);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const base = "file:///" + resolve(out, "index.html").replaceAll("\\", "/");
try {
  for (const width of [1440, 390])
    for (const [key] of views.filter(
      (v) => !selected || selected.includes(v[0]),
    )) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "?view=" + key);
      await page.waitForSelector("h1:visible,h2:visible");
      if (key === "expired")
        await page
          .getByText("Assinatura bloqueada", { exact: false })
          .waitFor({ timeout: 3000 })
          .catch(async () => {
            if (await page.locator("#student-main").count())
              throw Error("Expired gate did not block");
          });
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        )
      )
        throw Error(key + " overflow " + width);
      if (
        [
          "dashboard",
          "dieta",
          "hidratacao",
          "treino",
          "account",
          "assinatura",
          "ebooks",
          "exames",
          "conversas",
        ].includes(key)
      ) {
        if (key === "dashboard")
          await page
            .getByText("Treino A · Membros inferiores", { exact: true })
            .waitFor();
        await page.screenshot({
          path: resolve(out, key + "-" + width + ".png"),
          fullPage: true,
        });
      }
      if (key === "dieta") {
        await page
          .getByRole("button", { name: "Pendentes", exact: true })
          .click();
        if (await page.getByText("Iogurte e frutas", { exact: true }).count())
          throw Error("Pending diet filter");
        await page
          .getByRole("button", { name: "Registrados", exact: true })
          .click();
        await page.getByText("Iogurte e frutas", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Todos", exact: true }).click();
        await page.evaluate(() => {
          window.__fail = true;
        });
        await page
          .getByLabel("Registrar Arroz integral com frango", { exact: true })
          .click();
        await page
          .getByText("Não foi possível salvar.", { exact: true })
          .waitFor();
        await page.evaluate(() => {
          window.__fail = false;
        });
        await page
          .getByLabel("Registrar Arroz integral com frango", { exact: true })
          .click();
        await page.getByText("Registro salvo.", { exact: true }).waitFor();
        const input = await page.evaluate(
          () => window.__actions.at(-1).args[0],
        );
        if (
          input.assignmentId !== "diet-assignment" ||
          input.itemId !== "food-1" ||
          input.kind !== "diet" ||
          input.done !== true
        )
          throw Error("Routine payload changed");
      }
      if (key === "hidratacao") {
        await page.getByRole("button", { name: "500 ml", exact: true }).click();
        await page
          .getByRole("button", { name: "Registrar água", exact: true })
          .click();
        await page.getByText("Registro salvo.", { exact: true }).waitFor();
        const input = await page.evaluate(
          () => window.__actions.at(-1).args[0],
        );
        if (input.amount !== 500 || input.operation !== "add")
          throw Error("Water payload");
      }
      if (key === "progresso") {
        await page.getByLabel("Peso (kg)", { exact: true }).fill("63.2");
        await page.getByLabel("Horas dormidas", { exact: true }).fill("7.5");
        await page
          .getByRole("button", { name: "Salvar registro", exact: true })
          .click();
        await page.getByText("Registro salvo.", { exact: true }).waitFor();
        const input = await page.evaluate(
          () => window.__actions.at(-1).args[0],
        );
        if (input.weight !== 63.2 || input.sleepMinutes !== 450)
          throw Error("Health payload");
      }
      if (key === "start") {
        await page
          .getByRole("button", { name: "Iniciar treino", exact: true })
          .click();
        await page.waitForFunction(() =>
          window.__actions.some((a) => a.name === "startWorkoutSessionAction"),
        );
        const input = await page.evaluate(
          () =>
            window.__actions.find((a) => a.name === "startWorkoutSessionAction")
              .args[0],
        );
        if (input.dayId !== "day" || input.programId !== "program")
          throw Error("Start workout payload");
      }
      if (key === "lista-compras") {
        await page.evaluate(() =>
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
              writeText: async (text) => {
                window.__clipboard = text;
              },
            },
          }),
        );
        await page
          .getByRole("button", { name: "Copiar lista", exact: true })
          .click();
        const content = await page.evaluate(() => window.__clipboard);
        if (!content.includes("\n") || !content.includes("Arroz integral"))
          throw Error("Shopping list clipboard formatting");
        await page.getByRole("checkbox").first().click();
        await page.waitForFunction(() =>
          window.__actions.some((a) => a.name === "setShoppingAction"),
        );
        const input = await page.evaluate(
          () =>
            window.__actions.find((a) => a.name === "setShoppingAction").args,
        );
        if (input[0] !== "food-1" || input[1] !== true)
          throw Error("Shopping payload");
      }
      if (key === "treino") {
        const reps = page.getByLabel(
          "Repetições realizadas · Agachamento · 1",
          { exact: true },
        );
        const fallback = page.locator("input[aria-label]").first();
        await ((await reps.count()) ? reps : fallback).fill("10");
        await page.locator("input[aria-label]").nth(1).fill("20");
        await page
          .getByRole("button", { name: "Concluir Série", exact: true })
          .first()
          .click();
        await page.waitForFunction(() =>
          window.__actions.some((a) => a.name === "logWorkoutSetAction"),
        );
        const input = await page.evaluate(
          () =>
            window.__actions.find((a) => a.name === "logWorkoutSetAction")
              .args[0],
        );
        if (
          input.reps_done !== 10 ||
          input.weight_kg !== 20 ||
          input.session_id !== "session"
        )
          throw Error("Workout payload");
      }
      if (key === "dashboard" && width === 390) {
        await page
          .getByRole("button", { name: "Mais opções", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "Mais opções", exact: true })
          .waitFor();
        await page
          .getByRole("dialog")
          .getByRole("link", { name: "Hidratação", exact: true })
          .click();
        if (
          !(await page.evaluate(() => window.__navigation)).endsWith(
            "/hidratacao",
          )
        )
          throw Error("Mobile menu navigation");
        if (await page.getByRole("dialog").count())
          throw Error("Menu did not close");
      }
      if (key === "blocked" || key === "maintenance" || key === "expired") {
        if (await page.locator("#student-main").count())
          throw Error(key + " exposes content");
      }
      if (
        key === "billing-blocked" &&
        !(await page.locator("#student-main").count())
      )
        throw Error("Billing must remain available for renewal");
      if (
        (await page.evaluate(() =>
          getComputedStyle(document.body).getPropertyValue("--surface").trim(),
        )) !== "0 0% 4%"
      )
        throw Error("Student theme escaped scope");
      if (errors.length) throw Error(key + ": " + errors.join("\n"));
      console.log(key + " " + width + "px OK");
      await page.close();
    }
  for (const key of [
    "dashboard",
    "dieta",
    "hidratacao",
    "blocked",
    "billing-blocked",
  ].filter((key) => !selected || selected.includes(key))) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "?view=" + key + "&locale=en-US");
    await page.waitForSelector("h1:visible,h2:visible");
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      )
    )
      throw Error("English overflow " + key);
    if (errors.length) throw Error(errors.join("\n"));
    await page.close();
    console.log(key + " English OK");
  }
} finally {
  await browser.close();
}
