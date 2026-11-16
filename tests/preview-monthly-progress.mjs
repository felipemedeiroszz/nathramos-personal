// Local browser QA: real React and SQL, with local Auth/Storage fixtures.
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
const out = resolve("artifacts/monthly-progress-ui");
await mkdir(out, { recursive: true });
const db = await testDatabase();
const actor = "00000000-0000-4000-8000-000000000091";
await db.query(
  "insert into auth.users(id,email) values($1,'monthly-ui@example.test')",
  [actor],
);
await db.query(
  "insert into subscriptions(user_id,plan_id,status,unit_amount_cents,current_period_end) values($1,(select id from plans limit 1),'active',0,now()+interval '90 days')",
  [actor],
);
const state = async () =>
  (await db.query("select monthly_progress_read($1) data", [actor])).rows[0]
    .data;
const month = (await state()).month;
const angles = ["front", "back", "left", "right"];
const images = new Map();
const photo = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="#414d4a"/><stop offset="1" stop-color="#171b20"/></linearGradient></defs><rect width="600" height="800" fill="url(#a)"/><circle cx="300" cy="170" r="58" fill="#bdaaa0"/><path d="M245 240 Q300 260 355 240 L395 470 350 480 340 730 295 730 285 520 260 730 215 730 235 480 190 470Z" fill="#afaaa0"/><path d="M245 250 Q300 280 355 250 L370 430 225 430Z" fill="#c8ac64"/></svg>`,
  ),
)
  .webp()
  .toBuffer();
for (let offset = 2; offset >= 1; offset--) {
  const period = (
    await db.query(
      "select (date_trunc('month',$1::date)-($2::text||' months')::interval)::date::text period",
      [month, offset],
    )
  ).rows[0].period;
  const photos = {};
  for (const angle of angles) {
    const path = `${actor}/${period}/${angle}/${randomUUID()}.webp`;
    photos[angle] = path;
    images.set(path, photo);
    await db.query(
      "insert into monthly_progress_uploads(path,user_id,month,angle,ready) values($1,$2,$3,$4,true)",
      [path, actor, period, angle],
    );
  }
  await db.query(
    "insert into student_monthly_progress(user_id,month,weight_kg,photos) values($1,$2,$3,$4)",
    [actor, period, 73 + offset, JSON.stringify(photos)],
  );
}
const entry = join(out, "entry.jsx");
await writeFile(
  entry,
  `import React from 'react';import {hydrateRoot} from 'react-dom/client';import {MonthlyProgress} from ${JSON.stringify(resolve("src/components/student/MonthlyProgress.tsx"))};hydrateRoot(document.getElementById('root'),<MonthlyProgress locale={window.__locale}/>);`,
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
const ssr = join(out, "ssr.jsx");
await writeFile(
  ssr,
  `import React from 'react';import {renderToString} from 'react-dom/server';import {MonthlyProgress} from ${JSON.stringify(resolve("src/components/student/MonthlyProgress.tsx"))};export const render=locale=>renderToString(<MonthlyProgress locale={locale}/>);`,
);
await build({
  entryPoints: [ssr],
  outfile: join(out, "ssr.cjs"),
  bundle: true,
  jsx: "automatic",
  format: "cjs",
  platform: "node",
  external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime"],
  loader: { ".css": "empty" },
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: resolve("tsconfig.json"),
});
const { render } = require(join(out, "ssr.cjs"));
const styles = (
  await Promise.all(
    (await readdir(".next/static/css"))
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFile(join(".next/static/css", f), "utf8")),
  )
).join("\n");
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const send = (data, status = 200) =>
    res
      .writeHead(status, { "Content-Type": "application/json" })
      .end(JSON.stringify(data));
  try {
    if (url.pathname === "/api/student/monthly-progress/image") {
      const path = url.searchParams.get("path");
      if (!images.has(path)) {
        res.writeHead(404).end();
        return;
      }
      res
        .writeHead(200, { "Content-Type": "image/webp" })
        .end(images.get(path));
      return;
    }
    if (url.pathname === "/api/student/monthly-progress") {
      if (req.method === "GET") {
        send(await state());
        return;
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      if (req.headers["content-type"].includes("multipart")) {
        const form = await new Response(bytes, {
          headers: { "Content-Type": req.headers["content-type"] },
        }).formData();
        const angle = form.get("angle"),
          period = form.get("month"),
          path = `${actor}/${period}/${angle}/${randomUUID()}.webp`;
        await db.query("select monthly_progress_reserve($1,$2,$3,$4)", [
          actor,
          period,
          angle,
          path,
        ]);
        images.set(
          path,
          await sharp(Buffer.from(await form.get("file").arrayBuffer()))
            .webp()
            .toBuffer(),
        );
        await db.query(
          "update monthly_progress_uploads set ready=true where path=$1",
          [path],
        );
        send({ path });
        return;
      }
      const data = JSON.parse(bytes);
      send(
        (
          await db.query("select monthly_progress_save($1,$2,$3,$4,$5) data", [
            actor,
            data.month,
            data.weight_kg,
            JSON.stringify(data.photos),
            data.version,
          ])
        ).rows[0].data,
      );
      return;
    }
    if (["/app.js", "/app.css"].includes(url.pathname)) {
      res
        .writeHead(200, {
          "Content-Type": url.pathname.endsWith("css")
            ? "text/css"
            : "text/javascript",
        })
        .end(await readFile(join(out, url.pathname.slice(1))));
      return;
    }
    if (url.pathname === "/base.css") {
      res.writeHead(200, { "Content-Type": "text/css" }).end(styles);
      return;
    }
    const locale = url.pathname.includes("en-US") ? "en-US" : "pt-BR";
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/app.css"><style>body{margin:0;background:#0b0c0f;color:white;font-family:Arial,sans-serif;padding:20px}#root{max-width:1080px;margin:auto}*,*::before,*::after{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button{border:0;background:transparent;color:inherit}</style></head><body><div id="root">${render(locale)}</div><script>window.__locale=${JSON.stringify(locale)}</script><script src="/app.js"></script></body></html>`,
      );
  } catch (error) {
    send({ error: error.message }, 409);
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440]) {
      const en = locale === "en-US",
        page = await browser.newPage({
          viewport: { width, height: 1000 },
          hasTouch: width === 390,
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (
          m.type() === "error" &&
          /hydration|react error #4[12][0-9]/i.test(m.text())
        )
          errors.push(m.text());
      });
      await page.goto(origin + "/" + locale);
      await page.locator(".monthly-photo").first().waitFor();
      const input = page.getByRole("textbox", {
        name: en ? "Monthly weight in kilograms" : "Peso mensal em quilos",
      });
      await input.fill("72,4");
      for (const angle of angles) {
        const file = page
          .locator(".monthly-photo")
          .nth(angles.indexOf(angle))
          .locator("input");
        await file.setInputFiles({
          name: angle + ".webp",
          mimeType: "image/webp",
          buffer: photo,
        });
        await page.waitForFunction(
          () => !document.querySelector(".monthly-uploading"),
        );
      }
      await page
        .getByRole("button", {
          name: en
            ? /Save monthly progress|Update check-in/
            : /Salvar evolução do mês|Atualizar registro/,
        })
        .click();
      await page.locator(".monthly-success").waitFor();
      assert.equal(
        (await state()).records.filter((r) => r.month === month).length,
        1,
      );
      await page
        .getByRole("button", {
          name: en ? "Left side" : "Lado esquerdo",
          exact: true,
        })
        .click();
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".monthly-swipe img")].every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      );
      assert.equal(await page.locator(".monthly-swipe img").count(), 2);
      const slider = page.getByRole("slider", {
        name: en
          ? "Photo comparison: drag to reveal the months"
          : "Comparação de fotos: arraste para revelar os meses",
      });
      await slider.scrollIntoViewIfNeeded();
      const box = await slider.boundingBox();
      const y = box.y + box.height / 2;
      if (width === 390) {
        const session = await page.context().newCDPSession(page);
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: box.x + box.width * 0.25, y, id: 0 }],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: box.x + box.width * 0.75, y, id: 0 }],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await session.detach();
      } else {
        await page.mouse.move(box.x + box.width * 0.25, y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.75, y, { steps: 10 });
        await page.mouse.up();
      }
      assert.ok(
        Math.abs(Number(await slider.getAttribute("aria-valuenow")) - 75) <= 1,
      );
      await slider.focus();
      await page.keyboard.press("Home");
      assert.equal(await slider.getAttribute("aria-valuenow"), "0");
      await page.keyboard.press("End");
      assert.equal(await slider.getAttribute("aria-valuenow"), "100");
      await page.keyboard.press("ArrowLeft");
      assert.equal(await slider.getAttribute("aria-valuenow"), "98");
      await page
        .getByRole("button", {
          name: en ? "Center comparison" : "Centralizar comparação",
          exact: true,
        })
        .click();
      assert.equal(await slider.getAttribute("aria-valuenow"), "50");
      await page
        .getByRole("button", {
          name: en ? "Side by side" : "Lado a lado",
          exact: true,
        })
        .click();
      assert.equal(
        await page.locator(".monthly-compare-photos img").count(),
        2,
      );
      await page
        .getByRole("button", {
          name: en ? "Slide photos" : "Deslizar fotos",
          exact: true,
        })
        .click();

      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: join(out, `monthly-${locale}-${width}.png`),
        fullPage: true,
      });
      await page.close();
      console.log(
        "Evolução mensal " +
          locale +
          " " +
          width +
          ": quatro fotos, peso, gravação, comparação e hidratação OK",
      );
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  await db.close();
}
