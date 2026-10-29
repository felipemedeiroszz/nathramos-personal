import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/pt-BR/login", {
    waitUntil: "domcontentloaded",
  });
  const result = await page.evaluate(async () => {
    const old = await caches.open("nathramos-static-v1");
    await old.put("/old-private", new Response("old"));
    await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
    const ready = await navigator.serviceWorker.ready;
    await new Promise((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        });
    });
    await fetch("/pt-BR/login");
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).then((r) => {
      if (r.status !== 401) throw Error("Push API must reject anonymous users");
    });
    const keys = await caches.keys();
    const privateCached = [];
    for (const key of keys) {
      for (const req of await (await caches.open(key)).keys()) {
        if (new URL(req.url).pathname === "/pt-BR/login")
          privateCached.push(req.url);
      }
    }
    const manifest = await (await fetch("/manifest.webmanifest")).json();
    for (const icon of manifest.icons) {
      if (!(await fetch(icon.src)).ok) throw Error("Missing icon " + icon.src);
    }
    return {
      active: ready.active?.state,
      removedOldCache: !keys.includes("nathramos-static-v1"),
      privateCached: privateCached.length,
      startUrl: manifest.start_url,
    };
  });
  if (
    result.active !== "activated" ||
    !result.removedOldCache ||
    result.privateCached
  )
    throw Error(JSON.stringify(result));
  console.log("Live service worker and PWA assets OK", result);
} finally {
  await browser.close();
}
