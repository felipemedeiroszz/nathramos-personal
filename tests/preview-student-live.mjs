// Two local browser tabs and in-memory fixtures. No remote users or services.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/student-live-ui");
await mkdir(out, { recursive: true });
const nutrition = { calories_kcal: 200, protein_g: 10, carbs_g: 20, fats_g: 5 };
let stage = 0;
function fixture() {
  return {
    stage,
    data: {
      date: "2026-11-03",
      weekStart: "2026-11-02",
      timezone: "America/Sao_Paulo",
      firstName: "Mariana",
      locale: "pt-BR",
      diet: [],
      supplements: [],
      plannedNutrition: nutrition,
      consumedNutrition: {
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fats_g: 0,
      },
      water: [],
      waterTotal: stage * 250,
      waterGoal: 2000 + stage * 100,
      hydrationReminders: true,
      hydrationSilent: true,
      hydrationFrequency: 60,
      quietStart: null,
      quietEnd: null,
      shopping: [],
      sleep: [],
      weight: [],
      logs: [],
    },
    profile: {
      id: "fixture",
      first_name: "Mariana " + stage,
      last_name: "Aluna",
      email: "fixture@example.test",
      phone: "",
      birth_date: "",
      gender: "",
      height_cm: 165,
      weight_kg: 60 + stage,
      country: "Brasil",
      language: "pt-BR",
      avatar_url: null,
    },
    notices: [
      {
        id: "notice",
        title: "Orientação " + stage,
        body: "Plano atualizado " + stage,
        type: "workout",
        created_at: "2026-11-03T12:00:00Z",
        read_at: null,
      },
    ],
    today: {
      program: { title_pt: "Programa " + stage, title_en: "Program " + stage },
      day: { name_pt: "Perna " + stage, name_en: "Legs " + stage },
      exerciseCount: 5,
      estimatedMinutes: 45,
      available: true,
    },
    sessions: stage
      ? [
          {
            id: "session",
            scheduled_date: "2026-11-03",
            completed_at: "2026-11-03T12:00:00Z",
            duration_min: 40,
            total_volume_kg: 100 + stage,
            feeling: 5,
            notes: "Sessão " + stage,
          },
        ]
      : [],
  };
}
const entry = `import React,{useState,useEffect} from 'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import pt from './src/messages/pt-BR.json';import{LiveDataRefresh}from'./src/components/shared/LiveDataRefresh';import{TodayWorkoutCard}from'./src/components/student/workout/TodayWorkoutCard';import{WorkoutHistory}from'./src/components/student/workout/WorkoutHistory';import{HydrationClient}from'./src/components/student/RoutineClients';import{AccountPageClient}from'./src/components/shared/AccountPageClient';import{NotificationsCenterClient}from'./src/components/shared/NotificationsCenterClient';import{NotificationBell}from'./src/components/shared/NotificationBell';import{notifyDataChanged}from'./src/lib/live/events';
function App(){const[s,set]=useState(null);window.__refresh=async()=>{const r=await fetch('/state');set(await r.json())};useEffect(()=>{window.__refresh()},[]);if(!s)return null;return <NextIntlClientProvider locale="pt-BR" messages={pt} timeZone="America/Sao_Paulo"><LiveDataRefresh/><main className="mx-auto max-w-5xl space-y-6 p-4"><h1>Versão {s.stage}</h1><NotificationBell locale="pt-BR" namespace="studentNotifications"/><TodayWorkoutCard locale="pt-BR" userId="fixture"/><section id="history"><WorkoutHistory locale="pt-BR" userId="fixture"/></section><section id="water"><HydrationClient data={s.data}/></section><section id="inbox"><NotificationsCenterClient locale="pt-BR" userId="fixture" initialItems={s.notices}/></section><section id="account"><AccountPageClient locale="pt-BR" profile={s.profile} subscription={null} payments={[]} access={{allowed:true,status:'active',reason:''}} notificationPreferences={{email:{},push:{}}} notificationSettings={{push_enabled:false,quiet_hours_start:null,quiet_hours_end:null}} notificationDevices={0}/></section><dialog id="test-dialog" open style={{position:'static'}}>Diálogo aberto</dialog></main></NextIntlClientProvider>}
if(new URLSearchParams(location.search).has('admin')){document.body.innerHTML='<button id="change">Atualizar prescrição</button>';document.querySelector('button').onclick=async()=>{await fetch('/mutate',{method:'POST'});notifyDataChanged()}}else createRoot(document.getElementById('root')).render(<App/>);`;
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
        for (const filter of [
          /^next\/(navigation|link|image)$/,
          /^@\/app\/actions\//,
          /^@\/lib\/supabase\/client$/,
          /^react-dom$/,
        ])
          b.onResolve({ filter }, (a) =>
            a.path === "react-dom" && !a.importer.includes("AccountPageClient")
              ? undefined
              : { path: a.path, namespace: "stub" },
          );
        b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => {
          let contents;
          if (a.path === "react-dom")
            contents = `export const useFormState=()=>[null,()=>{}];export const useFormStatus=()=>({pending:false});`;
          else if (a.path === "next/navigation")
            contents = `const router={refresh:()=>window.__refresh?.(),replace(){},push(){}};export const useRouter=()=>router;export const usePathname=()=>'/pt-BR/dashboard';export const useParams=()=>({locale:'pt-BR'});export const useSearchParams=()=>new URLSearchParams();`;
          else if (a.path === "next/link")
            contents = `import React from 'react';export default function Link({children,...p}){return <a {...p}>{children}</a>}`;
          else if (a.path === "next/image")
            contents = `import React from 'react';export default function Image({fill,priority,...p}){return <img {...p}/>}`;
          else if (a.path.endsWith("supabase/client"))
            contents = `export function createClientBrowser(){const channel={on(e,f,cb){window.__pulse=cb;return channel},subscribe(cb){queueMicrotask(()=>cb?.('SUBSCRIBED'));return channel}};return {channel:()=>channel,removeChannel:async()=>{},auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}`;
          else if (a.path.endsWith("/notifications"))
            contents = `export async function getMyNotificationsAction(){const s=await(await fetch('/state')).json();return {items:s.notices,unread:s.notices.length}}export async function getNotificationPreferencesAction(){return {devices:0}}export async function markAllNotificationsReadAction(){}export async function markNotificationReadAction(){}export async function saveNotificationPreferencesAction(){return {success:true}}export async function saveNotifySettingsAction(){return {success:true}}`;
          else if (a.path.endsWith("/routine"))
            contents = `export async function recordHealthAction(){return {success:true}}export async function saveHydrationAction(){return {success:true}}export async function setRoutineItemAction(){return {success:true}}export async function setShoppingAction(){return {success:true}}export async function waterAction(){return {success:true}}`;
          else
            contents = `export async function updateProfileAction(){return {success:true}}export async function changePasswordAction(){return {success:true}}export async function changeEmailAction(){return {success:true}}export async function uploadPhotoAction(){return {success:true}}export async function removePhotoAction(){return {success:true}}export async function logoutAction(){}`;
          return { contents, loader: "tsx", resolveDir: process.cwd() };
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
  resolve(out, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"></head><body style="font-family:Arial"><div id="root"></div><script src="/app.js"></script></body></html>',
);
const server = createServer(async (req, res) => {
  if (req.url === "/mutate") {
    stage++;
    res.setHeader("content-type", "application/json");
    res.end("{}");
    return;
  }
  if (req.url === "/state" || req.url.startsWith("/api/workout/")) {
    const f = fixture();
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    res.end(
      JSON.stringify(
        req.url === "/state"
          ? f
          : req.url.includes("/today")
            ? f.today
            : { sessions: f.sessions },
      ),
    );
    return;
  }
  try {
    const path = req.url.startsWith("/app.js")
      ? "app.js"
      : req.url.startsWith("/base.css")
        ? "base.css"
        : "index.html";
    res.setHeader(
      "content-type",
      path.endsWith(".js")
        ? "text/javascript"
        : path.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(await readFile(resolve(out, path)));
  } catch {
    res.statusCode = 500;
    res.end("Fixture failure");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [390, 1440]) {
    stage = 0;
    const context = await browser.newContext({
        viewport: { width, height: 1000 },
      }),
      admin = await context.newPage(),
      student = await context.newPage(),
      errors = [];
    let navigations = 0;
    student.on("pageerror", (e) => {
      errors.push(e.message);
      console.error(e.message);
    });
    student.on("framenavigated", (f) => {
      if (f === student.mainFrame()) navigations++;
    });
    await admin.goto(base + "/?admin");
    await student.goto(base + "/");
    await student.bringToFront();
    await student
      .getByRole("heading", { name: "Perna 0", exact: true })
      .waitFor();
    await student.locator("input[name=first_name]").fill("Rascunho do aluno");
    await admin.evaluate(() => document.querySelector("#change").click());
    await student
      .getByRole("heading", { name: "Perna 1", exact: true })
      .waitFor();
    await student
      .getByRole("heading", { name: "Versão 1", exact: true })
      .waitFor();
    assert.equal(
      await student.locator("input[name=first_name]").inputValue(),
      "Rascunho do aluno",
    );
    assert.equal(
      await student.locator("input[name=weight_kg]").inputValue(),
      "60",
    ); // same draft remains intact
    assert.equal(
      await student
        .locator("#inbox")
        .innerText()
        .then((s) => s.includes("Orientação 1")),
      true,
    );
    await student
      .locator("#history")
      .getByText("40 min", { exact: true })
      .waitFor();
    const goal = student.locator('#water input[min="500"]');
    await goal.fill("2800");
    await admin.evaluate(async () => {
      await fetch("/mutate", { method: "POST" });
    });
    await student.evaluate(() => window.__pulse({ new: { revision: 2 } }));
    await student
      .getByRole("heading", { name: "Perna 2", exact: true })
      .waitFor();
    assert.equal(await goal.inputValue(), "2800");
    assert.equal(
      await student.locator("input[name=first_name]").inputValue(),
      "Rascunho do aluno",
    );
    // No event: the shared 15-second fallback still refreshes the entire view.
    await admin.evaluate(async () => {
      await fetch("/mutate", { method: "POST" });
    });
    await student
      .getByRole("heading", { name: "Perna 3", exact: true })
      .waitFor({ timeout: 22000 });
    assert.equal(await goal.inputValue(), "2800");
    assert.equal(navigations, 1);
    assert.deepEqual(errors, []);
    await student.screenshot({
      path: resolve(out, `student-live-${width}.png`),
      fullPage: true,
    });
    await context.close();
  }
  console.log(
    "Two-tab student updates passed: live pulse, broadcast, fallback, open dialog, focused drafts, no F5 (390/1440).",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
