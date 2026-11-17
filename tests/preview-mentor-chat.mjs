import { build } from "esbuild";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = path.resolve("artifacts/public-site/chat-fixture");
await mkdir(out, { recursive: true });
await writeFile(
  path.join(out, "router.mjs"),
  `export const useRouter=()=>({refresh(){},push(){}});export const useParams=()=>({locale:"pt-BR"});export const usePathname=()=>"/pt-BR/conversas";`,
);
await writeFile(
  path.join(out, "transport.mjs"),
  `const bus=new BroadcastChannel('chat-test');let handler,status,live=true;bus.onmessage=e=>{if(live)handler?.({new:e.data})};export function createClientBrowser(){const c={on(_event,_filter,fn){handler=fn;return c},subscribe(fn){status=fn;setTimeout(()=>fn('SUBSCRIBED'),0);return c}};window.__disconnect=()=>{live=false;status('CHANNEL_ERROR')};window.__reconnect=()=>{live=true;status('SUBSCRIBED')};return {channel:()=>c,removeChannel:()=>{handler=null;bus.close()}}}export async function sendChatMessageAction(input){if(window.__fail)return {success:false,message:'Falha simulada'};const r=await fetch('/fixture',{method:'POST',body:JSON.stringify({...input,sender_id:window.__user})});const row=await r.json();bus.postMessage(row);handler?.({new:row});await new Promise(r=>setTimeout(r,60));return {success:true,data:row}}export async function fetchRoomMessagesAction(){return {success:true,data:await(await fetch('/fixture')).json()}}export async function markRoomReadAction(){return {success:true}}`,
);
await writeFile(
  path.join(out, "entry.jsx"),
  `import React from 'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import pt from '${path.resolve("src/messages/pt-BR.json").replaceAll("\\", "/")}';import{MentorChat}from'${path.resolve("src/components/mentoring/MentorChat.tsx").replaceAll("\\", "/")}';window.__user=new URLSearchParams(location.search).get('user')||'a';createRoot(document.getElementById('app')).render(<NextIntlClientProvider locale="pt-BR" messages={pt} timeZone="America/Sao_Paulo"><MentorChat roomId="room-a" viewer={window.__user==='a'?'user':'coach'} currentUserId={window.__user} counterpartName="Nath Ramos" readOnly={new URLSearchParams(location.search).has("archived")} initialMessages={[]}/></NextIntlClientProvider>);`,
);
await build({
  entryPoints: [path.join(out, "entry.jsx")],
  outfile: path.join(out, "bundle.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  alias: {
    "@": path.resolve("src"),
    "next/navigation": path.join(out, "router.mjs"),
    "@/lib/supabase/client": path.join(out, "transport.mjs"),
    "@/app/actions/mentoring": path.join(out, "transport.mjs"),
  },
  logLevel: "silent",
});
execFileSync(process.execPath, ["node_modules/tailwindcss/lib/cli.js", "-i", "src/app/globals.css", "-o", path.join(out, "base.css"), "--minify"], {stdio:"pipe"});
const cssFiles = [];
let rows = [];
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://fixture");
    if (u.pathname === "/fixture") {
      res.setHeader("Content-Type", "application/json");
      if (req.method === "POST") {
        let body = "";
        for await (const chunk of req) body += chunk;
        const v = JSON.parse(body);
        const row = {
          id: crypto.randomUUID(),
          room_id: "room-a",
          sender_id: v.sender_id,
          sender_type: v.sender_id === "a" ? "user" : "coach",
          content: v.content,
          created_at: new Date().toISOString(),
        };
        rows.push(row);
        res.end(JSON.stringify(row));
      } else res.end(JSON.stringify(rows));
      return;
    }
    if (
      u.pathname === "/bundle.js" ||
      u.pathname === "/bundle.css" ||
      u.pathname === "/base.css" ||
      u.pathname.startsWith("/_next/static/css/")
    ) {
      const file = u.pathname.startsWith("/_next")
        ? path.resolve(".next/static/css", path.basename(u.pathname))
        : path.join(out, u.pathname.slice(1));
      res.setHeader(
        "Content-Type",
        file.endsWith(".css") ? "text/css" : "application/javascript",
      );
      res.end(await readFile(file));
      return;
    }
    res.setHeader("Content-Type", "text/html;charset=utf-8");
    res.end(
      '<html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
        cssFiles
          .map(
            (n) => '<link rel="stylesheet" href="/_next/static/css/' + n + '">',
          )
          .join("") +
        '<link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/bundle.css"></head><body style="--font-inter:Arial,sans-serif;font-family:Arial,sans-serif;background:#0d1215;margin:0"><div id="app" style="height:85dvh;max-width:850px;margin:auto"></div><script src="/bundle.js"></script></body></html>',
    );
  } catch (e) {
    res.statusCode = 500;
    res.end(String(e));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const context = await browser.newContext();
  const a = await context.newPage(),
    b = await context.newPage();
  for (const p of [a, b])
    p.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  await a.setViewportSize({ width: 390, height: 900 });
  await b.setViewportSize({ width: 1280, height: 900 });
  await a.goto(base + "?user=a");
  await b.goto(base + "?user=b");
  await a.getByText("Conexão em tempo real", { exact: true }).waitFor();
  await b.getByText("Conexão em tempo real", { exact: true }).waitFor();
  const input = a.getByRole("textbox");
  await input.fill("Treino de hoje ");
  await a.getByRole("button", { name: "Escolher emoji" }).click();
  await a.getByRole("button", { name: "💪", exact: true }).click();
  assert.ok((await input.inputValue()).includes("💪"));
  await input.press("Enter");
  await b.getByText("Treino de hoje 💪", { exact: true }).waitFor();
  assert.equal(
    await a.getByText("Treino de hoje 💪", { exact: true }).count(),
    1,
  );
  await a.evaluate(() => window.__disconnect());
  await b.getByRole("textbox").fill("Mensagem durante reconexão");
  await b.getByRole("textbox").press("Enter");
  await b.getByText("Mensagem durante reconexão", { exact: true }).waitFor();
  await a.evaluate(() => window.__reconnect());
  await a.getByText("Mensagem durante reconexão", { exact: true }).waitFor();
  await a.evaluate(() => (window.__fail = true));
  await input.fill("Manter rascunho");
  await input.press("Enter");
  await a.getByRole("alert").waitFor();
  assert.equal(await input.inputValue(), "Manter rascunho");
  assert.equal(rows.length, 2);
  await a.evaluate(() => (window.__fail = false));
  await input.press("Enter");
  await b.getByText("Manter rascunho", { exact: true }).waitFor();
  assert.equal(rows.length, 3);
  assert.ok(
    await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await a.screenshot({
    path: path.join(out, "chat-mobile.png"),
    fullPage: true,
  });
  await b.screenshot({
    path: path.join(out, "chat-desktop.png"),
    fullPage: true,
  });
  await a.goto(base + "?user=a&archived=1");
  await a.getByText("Conversa arquivada.", { exact: false }).waitFor();
  assert.equal(await a.getByRole("textbox").isDisabled(), true);
  assert.equal(
    await a.getByRole("button", { name: "Escolher emoji" }).isDisabled(),
    true,
  );
  assert.equal(rows.length, 3);
  console.log(
    "PASS archived composer disabled; two sessions: emoji, realtime receipt, deduplication, reconnect recovery, failed send preserves draft, mobile overflow",
  );
} finally {
  await browser.close();
  server.close();
}
