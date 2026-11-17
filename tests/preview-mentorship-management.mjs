import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  out = resolve("artifacts/mentorship-management");
await mkdir(out, { recursive: true });
const room = {
  id: "80000000-0000-4000-8000-000000000001",
  user_id: "student",
  is_active: true,
  student_name: "Ana Souza",
  student_email: "ana@example.test",
  unread_count_coach: 2,
  unread_count_user: 0,
  last_message_at: "2026-11-17T12:00:00Z",
  last_message_preview: "Preciso de orientação",
};
await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import pt from${JSON.stringify(resolve("src/messages/pt-BR.json"))};import en from${JSON.stringify(resolve("src/messages/en-US.json"))};import{AdminMentoriaClient}from${JSON.stringify(resolve("src/components/admin/mentoring/AdminMentoriaClient.tsx"))};const params=new URLSearchParams(location.search),locale=params.get('locale')||'pt-BR';window.__calls=[];createRoot(document.getElementById('root')).render(<NextIntlClientProvider locale={locale} messages={locale==='en-US'?en:pt} timeZone="America/Sao_Paulo"><AdminMentoriaClient canDelete={!params.has('coach')} currentUserId="admin" rooms={[${JSON.stringify(room)}]} initialRoomId={${JSON.stringify(room.id)}} initialMessages={[]}/></NextIntlClientProvider>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: join(out, "app.js"),
  bundle: true,
  platform: "browser",
  jsx: "automatic",
  alias: {
    react: resolve("node_modules/next/dist/compiled/react"),
    "react-dom": resolve("node_modules/next/dist/compiled/react-dom"),
  },
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "fixtures",
      setup(b) {
        b.onResolve(
          {
            filter:
              /^(next\/(navigation|link)|@\/app\/actions\/mentoring|@\/components\/mentoring\/MentorChat)$/,
          },
          (a) => ({ path: a.path, namespace: "mock" }),
        );
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
          contents: a.path.endsWith("navigation")
            ? "export const useRouter=()=>({refresh(){}})"
            : a.path.endsWith("link")
              ? 'import React from"react";export default function Link({children,...p}){return React.createElement("a",p,children)}'
              : a.path.endsWith("MentorChat")
                ? 'import React from"react";export const mapRawRow=x=>x;export function MentorChat({readOnly}){return <textarea aria-label="mock-composer" disabled={readOnly}/>;}'
                : 'export async function fetchRoomMessagesAction(){return {success:true,data:[]}};export async function manageMentorshipConversationAction(room,operation){window.__calls.push({room,operation});return window.__fail?{success:false,message:"Falha simulada"}:{success:true}}',
          loader: "tsx",
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
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><style>body{background:#0b0c0e;color:#eee;padding:16px;font-family:Arial}#root{max-width:1180px;margin:auto}</style><div id="root"></div><script src="/app.js"></script>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const en = locale === "en-US",
        page = await browser.newPage({ viewport: { width, height: 1000 } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/?locale=" + locale);
      await page
        .getByRole("button", {
          name: en ? "Archive conversation" : "Arquivar conversa",
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: /Ana Souza/ }).click();
      await page
        .getByRole("button", {
          name: en ? "Reopen conversation" : "Reabrir conversa",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page.getByRole("textbox", { name: "mock-composer" }).isDisabled(),
        true,
      );
      await page
        .getByRole("button", {
          name: en ? "Reopen conversation" : "Reabrir conversa",
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: /Ana Souza/ }).click();
      assert.equal(
        await page.getByRole("textbox", { name: "mock-composer" }).isDisabled(),
        false,
      );
      await page
        .getByRole("button", {
          name: en ? "Delete history" : "Excluir conversa",
          exact: true,
        })
        .click();
      await page.getByRole("alertdialog").waitFor();
      await page
        .getByRole("button", { name: en ? "Cancel" : "Cancelar", exact: true })
        .click();
      assert.equal(await page.getByRole("alertdialog").count(), 0);
      assert.equal(await page.evaluate(() => window.__calls.length), 2);
      await page
        .getByRole("button", {
          name: en ? "Delete history" : "Excluir conversa",
          exact: true,
        })
        .click();
      await page.screenshot({
        path: join(out, `confirm-${locale}-${width}.png`),
        fullPage: true,
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page
        .getByRole("button", {
          name: en ? "Confirm deletion" : "Confirmar exclusão",
          exact: true,
        })
        .click();
      await page.waitForFunction(() => window.__calls.length === 3);
      assert.deepEqual(
        await page.evaluate(() => window.__calls.map((c) => c.operation)),
        ["archive", "reopen", "delete"],
      );
      await page.goto(origin + "/?coach=1&locale=" + locale);
      await page
        .getByRole("button", {
          name: en ? "Archive conversation" : "Arquivar conversa",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", {
            name: en ? "Delete history" : "Excluir conversa",
            exact: true,
          })
          .count(),
        0,
      );
      await page.evaluate(() => (window.__fail = true));
      await page
        .getByRole("button", {
          name: en ? "Archive conversation" : "Arquivar conversa",
          exact: true,
        })
        .click();
      await page.getByText("Falha simulada").waitFor();
      assert.equal(
        await page.getByRole("textbox", { name: "mock-composer" }).isDisabled(),
        false,
      );
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `Mentoria ${locale} ${width}: arquivar, reabrir, confirmação, cancelamento e permissões OK`,
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
