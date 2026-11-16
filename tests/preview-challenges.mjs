// Local browser QA uses the actual components, schemas and PostgreSQL RPCs.
// Auth and Storage are isolated fixtures, without remote accounts or prizes.
import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import sharp from "sharp";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";
import { challengeConfig } from "./challenges-fixture.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { challengeActionSchema, challengeFilterSchema } = loadTs(
  "src/lib/challenges.ts",
  {},
);
const out = resolve("artifacts/challenges-ui");
await mkdir(out, { recursive: true });
const db = await testDatabase(),
  assets = new Map();
const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
  student = "00000000-0000-4000-8000-000000000001";
await db.query(
  "insert into auth.users(id,email) values($1,'challenge-preview@example.test')",
  [student],
);
await db.query(
  "update profiles set full_name='Mariana Oliveira',first_name='Mariana' where id=$1",
  [student],
);
await db.query(
  "insert into subscriptions(user_id,plan_id,status,unit_amount_cents) values($1,(select id from plans limit 1),'active',100)",
  [student],
);
const rpc = async (actor, action, input) =>
  (
    await db.query("select challenge_mutate($1,$2,$3) result", [
      actor,
      action,
      JSON.stringify(input),
    ])
  ).rows[0].result;
const read = async (actor, filter) =>
  (
    await db.query("select challenge_read($1,$2) result", [
      actor,
      JSON.stringify(filter),
    ])
  ).rows[0].result;
const config = challengeConfig();
const challenge = await rpc(admin, "create", {
  title: config.title,
  start_date: config.start_date,
  end_date: config.end_date,
  request_id: randomUUID(),
});
await rpc(admin, "save", {
  ...config,
  challenge_id: challenge,
  version: 1,
  reason: "",
});
await rpc(admin, "publish", { challenge_id: challenge });
const png = await sharp({
  create: { width: 1000, height: 650, channels: 3, background: "#44462b" },
})
  .png()
  .toBuffer();
const entry = join(out, "entry.jsx");
await writeFile(
  entry,
  `
import React from "react";import {createRoot} from "react-dom/client";
import {ChallengeList} from ${JSON.stringify(resolve("src/components/challenges/ChallengeList.tsx"))};
import {ChallengeDetail} from ${JSON.stringify(resolve("src/components/challenges/ChallengeDetail.tsx"))};
const {view,...props}=window.__fixture;
createRoot(document.getElementById("root")).render(view==="list"?<ChallengeList {...props}/>:<ChallengeDetail {...props}/>);
`,
);
await build({
  entryPoints: [entry],
  outfile: join(out, "app.js"),
  bundle: true,
  jsx: "automatic",
  platform: "browser",
  tsconfig: resolve("tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "fixture-router",
      setup(build) {
        build.onResolve({ filter: /^next\/link$/ }, () => ({
          path: "link",
          namespace: "fixture",
        }));
        build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents:
            'import React from "react";export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}',
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const tailwind = (
  await Promise.all(
    (await readdir(".next/static/css"))
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFile(join(".next/static/css", f), "utf8")),
  )
).join("\n");
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const actor = req.headers.cookie?.includes("qa-admin=1") ? admin : student;
  const send = (body, status = 200) =>
    res
      .writeHead(status, { "Content-Type": "application/json" })
      .end(JSON.stringify(body));
  try {
    if (url.pathname === "/api/challenges/asset") {
      const path = url.searchParams.get("path");
      const type = (
        await db.query("select challenge_asset($1,$2) type", [actor, path])
      ).rows[0].type;
      res.writeHead(200, { "Content-Type": type }).end(assets.get(path) || png);
      return;
    }
    if (url.pathname === "/api/challenges") {
      if (req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        if (req.headers["content-type"]?.includes("multipart")) {
          const form = await new Response(Buffer.concat(chunks), {
            headers: { "content-type": req.headers["content-type"] },
          }).formData();
          const file = form.get("file"),
            kind = form.get("kind"),
            id = form.get("challenge_id");
          const path = id + "/" + randomUUID() + ".webp";
          await db.query(
            "select challenge_reserve_upload($1,$2,$3,$4,'image/webp')",
            [actor, id, path, kind],
          );
          assets.set(
            path,
            await sharp(Buffer.from(await file.arrayBuffer()))
              .webp()
              .toBuffer(),
          );
          send({ path });
          return;
        }
        const input = challengeActionSchema.parse(
          JSON.parse(Buffer.concat(chunks).toString()),
        );
        send({ id: await rpc(actor, input.action, input) });
        return;
      }
      send(
        await read(
          actor,
          challengeFilterSchema.parse(Object.fromEntries(url.searchParams)),
        ),
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
    const match = url.pathname.match(/desafios\/([0-9a-f-]{36})/);
    const fixture = {
      view: match ? "detail" : "list",
      locale: url.pathname.includes("en-US") ? "en-US" : "pt-BR",
      admin: actor === admin,
      userId: actor,
      initial: await read(actor, match ? { id: match[1] } : {}),
      edit: url.searchParams.get("edit") === "1",
      winnersOnly: url.pathname.endsWith("/vencedores"),
    };
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#0b0d10;font-family:Arial,sans-serif}</style></head><body><div id="root"></div><script>window.__fixture=${JSON.stringify(fixture).replaceAll("<", "\\u003c")}</script><script src="/app.js"></script></body></html>`,
      );
  } catch (error) {
    console.error("fixture:", error.message);
    send({ error: error.message }, 409);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([{ name: "qa-admin", value: "1", url: origin }]);
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) =>
    dialog.type() === "prompt"
      ? dialog.accept("Conferência administrativa de teste")
      : dialog.accept(),
  );
  await page.goto(origin + "/pt-BR/admin/desafios");
  await page.getByRole("button", { name: "Novo desafio", exact: true }).click();
  await page
    .getByLabel("Nome do desafio", { exact: true })
    .fill("Desafio criado pela interface");
  await page
    .getByRole("button", { name: "Criar rascunho", exact: true })
    .click();
  await page.waitForURL(/\/admin\/desafios\/[0-9a-f-]+\?edit=1/);
  const draftId = page.url().match(/desafios\/([0-9a-f-]+)/)[1];
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Um desafio real, configurado pela interface.");
  await page
    .getByLabel("Regras de participação e desempate", { exact: true })
    .fill("Registre sua atividade e respeite os colegas.");
  await page
    .getByLabel("Nome da meta", { exact: true })
    .fill("Treinos completos");
  await page.getByLabel("Modalidade", { exact: true }).selectOption("top3");
  for (let i = 0; i < 3; i++)
    await page
      .getByLabel("Nome do prêmio", { exact: true })
      .nth(i)
      .fill(
        ["Kit Fitness Premium", "Camiseta da academia", "Garrafa térmica"][i],
      );
  await page
    .locator(".challenge-upload input")
    .first()
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
  await page.locator(".challenge-upload img").first().waitFor();
  for (let i = 1; i <= 3; i++)
    await page
      .locator(".challenge-upload input")
      .nth(i)
      .setInputFiles({
        name: "prize-" + i + ".png",
        mimeType: "image/png",
        buffer: png,
      });
  await page.locator(".challenge-upload img").nth(3).waitFor();
  await page.waitForFunction(() => {
    const photos=[...document.querySelectorAll(".challenge-upload img")];
    return photos.length===4 && photos.every(photo=>photo.complete && photo.naturalWidth>0);
  });
  await page
    .getByRole("button", { name: "Prévia dos prêmios", exact: true })
    .click();
  assert.equal(await page.locator(".challenge-prize-grid img").count(), 3);
  await page.screenshot({
    path: join(out, "prizes-preview.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Editar prêmios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar configuração", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      !document
        .querySelector('button[type="submit"]')
        ?.textContent.includes("Salvando"),
  );
  await page
    .getByRole("button", { name: "Publicar desafio", exact: true })
    .click();
  await page.getByRole("button", { name: "Pausar", exact: true }).waitFor();
  assert.equal(
    (await read(admin, { id: draftId })).challenge.status,
    "published",
  );
  await page.screenshot({
    path: join(out, "admin-config-desktop.png"),
    fullPage: true,
  });
  await page.goto(origin + "/pt-BR/admin/desafios/" + challenge);
  await page.getByRole("button", { name: "Configuração", exact: true }).click();
  await page.getByText("O desafio já começou.", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  const participant = await browser.newPage({
    viewport: { width: 390, height: 1000 },
  });
  participant.on("pageerror", (error) => errors.push(error.message));
  await participant.goto(origin + "/pt-BR/desafios/" + challenge);
  await participant
    .getByText("Li e aceito as regras e requisitos deste desafio.", {
      exact: true,
    })
    .click();
  await participant
    .getByRole("button", { name: "Participar do desafio", exact: true })
    .click();
  await participant
    .getByText("Você está participando deste desafio.", { exact: true })
    .waitFor();
  await participant
    .getByRole("button", { name: "Registrar atividade", exact: true })
    .click();
  await participant
    .getByLabel("Quantidade em litros", { exact: true })
    .fill("3");
  await participant
    .getByRole("button", { name: "Enviar registro", exact: true })
    .click();
  await participant.getByText("Pendente", { exact: true }).waitFor();
  assert.equal(
    Number((await read(student, { id: challenge })).participant.total_points),
    0,
  );
  await participant.screenshot({
    path: join(out, "student-pending-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Validar registros", exact: true })
    .click();
  await page.getByRole("button", { name: "Aprovar", exact: true }).click();
  await page.getByText("Aprovado", { exact: true }).waitFor();
  assert.equal(
    Number((await read(student, { id: challenge })).participant.total_points),
    5,
  );
  await participant.reload();
  await participant
    .getByRole("button", { name: "Ranking", exact: true })
    .click();
  await participant
    .getByText("Sua posição: 1º · 5 pts", { exact: true })
    .waitFor();
  assert.equal(
    await participant.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await participant.screenshot({
    path: join(out, "student-ranking-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Encerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Apuração e prêmios", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirmar e publicar resultado",
      exact: true,
    })
    .click();
  await page.getByText("RESULTADO OFICIAL", { exact: true }).waitFor();
  await participant.goto(
    origin + "/pt-BR/desafios/" + challenge + "/vencedores",
  );
  await participant.getByText("RESULTADO OFICIAL", { exact: true }).waitFor();
  await participant.screenshot({
    path: join(out, "winners-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    (await read(student, { id: challenge })).winners[0].user_id,
    student,
  );
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const view = await browser.newPage({ viewport: { width, height: 1000 } });
      view.on("pageerror", (error) => errors.push(error.message));
      await view.goto(origin + "/" + locale + "/desafios");
      await view.locator(".challenge-tile").first().waitFor();
      assert.equal(
        await view.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await view.screenshot({
        path: join(out, `list-${locale}-${width}.png`),
        fullPage: true,
      });
      await view.goto(
        origin + "/" + locale + "/desafios/" + challenge + "/vencedores",
      );
      await view.locator(".challenge-winners").waitFor();
      assert.equal(
        await view.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await view.close();
    }
  assert.deepEqual(errors, []);
  console.log(
    "Fluxo completo aprovado: criar, configurar, publicar, inscrever, registrar, validar, pontuar, ranquear, encerrar, confirmar e exibir vencedor.",
  );
  console.log("Layouts PT/EN em 390 e 1440 px aprovados. Capturas:", out);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await db.close();
}
