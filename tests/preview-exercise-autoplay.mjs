import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/exercise-autoplay");
await mkdir(out, { recursive: true });
const messages = {};
for (const locale of ["pt-BR", "en-US"])
  messages[locale] = JSON.parse(
    await readFile(`src/messages/${locale}.json`, "utf8"),
  );
await build({
  stdin: {
    contents: `import React from'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import{StudentWorkoutExecutionClient}from${JSON.stringify(resolve("src/components/student/workout/StudentWorkoutExecutionClient.tsx"))};const p=new URLSearchParams(location.search),locale=p.get('locale')||'pt-BR',source=p.get('source')||'custom',mode=p.get('mode')||'mp4';const exercise={id:'exercise',source,name_pt:'Elevação lateral',name_en:'Lateral raise',primary_muscle:'shoulders',secondary_muscles:[],equipment:'dumbbell',difficulty:'beginner',instructions_pt:[],instructions_en:[],gif_url:mode==='gif'?location.origin+'/demo.gif':mode==='mp4'?location.origin+'/demo.mp4':null,video_url:mode==='youtube'?'https://youtube.com/shorts/qRNjUb1molI':null};createRoot(document.getElementById('root')).render(<NextIntlClientProvider locale={locale} messages={${JSON.stringify(messages)}[locale]} timeZone="America/Sao_Paulo"><StudentWorkoutExecutionClient locale={locale} program={{id:'program'}} day={{id:'day',name_pt:'Treino A',name_en:'Workout A'}} sessionId="test-session" exercises={[{id:'assigned',exercise,sets:1,reps:'10',rest_seconds:30,order_index:0}]}/><div style={{height:2000}}/></NextIntlClientProvider>);`,
    loader: "tsx",
    resolveDir: process.cwd(),
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
      name: "actions",
      setup(b) {
        b.onResolve({ filter: /^@\/app\/actions\/workouts$/ }, (a) => ({
          path: a.path,
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents:
            "export async function logWorkoutSetAction(){throw Error('Not part of media test')}export async function completeWorkoutSessionAction(){throw Error('Not part of media test')}",
          loader: "js",
        }));
      },
    },
  ],
});
const mp4 = await readFile("tests/fixtures/exercise-demo.mp4"),
  gif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64",
  );
const server = createServer(async (req, res) => {
  if (req.url === "/demo.mp4") {
    res.setHeader("Content-Type", "video/mp4");
    res.end(mp4);
  } else if (req.url === "/demo.gif") {
    res.setHeader("Content-Type", "image/gif");
    res.end(gif);
  } else if (req.url === "/app.js") {
    res.setHeader("Content-Type", "application/javascript");
    res.end(await readFile(join(out, "app.js")));
  } else
    res.end(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#111;color:#eee;font-family:Arial}input,select,textarea{color:#111}video,img{max-width:100%}</style><div id="root"></div><script src="/app.js"></script>',
    );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const source of ["custom", "exercisedb"])
    for (const width of [390, 1440])
      for (const mode of ["mp4", "youtube", "gif"]) {
        const page = await browser.newPage({
            viewport: { width, height: 1000 },
          }),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("https://www.youtube.com/embed/**", (r) =>
          r.fulfill({
            contentType: "text/html",
            body: "YouTube iframe contract fixture",
          }),
        );
        await page.goto(
          `http://127.0.0.1:${server.address().port}/?source=${source}&mode=${mode}`,
        );
        if (mode === "mp4") {
          // No play(), click or autoplay-policy override: the actual student component starts it.
          await page.waitForFunction(() => {
            const video = document.querySelector("video");
            return video && !video.paused && video.currentTime > 0.03;
          });
          assert(
            await page
              .locator("video")
              .evaluate((v) => v.muted && v.playsInline),
          );
          await page.evaluate(() => scrollTo(0, 1600));
          await page.waitForFunction(
            () => document.querySelector("video")?.paused === true,
          );
          await page.evaluate(() => scrollTo(0, 0));
          await page.waitForFunction(
            () => document.querySelector("video")?.paused === false,
          );
        } else if (mode === "youtube") {
          await page.locator("iframe").waitFor();
          const src = new URL(await page.locator("iframe").getAttribute("src"));
          assert.equal(src.searchParams.get("autoplay"), "1");
          assert.equal(src.searchParams.get("mute"), "1");
          assert(
            (await page.locator("iframe").getAttribute("allow")).includes(
              "autoplay",
            ),
          );
          await page.evaluate(() => scrollTo(0, 1600));
          await page.waitForFunction(() => !document.querySelector("iframe"));
          await page.evaluate(() => scrollTo(0, 0));
          await page.locator("iframe").waitFor();
        } else
          await page.waitForFunction(
            () => document.querySelector("img")?.naturalWidth > 0,
          );
        assert.deepEqual(errors, []);
        await page.close();
        console.log(
          JSON.stringify({ source, width, mode, automatic: true, errors: 0 }),
        );
      }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
