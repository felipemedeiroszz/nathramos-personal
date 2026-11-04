// Actual exam UI against local upload endpoints. No remote Storage or student data.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  out = resolve("artifacts/production-upload-ui");
await mkdir(out, { recursive: true });
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import{NextIntlClientProvider}from'next-intl';import pt from './src/messages/pt-BR.json';import{StudentExamsClient}from'./src/app/[locale]/(student)/exames/StudentExamsClient';createRoot(document.getElementById('root')).render(<NextIntlClientProvider locale="pt-BR" messages={pt}><main className="mx-auto max-w-5xl p-4"><StudentExamsClient locale="pt-BR" exams={[]} categories={[]}/></main></NextIntlClientProvider>);`;
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  jsx: "automatic",
  outfile: resolve(out, "app.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  logOverride: { "duplicate-object-key": "silent" },
  plugins: [
    {
      name: "fixtures",
      setup(b) {
        for (const filter of [
          /^next\/navigation$/,
          /^@\/app\/actions\/exams$/,
          /^@\/lib\/supabase\/client$/,
        ])
          b.onResolve({ filter }, (a) => ({ path: a.path, namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
          loader: "js",
          contents:
            a.path === "next/navigation"
              ? `const router={refresh(){window.__refresh=(window.__refresh||0)+1}};export const useRouter=()=>router;`
              : a.path.endsWith("exams")
                ? `const call=async(path,payload)=>{const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});return r.json()};export const prepareExamUploadAction=input=>call('/prepare',input);export const completeExamUploadAction=(uploadId,metadata)=>call('/complete',{uploadId,metadata});export async function deleteMyExamAction(){return {success:true}}export async function getExamFileUrlAction(){return {success:false}}`
                : `export function createClientBrowser() {
 return {storage:{from(){return {async uploadToSignedUrl(path,token,file,options){
 const response=await fetch('/upload',{method:'PUT',body:file,headers:{'content-type':options.contentType}});
 return {error:response.ok?null:Error('upload failed')};
 }}}}};
}
`,
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
    resolve(out, "base.css"),
    "--minify",
  ],
  { stdio: "pipe" },
);
await writeFile(
  resolve(out, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/base.css"></head><body style="font-family:Arial"><div id="root"></div><script src="/app.js"></script></body></html>',
);
let prepares = 0,
  completions = 0,
  uploadedBytes = 0;
const bodies = [];
const server = createServer(async (req, res) => {
  if (["/prepare", "/complete", "/upload"].includes(req.url)) {
    let size = 0;
    const parts = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (req.url != "/upload") parts.push(chunk);
    }
    res.setHeader("content-type", "application/json");
    if (req.url === "/upload") {
      uploadedBytes += size;
      await new Promise((r) => setTimeout(r, 150));
      res.end("{}");
      return;
    }
    bodies.push(size);
    const data = JSON.parse(Buffer.concat(parts).toString());
    if (req.url === "/prepare") {
      prepares++;
      assert.equal(data.size, 10485760);
      res.end(
        JSON.stringify({
          success: true,
          upload: {
            uploadId: "00000000-0000-4000-8000-000000000001",
            path: "fixture/file.pdf",
            token: "local",
            bucket: "exam-files",
          },
        }),
      );
      return;
    }
    completions++;
    assert.equal(data.metadata.title, "Exame de produção");
    assert.equal("file" in data.metadata, false);
    res.end(JSON.stringify({ success: true, id: "exam" }));
    return;
  }
  const file =
    req.url === "/app.js"
      ? "app.js"
      : req.url === "/base.css"
        ? "base.css"
        : "index.html";
  res.setHeader(
    "content-type",
    file.endsWith(".js")
      ? "text/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : "text/html",
  );
  res.end(await readFile(resolve(out, file)));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator("input[name=title]").fill("Exame de produção");
    await page.locator("input[name=exam_date]").fill("2026-11-03");
    const buffer = Buffer.alloc(10485760, 32);
    buffer.write("%PDF-1.7");
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "exame.pdf",
        mimeType: "application/pdf",
        buffer,
      });
    await page
      .getByRole("button", { name: "Enviar exame", exact: true })
      .click();
    await page
      .getByText("Exame enviado com sucesso!", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Enviar exame", exact: true })
        .isDisabled(),
      true,
    );
    assert.deepEqual(errors, []);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: resolve(out, `uploaded-${width}.png`),
      fullPage: true,
    });
    await page.close();
  }
  assert.equal(prepares, 2);
  assert.equal(completions, 2);
  assert.equal(uploadedBytes, 20971520);
  assert.ok(bodies.every((n) => n < 4096));
  console.log(
    "10 MB exam uploads passed at 390/1440px. Binary went only to Storage fixture; action payloads <4 KB.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
