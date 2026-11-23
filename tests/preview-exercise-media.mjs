import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = resolve("artifacts/exercise-media");
await mkdir(out, { recursive: true });
const messages = {};
for (const locale of ["pt-BR", "en-US"])
  messages[locale] = JSON.parse(
    await readFile(`src/messages/${locale}.json`, "utf8"),
  ).common;
await build({
  stdin: {
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import{ExerciseUpsertModal}from${JSON.stringify(resolve("src/components/admin/workout/ExerciseUpsertModal.tsx"))};import{ExerciseMedia}from${JSON.stringify(resolve("src/components/shared/ExerciseMedia.tsx"))};const locale=new URLSearchParams(location.search).get('locale')||'pt-BR';function App(){const[saved,setSaved]=useState(null);return <NextIntlClientProvider locale={locale} messages={{common:${JSON.stringify(messages)}[locale]}} timeZone="America/Sao_Paulo">{saved?<div id="saved-media"><ExerciseMedia src={saved.gif_url||saved.video_url} alt="Saved exercise" locale={locale}/></div>:<ExerciseUpsertModal isOpen onClose={()=>{}} onSubmit={async input=>{window.__saved=input;return{success:true}}} onSaved={()=>setSaved(window.__saved)}/>}</NextIntlClientProvider>}createRoot(document.getElementById('root')).render(<App/>);`,
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
            "export async function uploadExerciseAssetAction(){throw Error('Upload not exercised by URL tests')}",
          loader: "js",
        }));
      },
    },
  ],
});
let mp4;
const gif = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);
const server = createServer(async (req, res) => {
  if (req.url.startsWith("/demo.gif") || req.url === "/direct-file") {
    res.setHeader("Content-Type", "image/gif");
    res.end(gif);
  } else if (req.url === "/demo.mp4") {
    res.setHeader("Content-Type", "video/mp4");
    res.end(mp4 || Buffer.alloc(0));
  } else if (req.url === "/broken") {
    res.setHeader("Content-Type", "text/html");
    res.end("This is a webpage, not an image");
  } else if (req.url === "/app.js") {
    res.setHeader("Content-Type", "application/javascript");
    res.end(await readFile(join(out, "app.js")));
  } else
    res.end(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#111;color:#eee;font-family:Arial}input,select,textarea{color:#111}video,img{max-width:100%}button{padding:8px}</style><div id="root"></div><script src="/app.js"></script>',
    );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`,
  browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const generator = await browser.newPage();
  const bytes = await generator.evaluate(async () => {
    if (!MediaRecorder.isTypeSupported("video/mp4")) return null;
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d"),
      stream = canvas.captureStream(0),
      chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/mp4" });
    const complete = new Promise((resolve) => (recorder.onstop = resolve));
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? "red" : "blue";
      ctx.fillRect(0, 0, 64, 64);
      stream.getVideoTracks()[0].requestFrame();
      await new Promise((r) => setTimeout(r, 100));
    }
    recorder.stop();
    await complete;
    stream.getTracks().forEach((t) => t.stop());
    return Array.from(
      new Uint8Array(
        await new Blob(chunks, { type: "video/mp4" }).arrayBuffer(),
      ),
    );
  });
  await generator.close();
  if (bytes?.length) {
    mp4 = Buffer.from(bytes);
    await writeFile(join(out, "demo.mp4"), mp4);
    console.log(JSON.stringify({ fixtureMp4Bytes: mp4.length }));
  }
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [390, 1440])
      for (const mode of mp4 ? ["gif", "mp4", "youtube"] : ["gif", "youtube"]) {
        const page = await browser.newPage({
            viewport: { width, height: 1000 },
          }),
          errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.route("https://www.youtube.com/embed/**", (route) =>
          route.fulfill({
            contentType: "text/html",
            body: "YouTube player test fixture",
          }),
        );
        await page.goto(`${origin}/?locale=${locale}`);
        await page.locator("input[required]").nth(0).fill("Exercício de teste");
        await page.locator("input[required]").nth(1).fill("Test exercise");
        const input = page.getByRole("textbox", {
          name:
            locale === "pt-BR"
              ? "URL do GIF, imagem, MP4 ou YouTube"
              : "GIF, image, MP4 or YouTube URL",
          exact: true,
        });
        await input.fill(`${origin}/broken`);
        await page
          .getByText(
            locale === "pt-BR"
              ? "Não foi possível carregar a mídia. Use a URL direta e pública do GIF, imagem ou MP4, ou envie o arquivo."
              : "Could not load media. Use a public direct GIF, image or MP4 URL, or upload the file.",
            { exact: true },
          )
          .waitFor();
        const url =
          mode === "youtube"
            ? "https://youtube.com/shorts/qRNjUb1molI?si=redNNTlr8tKtzbB1"
            : `${origin}/demo.${mode}`;
        await input.fill(url);
        if (mode === "gif")
          await page.waitForFunction(() => {
            const image = document.querySelector("img");
            return image?.complete && image.naturalWidth > 0;
          });
        else if (mode === "youtube") {
          await page.locator('iframe[src*="/embed/qRNjUb1molI"]').waitFor();
        } else {
          await page
            .waitForFunction(
              () => document.querySelector("video")?.readyState >= 1,
              undefined,
              { timeout: 10000 },
            )
            .catch(async (error) => {
              console.log(
                await page.locator("[role=status]").allTextContents(),
              );
              throw error;
            });
          await page.locator("video").evaluate(async (video) => {
            await video.play();
            video.pause();
          });
        }
        await page
          .getByRole("button", { name: messages[locale].save, exact: true })
          .click();
        await page.locator("#saved-media").waitFor();
        if (mode === "youtube") {
          assert.equal(await page.evaluate(() => window.__saved.gif_url), null);
          assert.equal(
            await page.evaluate(() => window.__saved.video_url),
            "https://www.youtube.com/watch?v=qRNjUb1molI",
          );
        } else
          assert.equal(await page.evaluate(() => window.__saved.gif_url), url);
        if (mode === "gif")
          await page.waitForFunction(
            () => document.querySelector("#saved-media img")?.naturalWidth > 0,
          );
        else if (mode === "youtube")
          await page
            .locator('#saved-media iframe[src*="/embed/qRNjUb1molI"]')
            .waitFor();
        else
          await page.waitForFunction(
            () => document.querySelector("#saved-media video")?.readyState >= 1,
          );
        assert.deepEqual(errors, []);
        await page.close();
        console.log(
          JSON.stringify({
            locale,
            width,
            mode,
            brokenUrlExplained: true,
            savedMediaLoaded: true,
          }),
        );
      }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
