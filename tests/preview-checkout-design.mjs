import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/api/payments/**", () => {
        throw Error("Preview must not call payment APIs");
      });
      await page.goto(
        `http://localhost:3000/${locale}/assinatura/checkout/preview`,
        { waitUntil: "domcontentloaded" },
      );
      await page.locator(".checkout-summary").waitFor();
      if ((await page.locator(".checkout-summary").innerText()).includes("payments.")) throw Error("Unresolved checkout translation");
      await page.waitForTimeout(900);
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error("Overflow");
      await page.screenshot({
        path: `artifacts/public-site/checkout-card-${locale}-${width}.png`,
        fullPage: true,
      });
      const methods = page.getByRole("group");
      await methods.getByRole("button").nth(1).click();
      await page.waitForFunction(
        () =>
          document
            .querySelector(".checkout-methods button:nth-child(2)")
            .getAttribute("aria-pressed") === "true",
      );
      const summary = await page.locator(".checkout-summary").innerText();
      if (
        !summary.includes(
          locale === "en-US" ? "Single payment" : "Pagamento único",
        )
      )
        throw Error("PIX disclosure");
      const price = await page
        .locator(".checkout-summary-top>p")
        .last()
        .innerText();
      const amount = await page
        .locator(".checkout-summary [aria-live] > p")
        .nth(1)
        .innerText();
      if (!price.includes(amount)) throw Error("PIX total mismatch");
      await page.screenshot({
        path: `artifacts/public-site/checkout-pix-${locale}-${width}.png`,
        fullPage: true,
      });
      if (errors.length) throw Error(errors.join("\n"));
      console.log(locale, width, "card/PIX summary and layout OK");
      await page.close();
    }
} finally {
  await browser.close();
}
