// Read-only checks against the running Next.js site. No forms or payments are submitted.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
const out = resolve("artifacts/public-site");
await mkdir(out, { recursive: true });
const routes = process.env.PUBLIC_ROUTES?.split(",") || [
  "home",
  "sobre",
  "como-funciona",
  "treinos",
  "dietas",
  "desempenho",
  "mentoria",
  "planos",
  "faq",
  "termos",
  "privacidade",
];
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  for (const locale of ["pt-BR", "en-US"])
    for (const width of [1440, 390])
      for (const route of routes) {
        const en = locale === "en-US",
          page = await browser.newPage({ viewport: { width, height: 1000 } }),
          errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const url = `${base}/${locale}${route === "home" ? "" : "/" + route}`;
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        if (!response?.ok()) throw Error(`${url}: HTTP ${response?.status()}`);
        await page.locator("h1").first().waitFor({ timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        if ((await page.locator("h1").count()) !== 1)
          throw Error(`${route}: expected one h1`);
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          )
        ) {
          const items = await page.evaluate(() =>
            [...document.querySelectorAll("main *")]
              .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 6)
              .map((el) => ({
                tag: el.tagName,
                class: el.className,
                text: el.textContent?.slice(0, 70),
              })),
          );
          throw Error(`${route} ${width}px overflow: ${JSON.stringify(items)}`);
        }
        if (["home", "sobre", "planos", "como-funciona"].includes(route)) {
          const portrait = page.locator('img[src*="hero-desktop"]');
          if (await portrait.count())
            await portrait.first().scrollIntoViewIfNeeded();
          await page.waitForFunction(() =>
            [
              ...document.querySelectorAll(
                'header img[src*="logo"],img[src*="hero-desktop"]',
              ),
            ].every((img) => img.complete && img.naturalWidth > 0),
          );
          await page.evaluate(() =>
            window.scrollTo({ top: 0, behavior: "instant" }),
          );
          // Let viewport entrance animations settle before visual capture.
          await page.waitForTimeout(1100);
          await page.screenshot({
            path: resolve(out, `${route}-${locale}-${width}.png`),
            fullPage: true,
          });
        }
        if (route === "como-funciona") {
          if ((await page.locator(".how-step").count()) !== 4)
            throw Error("Expected four coaching steps");
          await page.locator('.how-roadmap a[href="#etapa-3"]').click();
          await page.waitForFunction(() => location.hash === "#etapa-3");
          await page.waitForFunction(() => {
            const top = document
              .querySelector("#etapa-3")
              .getBoundingClientRect().top;
            return top >= 80 && top < 160;
          });
          await page
            .getByRole("tab", { name: en ? "Routine" : "Rotina", exact: true })
            .click();
          await page
            .getByRole("tabpanel")
            .getByText(
              en
                ? "Your meals and guidance for the day."
                : "Suas refeições e orientações para o dia.",
            )
            .waitFor();
        }
        if (route === "home") {
          const canonical = await page
            .locator('link[rel="canonical"]')
            .getAttribute("href");
          if (!canonical?.endsWith("/" + locale))
            throw Error("Missing localized canonical");
          if (
            (
              await page
                .locator('meta[name="viewport"]')
                .getAttribute("content")
            ).includes("maximum-scale=1")
          )
            throw Error("Zoom is disabled");
          await page
            .getByRole("tab", { name: en ? "Routine" : "Rotina", exact: true })
            .click();
          await page
            .getByRole("tabpanel")
            .getByText(
              en
                ? "Your meals and guidance for the day."
                : "Suas refeições e orientações para o dia.",
              { exact: true },
            )
            .waitFor();
          await page.keyboard.press("End");
          if (
            (await page
              .getByRole("tab", {
                name: en ? "Progress" : "Evolução",
                exact: true,
              })
              .getAttribute("aria-selected")) !== "true"
          )
            throw Error("Preview keyboard navigation");
          await page.locator("main details").nth(1).locator("summary").click();
          if (
            (await page.locator("main details").nth(1).getAttribute("open")) ===
            null
          )
            throw Error("FAQ disclosure");
          if (width === 1440) {
            const menu = page.getByRole("button", {
              name: en ? "Your coaching" : "O acompanhamento",
              exact: true,
            });
            await menu.click();
            await page
              .locator("#public-services")
              .getByRole("link")
              .first()
              .waitFor();
            await page.keyboard.press("Escape");
            if ((await menu.getAttribute("aria-expanded")) !== "false")
              throw Error("Dropdown Escape");
            await page
              .getByLabel(en ? "Language" : "Idioma", { exact: true })
              .selectOption(en ? "pt-BR" : "en-US");
            await page.waitForURL(`**/${en ? "pt-BR" : "en-US"}`, {
              timeout: 30000,
            });
          } else {
            await page
              .getByRole("button", {
                name: en ? "Open menu" : "Abrir menu",
                exact: true,
              })
              .click();
            const menu = page.getByRole("dialog", {
              name: en ? "Site navigation" : "Navegação do site",
              exact: true,
            });
            await menu.waitFor();
            await page.keyboard.press("Shift+Tab");
            if (
              !(await page.evaluate(
                () => !!document.activeElement.closest("[role=dialog]"),
              ))
            )
              throw Error("Mobile menu focus trap");
            await page.keyboard.press("Escape");
            if (await page.getByRole("dialog").count())
              throw Error("Mobile menu Escape");
            await page
              .getByRole("button", {
                name: en ? "Open menu" : "Abrir menu",
                exact: true,
              })
              .click();
            await menu
              .getByRole("link", {
                name: en ? "Workouts" : "Treinos",
                exact: true,
              })
              .click();
            await page.waitForURL(`**/${locale}/treinos`, { timeout: 30000 });
          }
        }
        if (
          route === "planos" &&
          (await page.locator('[data-ui="plan-checkout"]').count())
        ) {
          await page.locator('[data-ui="plan-checkout"]').click();
          await page.waitForURL(`**/${locale}/cadastro?next=checkout`, {
            timeout: 30000,
          });
        }
        if (errors.length) throw Error(`${route}: ${errors.join("\n")}`);
        await page.close();
        console.log(`${locale} ${route} ${width}px OK`);
      }
} finally {
  await browser.close();
}
