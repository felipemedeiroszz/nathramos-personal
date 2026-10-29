// Read-only browser checks for scroll enhancement and accessibility preferences.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
      await page.goto(`${process.env.PUBLIC_BASE_URL || "http://localhost:3000"}/pt-BR`);
      await page.locator("h1").waitFor();
      await page.waitForTimeout(1000);
      await page.locator("#beneficios").scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      const state = await page.evaluate(() => ({
        progress: Number(document.querySelector(".public-reading-progress").style.getPropertyValue("--reading-progress")),
        scrolled: document.querySelector(".public-site").hasAttribute("data-scrolled"),
        animations: document.getAnimations().length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        readable: [...document.querySelectorAll(".public-feature")].every(el => getComputedStyle(el).opacity === "1"),
      }));
      if (!state.scrolled || state.progress <= 0 || state.overflow || !state.readable)
        throw Error(JSON.stringify({ width, reducedMotion, state }));
      if (reducedMotion === "reduce" && state.animations) throw Error("Motion active with reduced motion");
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      const back = page.getByRole("button", { name: "Voltar ao início da página" });
      await back.waitFor({ state: "visible" });
      await back.click();
      await page.waitForFunction(() => scrollY < 2);
      if (!(await page.locator("#public-content").evaluate(el => el === document.activeElement)))
        throw Error("Back to top did not move keyboard focus");
      console.log(`${width}px ${reducedMotion}: progress, reveal, focus and return OK`);
      await page.close();
    }
  }
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.goto(`${process.env.PUBLIC_BASE_URL || "http://localhost:3000"}/pt-BR`);
  if (!(await page.locator("h1").isVisible()) || !(await page.locator(".public-feature").first().isVisible()))
    throw Error("Content unavailable without JavaScript");
  console.log("Content readable without JavaScript OK");
} finally { await browser.close(); }
