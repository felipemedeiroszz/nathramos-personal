// Browser QA against the real React component and migration RPCs in local PGlite.
// Auth and Storage transport are local fixtures. No remote account is modified.
import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import sharp from "sharp";
import { testDatabase } from "./database.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/community-ui");
await mkdir(out, { recursive: true });
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
const db = await testDatabase();
const images = new Map();
const photo = await sharp({
  create: { width: 700, height: 500, channels: 3, background: "#954763" },
})
  .webp()
  .toBuffer();
await db.query(
  "insert into auth.users(id,email) values($1,'community-a@example.test'),($2,'community-b@example.test')",
  [a, b],
);
await db.query(
  "update profiles set full_name=case when id=$1 then 'Mariana Oliveira' else 'Camila Santos' end where id in ($1,$2)",
  [a, b],
);
await db.query(
  "insert into subscriptions(user_id,plan_id,status,unit_amount_cents) select id,(select id from plans limit 1),'active',100 from profiles where id in ($1,$2)",
  [a, b],
);
const rpc = async (actor, action, input) =>
  (
    await db.query("select community_mutate($1,$2,$3) result", [
      actor,
      action,
      JSON.stringify(input),
    ])
  ).rows[0].result;
const original = await rpc(b, "post", {
  body: "Hoje foi dia de superar meus limites. Mais uma semana de constância, um treino de cada vez.",
  images: [],
  request_id: randomUUID(),
});
const entry = join(out, "entry.jsx");
await writeFile(
  entry,
  `
import React from "react";
import {createRoot} from "react-dom/client";
import {CommunityFeed} from ${JSON.stringify(resolve("src/components/community/CommunityFeed.tsx"))};
createRoot(document.getElementById("root")).render(<CommunityFeed {...window.__fixture}/>);
`,
);
await build({
  entryPoints: [entry],
  outfile: join(out, "app.js"),
  bundle: true,
  jsx: "automatic",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: resolve("tsconfig.json"),
});
const cssFiles = await readdir(".next/static/css");
const tailwind = (
  await Promise.all(
    cssFiles
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFile(join(".next/static/css", f), "utf8")),
  )
).join("\n");
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const actor = req.headers.cookie?.includes("qa-admin=1") ? admin : a;
  const send = (data, status = 200) =>
    res
      .writeHead(status, { "Content-Type": "application/json" })
      .end(JSON.stringify(data));
  try {
    if (url.pathname === "/api/community/image") {
      res
        .writeHead(200, { "Content-Type": "image/webp" })
        .end(images.get(url.searchParams.get("path")) || photo);
      return;
    }
    if (url.pathname === "/api/community") {
      if (req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        if (req.headers["content-type"]?.includes("multipart")) {
          const form = await new Response(Buffer.concat(chunks), {
            headers: { "content-type": req.headers["content-type"] },
          }).formData();
          const file = form.get("file");
          const path = actor + "/" + randomUUID() + ".webp";
          const bytes = await sharp(Buffer.from(await file.arrayBuffer()))
            .webp()
            .toBuffer();
          await db.query("select community_reserve_upload($1,$2)", [
            actor,
            path,
          ]);
          images.set(path, bytes);
          send({ path });
          return;
        }
        const input = JSON.parse(Buffer.concat(chunks).toString());
        send({ id: await rpc(actor, input.action, input) });
        return;
      }
      if (url.searchParams.has("thread")) {
        send(
          (
            await db.query("select community_thread($1,$2,$3,$4) result", [
              actor,
              url.searchParams.get("thread"),
              url.searchParams.get("mode") || "comments",
              Number(url.searchParams.get("offset") || 0),
            ])
          ).rows[0].result,
        );
        return;
      }
      send(
        (
          await db.query("select community_read($1,$2) result", [
            actor,
            JSON.stringify(Object.fromEntries(url.searchParams)),
          ])
        ).rows[0].result,
      );
      return;
    }
    if (url.pathname === "/app.js" || url.pathname === "/app.css") {
      res
        .writeHead(200, {
          "Content-Type": url.pathname.endsWith(".css")
            ? "text/css"
            : "text/javascript",
        })
        .end(await readFile(join(out, url.pathname.slice(1))));
      return;
    }
    if (url.pathname === "/base.css") {
      res.writeHead(200, { "Content-Type": "text/css" }).end(tailwind);
      return;
    }
    const initial = (
      await db.query("select community_read($1,$2) result", [
        actor,
        JSON.stringify({ post: url.searchParams.get("post") || undefined }),
      ])
    ).rows[0].result;
    const fixture = {
      userId: actor,
      locale: url.pathname.includes("en-US") ? "en-US" : "pt-BR",
      admin: actor === admin,
      initial,
      postId: url.searchParams.get("post") || undefined,
    };
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#0a0b0e;font-family:Arial,sans-serif}</style></head><body><div id="root"></div><script>window.__fixture=${JSON.stringify(fixture).replaceAll("<", "\\u003c")}</script><script src="/app.js"></script></body></html>`,
      );
  } catch (error) {
    send({ error: error.message }, 409);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const en = locale === "en-US";
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin + "/" + locale + "/comunidade");
      const text = `Minha conquista ${locale} ${width}`;
      await page
        .getByRole("textbox", {
          name: en ? "Post text" : "Texto da publicação",
        })
        .fill(text);
      const png = await sharp(photo).png().toBuffer();
      await page.locator('input[type="file"]').setInputFiles(
        [0, 1, 2].map((i) => ({
          name: "treino-" + i + ".png",
          mimeType: "image/png",
          buffer: png,
        })),
      );
      await page
        .locator(".community-composer .community-gallery img")
        .nth(2)
        .waitFor();
      await page
        .getByRole("button", { name: en ? "Preview" : "Prévia", exact: true })
        .click();
      assert.equal(
        await page.locator(".community-composer textarea").count(),
        0,
      );
      await page
        .getByRole("button", { name: en ? "Publish" : "Publicar", exact: true })
        .click();
      const card = page
        .locator("article.community-card")
        .filter({ hasText: text });
      await card.waitFor();
      assert.equal(await card.locator(".community-gallery img").count(), 3);
      await card.getByTitle(en ? "Love" : "Amei", { exact: true }).click();
      await page.waitForFunction((text) => {
        const card = [
          ...document.querySelectorAll("article.community-card"),
        ].find((c) => c.textContent.includes(text));
        return (
          card
            ?.querySelector('button[title="Amei"],button[title="Love"]')
            ?.getAttribute("aria-pressed") === "true"
        );
      }, text);
      await card
        .getByRole("button", { name: en ? "Comment" : "Comentar", exact: true })
        .click();
      await card
        .locator(".community-comment-form textarea")
        .fill("Uma conversa de incentivo.");
      await card
        .getByRole("button", { name: en ? "Send" : "Enviar", exact: true })
        .click();
      await card
        .getByText("Uma conversa de incentivo.", { exact: true })
        .waitFor();
      await card
        .getByRole("button", { name: en ? "Reply" : "Responder", exact: true })
        .first()
        .click();
      await card
        .locator(".community-comment-form textarea")
        .fill("Obrigada pela motivação!");
      await card
        .getByRole("button", { name: en ? "Send" : "Enviar", exact: true })
        .click();
      await card
        .getByText("Obrigada pela motivação!", { exact: true })
        .waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false);
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: join(out, `feed-${locale}-${width}.png`),
        fullPage: true,
      });
      await card
        .getByRole("button", {
          name: en ? "Post options" : "Opções da publicação",
        })
        .count()
        .catch(() => {});
      await card.locator("summary").click();
      await card
        .getByRole("button", { name: en ? "Edit" : "Editar", exact: true })
        .click();
      const editor = page
        .locator(".community-composer")
        .filter({ hasText: en ? "Edit post" : "Editar publicação" });
      await editor.locator("textarea").fill(text + " editada");
      await editor
        .getByRole("button", { name: en ? "Publish" : "Publicar", exact: true })
        .click();
      await page.getByText(text + " editada", { exact: true }).waitFor();
      await page.close();
      console.log(
        `Feed ${locale} ${width}: upload, prévia, publicação, reação, comentário, resposta, edição e overflow aprovados.`,
      );
    }
  const participant = await browser.newPage();
  await participant.goto(origin + "/pt-BR/comunidade?post=" + original);
  await participant.locator(".community-comment-form textarea").waitFor();
  await participant.getByTitle("Força!", { exact: true }).click();
  await participant
    .locator(".community-comment-form textarea")
    .fill("Sua conquista também me inspira.");
  await participant
    .getByRole("button", { name: "Enviar", exact: true })
    .click();
  await participant
    .getByText("Sua conquista também me inspira.", { exact: true })
    .waitFor();
  await participant.close();
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
  });
  await context.addCookies([{ name: "qa-admin", value: "1", url: origin }]);
  const page = await context.newPage();
  await page.goto(origin + "/pt-BR/admin/comunidade");
  await page.getByRole("button", { name: "Comentários", exact: true }).click();
  await page
    .getByText("Uma conversa de incentivo.", { exact: true })
    .first()
    .waitFor();
  page.on("dialog", (dialog) =>
    dialog.type() === "prompt"
      ? dialog.accept("Moderação de teste")
      : dialog.accept(),
  );
  const first = page.locator("article.community-card").first();
  await first.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Alunos", exact: true }).click();
  await page
    .locator("article.community-card")
    .filter({ hasText: "Mariana Oliveira" })
    .getByRole("button", { name: "Histórico e permissões do aluno" })
    .click();
  await page
    .getByLabel("Motivo", { exact: true })
    .fill("Pausa temporária de teste");
  await page
    .getByRole("button", { name: "Suspender participação", exact: true })
    .click();
  await page.getByText(/Publicações e comentários suspensos até/).waitFor();
  await page.screenshot({
    path: join(out, "admin-mobile.png"),
    fullPage: true,
  });
  await page.getByLabel("Motivo", { exact: true }).fill("Revisão concluída");
  await page
    .getByRole("button", { name: "Reativar participação", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      !document.body.textContent.includes(
        "Publicações e comentários suspensos até",
      ),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log(
    "Moderação mobile: comentários, exclusão confirmada, histórico, suspensão e reativação aprovados.",
  );
  const notices = (
    await db.query(
      "select count(*) n from notifications where payload ? 'community_post'",
    )
  ).rows[0].n;
  assert.ok(
    Number(notices) > 0,
    "Cross-user interactions must persist notifications",
  );
  console.log(
    "Notificações internas persistidas:",
    notices,
    "Publicação inicial:",
    original,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await db.close();
}
