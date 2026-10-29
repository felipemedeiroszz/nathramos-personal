import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
await mkdir("artifacts/public-site", { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      for (const route of ["login", "cadastro"]) {
        const response = await page.goto(
          `http://localhost:3000/${locale}/${route}`,
          { waitUntil: "domcontentloaded", timeout: 60000 },
        );
        if (!response.ok()) throw Error("HTTP " + response.status());
        await page.locator("h1").waitFor();
        await page.waitForTimeout(700);
        if ((await page.locator("h1").count()) !== 1)
          throw Error("Heading count");
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
        )
          throw Error("Overflow");
        await page.screenshot({
          path: `artifacts/public-site/${route}-${locale}-${width}.png`,
          fullPage: true,
        });
        if (route === "login") {
          await page
            .getByRole("button", {
              name: locale === "en-US" ? "Show password" : "Mostrar senha",
            })
            .click();
          await page.locator('#password[type="text"]').waitFor();
          await page
            .locator("button")
            .filter({ hasText: locale === "en-US" ? "Forgot" : "Esqueci" })
            .click();
          await page.getByRole("dialog").waitFor();
          await page.keyboard.press("Escape");
          if (await page.getByRole("dialog").count())
            throw Error("Dialog escape");
        } else {
          const next = page.getByRole("button", {
            name: locale === "en-US" ? "Next" : "Próximo",
            exact: true,
          });
          await next.click();
          await page.locator("form p.text-red-400").first().waitFor();
          if (
            await page
              .locator("[aria-current=step]")
              .innerText()
              .then(
                (t) =>
                  !t.includes(
                    locale === "en-US" ? "Your account" : "Sua conta",
                  ),
              )
          )
            throw Error("Validation bypass");
          for (const [id, value] of Object.entries({
            first_name: "Teste",
            last_name: "Visual",
            email: "preview@example.com",
            phone: "11999999999",
            password: "Preview12345",
            confirmPassword: "Preview12345",
          }))
            await page.locator("#" + id).fill(value);
          await page.locator("#confirmPassword").fill("Different123");
          await next.click();
          await page
            .getByText(
              locale === "en-US"
                ? "Passwords do not match."
                : "As senhas não coincidem.",
              { exact: true },
            )
            .waitFor();
          if (await page.locator("#birth_date").count())
            throw Error("Mismatched passwords passed step one");
          await page.locator("#confirmPassword").fill("Preview12345");
          await page.locator("#confirmPassword").press("Enter");
          await page.locator("#birth_date").waitFor();
          await page.locator("#birth_date").fill("1995-01-01");
          await page
            .locator("label")
            .filter({ has: page.locator("input[name=gender][value=F]") })
            .click();
          await page.locator("#height_cm").fill("165");
          await page.locator("#weight_kg").fill("65");
          await page.locator("#country").selectOption("BR");
          await next.click();
          await page.locator("#accepts_terms").waitFor({ state: "attached" });
          if (
            (await page.locator("#accepts_terms").isChecked()) ||
            (await page.locator("#accepts_privacy").isChecked())
          )
            throw Error("Consent prechecked");
          await page.waitForTimeout(700);
          await page.screenshot({
            path: `artifacts/public-site/cadastro-consent-${locale}-${width}.png`,
            fullPage: true,
          });
          await page
            .getByRole("button", {
              name: locale === "en-US" ? "Back" : "Voltar",
              exact: true,
            })
            .click();
          if ((await page.locator("#height_cm").inputValue()) !== "165")
            throw Error("Lost values");
        }
        if (errors.length) throw Error(errors.join("\n"));
        console.log(`${locale} ${width}px ${route} OK`);
      }
      await page.close();
    }
} finally {
  await browser.close();
}
