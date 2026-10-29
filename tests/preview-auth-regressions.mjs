import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/pt-BR/login?next=checkout#form", {
    waitUntil: "domcontentloaded",
  });
  const trigger = page.getByRole("button", { name: "Change language" });
  await page.waitForTimeout(800);
  await trigger.click();
  await page.keyboard.press("Escape");
  if ((await trigger.getAttribute("aria-expanded")) !== "false")
    throw Error("Language Escape failed");
  await trigger.click();
  await page
    .locator('[aria-expanded="true"][aria-label="Change language"]')
    .waitFor();
  await page.getByRole("button", { name: "en-US" }).click();
  await page.waitForURL("**/en-US/login?next=checkout#form");
  console.log("Language preserves checkout and hash; Escape OK");
  await page.waitForTimeout(800);
  // Fail the action at the network boundary. No authentication request reaches the server.
  await page.route("**/en-US/login?next=checkout*", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((r) => setTimeout(r, 800));
      await route.abort("failed");
    } else await route.continue();
  });
  await page.locator("#email").fill("preview@example.com");
  await page.locator("#password").fill("Preview12345");
  await page.locator("#remember").check();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Signing in..." }).waitFor();
  if (!(await page.getByRole("button", { name: "Signing in..." }).isDisabled()))
    throw Error("Submit enabled during request");
  await page
    .getByRole("alert")
    .filter({ hasText: "Unable to connect" })
    .waitFor();
  if (
    await page
      .getByRole("button", { name: "Sign in", exact: true })
      .isDisabled()
  )
    throw Error("Submit stuck disabled");
  console.log(
    "Loading persists until response; network error handled and retry enabled OK",
  );
} finally {
  await browser.close();
}
