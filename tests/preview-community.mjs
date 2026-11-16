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
import {hydrateRoot} from "react-dom/client";
import {CommunityFeed} from ${JSON.stringify(resolve("src/components/community/CommunityFeed.tsx"))};
hydrateRoot(document.getElementById("root"), <CommunityFeed {...window.__fixture}/>);
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
const ssrEntry = join(out, "ssr-entry.jsx");
await writeFile(
  ssrEntry,
  `import React from 'react';import {renderToString} from 'react-dom/server';import {CommunityFeed} from ${JSON.stringify(resolve("src/components/community/CommunityFeed.tsx"))};export const render=(fixture)=>renderToString(<CommunityFeed {...fixture}/>);`,
);
await build({
  entryPoints: [ssrEntry],
  outfile: join(out, "ssr.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  external: ["react", "react-dom", "react/jsx-runtime", "react-dom/server"],
  loader: { ".css": "empty" },
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: resolve("tsconfig.json"),
});
const { render } = require(join(out, "ssr.cjs"));
const cssFiles = await readdir(".next/static/css");
const tailwind = (
  await Promise.all(
    cssFiles
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFile(join(".next/static/css", f), "utf8")),
  )
).join("\n");
// Locally generated silent PCM: UI playback tests do not download provider audio.
const pcm = Buffer.alloc(44 + 32000);
pcm.write("RIFF");
pcm.writeUInt32LE(pcm.length - 8, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(8000, 24);
pcm.writeUInt32LE(16000, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(32000, 40);
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const actor = req.headers.cookie?.includes("qa-admin=1") ? admin : a;
  const send = (data, status = 200) =>
    res
      .writeHead(status, { "Content-Type": "application/json" })
      .end(JSON.stringify(data));
  try {
    if (url.pathname === "/music-preview.wav") {
      res
        .writeHead(200, {
          "Content-Type": "audio/wav",
          "Content-Length": pcm.length,
        })
        .end(pcm);
      return;
    }
    if (url.pathname === "/api/community/music/favorites") {
      let action = "read",
        track = {};
      if (req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const input = JSON.parse(Buffer.concat(chunks).toString());
        action = input.action;
        track = {
          id: input.id,
          title: "Treino em Movimento",
          artist: "Artista Demo",
          cover: null,
          link: "https://www.deezer.com/track/" + input.id,
        };
      }
      send(
        (
          await db.query("select community_music_favorite($1,$2,$3) result", [
            actor,
            action,
            JSON.stringify(track),
          ])
        ).rows[0].result,
      );
      return;
    }
    if (url.pathname === "/api/community/music") {
      const track = {
        id: 3135556,
        title: "Treino em Movimento",
        artist: "Artista Demo",
        cover: null,
        link: "https://www.deezer.com/track/3135556",
        preview: "http://" + req.headers.host + "/music-preview.wav",
      };
      send(url.searchParams.has("track") ? track : [track]);
      return;
    }
    if (url.pathname === "/api/community/stories") {
      if (req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const input = JSON.parse(Buffer.concat(chunks).toString());
        send({
          id: (
            await db.query("select community_story_mutate($1,$2,$3) result", [
              actor,
              input.action,
              JSON.stringify(input),
            ])
          ).rows[0].result,
        });
      } else
        send(
          (await db.query("select community_story_read($1) result", [actor]))
            .rows[0].result,
        );
      return;
    }
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
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#0a0b0e;font-family:Arial,sans-serif}</style></head><body><div id="root">${render(fixture)}</div><script>window.__fixture=${JSON.stringify(fixture).replaceAll("<", "\\u003c")}</script><script src="/app.js"></script></body></html>`,
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
      await db.query(
        "update community_stories set deleted_at=now() where author_id=$1",
        [a],
      );
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        hasTouch: width === 390,
      });
      let storyImageRequests=0;
      page.on('request',request=>{if(request.url().includes('/api/community/image?story='))storyImageRequests++;});
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          /hydration|react error #4[12][0-9]/i.test(message.text())
        )
          errors.push(message.text());
      });
      await page.goto(origin + "/" + locale + "/comunidade");
      await page
        .getByRole("button", {
          name: en ? "Your story Share" : "Seu story Compartilhar",
          exact: true,
        })
        .click();
      await page
        .getByRole("textbox", {
          name: en ? "Story text" : "Texto do story",
          exact: true,
        })
        .fill("Meu treino de hoje!");
      await page
        .getByRole("button", { name: "Adicionar 💪", exact: true })
        .or(page.getByRole("button", { name: "Add 💪", exact: true }))
        .click();
      await page.locator(".story-file input").setInputFiles({
        name: "story.png",
        mimeType: "image/png",
        buffer: await sharp(photo).png().toBuffer(),
      });
      await page
        .getByRole("button", { name: en ? "Bottom" : "Abaixo", exact: true })
        .click();
      const storyTools = page.locator(".story-tools");
      await storyTools
        .getByRole("button", {
          name: en ? "Add music" : "Adicionar música",
          exact: true,
        })
        .click();
      const suggested = storyTools.getByRole("button", {
        name:
          (en ? "Select" : "Selecionar") +
          " Treino em Movimento — Artista Demo",
        exact: true,
      });
      await suggested.waitFor();
      const heart = storyTools.locator(".music-favorite-button").first();
      if ((await heart.getAttribute("aria-pressed")) !== "true")
        await heart.click();
      await storyTools
        .getByRole("tab", { name: en ? /Favorites/ : /Favoritas/ })
        .click();
      await suggested.waitFor();
      assert.equal(
        await storyTools
          .locator(".music-favorite-button")
          .getAttribute("aria-pressed"),
        "true",
      );
      await page.screenshot({
        path: join(out, `music-favorites-${locale}-${width}.png`),
        fullPage: true,
      });
      await storyTools
        .getByRole("tab", {
          name: en ? "Recommended" : "Recomendadas",
          exact: true,
        })
        .click();
      await storyTools
        .getByRole("textbox", {
          name: en ? "Search Deezer" : "Buscar no Deezer",
        })
        .fill("Treino");
      await storyTools
        .getByRole("button", {
          name:
            (en ? "Select" : "Selecionar") +
            " Treino em Movimento — Artista Demo",
          exact: true,
        })
        .click();
      const draggable = page.locator(".story-draggable");
      await draggable.scrollIntoViewIfNeeded();
      const bounds = await draggable.boundingBox();
      const start = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
      if (width === 390) {
        const session = await page.context().newCDPSession(page);
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ ...start, id: 0 }],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: start.x - 16, y: start.y - 50, id: 0 }],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await session.detach();
      } else {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x - 16, start.y - 50, { steps: 8 });
        await page.mouse.up();
      }
      const dragged = await draggable.evaluate((el) => ({
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top),
      }));
      assert.ok(dragged.x < 50 && dragged.y < 100, JSON.stringify(dragged));
      await draggable.focus();
      await page.keyboard.press("ArrowUp");
      const placed = await draggable.evaluate((el) => ({
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top),
      }));
      assert.ok(placed.y < dragged.y);
      await page
        .getByRole("button", {
          name: en ? "Increase text and emojis" : "Aumentar texto e emojis",
          exact: true,
        })
        .click();
      assert.equal(
        await page.locator(".story-size-row output").innerText(),
        "110%",
      );
      await page
        .getByRole("button", {
          name: en ? "Decrease text and emojis" : "Diminuir texto e emojis",
          exact: true,
        })
        .click();
      assert.equal(
        await page.locator(".story-size-row output").innerText(),
        "100%",
      );
      if (width === 390) {
        const stage = page.locator(".story-editor-preview .story-stage");
        await stage.scrollIntoViewIfNeeded();
        const box = await stage.boundingBox();
        const session = await page.context().newCDPSession(page);
        const x = box.x + box.width / 2,
          y = box.y + box.height / 2;
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [
            { x: x - 25, y, id: 0 },
            { x: x + 25, y, id: 1 },
          ],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: x - 40, y, id: 0 },
            { x: x + 40, y, id: 1 },
          ],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await session.detach();
        assert.ok(
          parseInt(await page.locator(".story-size-row output").innerText()) >
            120,
        );
      } else {
        await page
          .getByRole("slider", { name: "Text and emoji size" })
          .or(page.getByRole("slider", { name: "Tamanho do texto e emojis" }))
          .focus();
        await page.keyboard.press("ArrowRight");
      }
      const scale = await page
        .locator(".story-editor-preview .story-stage")
        .evaluate((el) =>
          Number(el.style.getPropertyValue("--story-text-scale")),
        );
      await page.screenshot({
        path: join(out, `story-editor-${locale}-${width}.png`),
        fullPage: true,
      });
      await page.route("**/api/community/image?story=**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.continue();
      });
      await page
        .getByRole("button", {
          name: en ? "Share story" : "Compartilhar story",
          exact: true,
        })
        .click();
      await page.locator("dialog").waitFor({ state: "detached" });
      await page
        .locator(".story-bubble")
        .filter({ hasText: en ? "You" : "Você" })
        .last()
        .click();
      await page.locator(".story-image-loading").waitFor();
      assert.equal(
        await page
          .locator(".story-progress .is-active i")
          .evaluate((el) => el.style.animationPlayState),
        "paused",
      );
      await page.waitForFunction(() => {
        const audio = document.querySelector(".story-music audio");
        return audio && !audio.paused;
      });
      assert.ok(await page.locator(".story-viewer .story-caption").innerText());
      const storyAudio = page.locator(".story-music audio");
      const imageSrc = await page
        .locator(".story-viewer .story-photo")
        .getAttribute("src");
      assert.ok(imageSrc.startsWith("blob:"));
      await page
        .getByRole("button", { name: en ? "Pause" : "Pausar", exact: true })
        .click();
      await storyAudio.evaluate((audio) => audio.pause());
      const restoredScale = await page
        .locator(".story-viewer .story-stage")
        .evaluate((el) =>
          Number(el.style.getPropertyValue("--story-text-scale")),
        );
      assert.ok(Math.abs(scale - restoredScale) < 0.001);
      const restored = await page
        .locator(".story-viewer .story-caption>span")
        .evaluate((el) => ({
          x: parseFloat(el.style.left),
          y: parseFloat(el.style.top),
        }));
      assert.ok(
        Math.abs(restored.x - placed.x) < 0.01 &&
          Math.abs(restored.y - placed.y) < 0.01,
        JSON.stringify({ restored, placed }),
      );
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".story-viewer img")].every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      );
      await page.screenshot({
        path: join(out, `story-viewer-${locale}-${width}.png`),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: en ? "Close" : "Fechar", exact: true })
        .click();
      if(locale==='pt-BR'&&width===390){
        const fetched=storyImageRequests;
        await page.evaluate(()=>{window.__qaPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'));};});
        await page.locator('.story-bubble').filter({hasText:'Você'}).last().click();
        const enable=page.getByRole('button',{name:'Toque para ativar o som',exact:true});await enable.waitFor();
        assert.equal(storyImageRequests,fetched);
        await page.evaluate(()=>{HTMLMediaElement.prototype.play=window.__qaPlay;delete window.__qaPlay;});
        await enable.click();
        await page.waitForFunction(()=>!document.querySelector('.story-music audio').paused);
        await page.getByRole('button',{name:'Fechar',exact:true}).click();
        assert.equal(await page.locator('.story-music audio').count(),0);
      }
      const text = `Minha conquista ${locale} ${width}`;
      await page
        .getByRole("textbox", {
          name: en ? "Post text" : "Texto da publicação",
        })
        .fill(text);
      const composerMusic = page.locator(".community-composer");
      await composerMusic
        .getByRole("button", {
          name: en ? "Add music" : "Adicionar música",
          exact: true,
        })
        .click();
      await composerMusic
        .getByRole("textbox", {
          name: en ? "Search Deezer" : "Buscar no Deezer",
        })
        .fill("Treino");
      await composerMusic
        .getByRole("button", {
          name:
            (en ? "Select" : "Selecionar") +
            " Treino em Movimento — Artista Demo",
          exact: true,
        })
        .click();
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
      await card.locator(".community-music-player audio").waitFor();
      assert.equal(
        await card
          .locator(".community-music-player")
          .getAttribute("data-track-id"),
        "3135556",
      );

      const newMusic = page.locator(".community-composer");
      await newMusic
        .getByRole("button", {
          name: en ? "Add music" : "Adicionar música",
          exact: true,
        })
        .click();
      await newMusic
        .getByRole("textbox", {
          name: en ? "Search Deezer" : "Buscar no Deezer",
        })
        .fill("Treino");
      await newMusic
        .getByRole("button", {
          name:
            (en ? "Select" : "Selecionar") +
            " Treino em Movimento — Artista Demo",
          exact: true,
        })
        .click();
      const secondAudio = newMusic.locator("audio");
      await secondAudio.waitFor();
      const firstAudio = card.locator("audio");
      await firstAudio.evaluate((audio) => audio.play());
      await secondAudio.evaluate((audio) => audio.play());
      assert.equal(await firstAudio.evaluate((audio) => audio.paused), true);
      assert.equal(await secondAudio.evaluate((audio) => audio.paused), false);
      await secondAudio.evaluate((audio) => audio.pause());
      await newMusic
        .getByRole("button", {
          name: en ? "Remove music" : "Remover música",
          exact: true,
        })
        .click();
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
