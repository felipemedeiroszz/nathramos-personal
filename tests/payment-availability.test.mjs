import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { paymentAvailability, configured } = loadTs(
  "src/lib/payments/availability.ts",
);
const plan = {
  is_active: true,
  is_deleted: false,
  price_cents: 9700,
  currency: "BRL",
  stripe_price_id: "price_fixture",
};
test("new account cannot see configured methods when payment credentials are absent", () => {
  assert.deepEqual(paymentAvailability(plan, {}), {
    available: false,
    cardAvailable: false,
    pixAvailable: false,
  });
  for (const value of [
    "",
    "   ",
    "<stripe-secret-key>",
    "your_api_key",
    "changeme",
  ])
    assert.equal(configured(value), false);
});
test("PIX can be enabled independently of Stripe for an active BRL plan", () => {
  const env = { ASAAS_API_KEY: "fixture-token", ASAAS_ENVIRONMENT: "sandbox" };
  assert.deepEqual(
    paymentAvailability({ ...plan, stripe_price_id: null }, env),
    { available: true, cardAvailable: false, pixAvailable: true },
  );
  assert.equal(
    paymentAvailability({ ...plan, currency: "USD" }, env).pixAvailable,
    false,
  );
  assert.equal(
    paymentAvailability(plan, { ...env, ASAAS_ENVIRONMENT: "invalid" })
      .pixAvailable,
    false,
  );
});
test("card requires a linked Stripe price and matching test/live keys", () => {
  const env = {
    STRIPE_SECRET_KEY: "sk_test_fixture",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_fixture",
  };
  assert.equal(paymentAvailability(plan, env).cardAvailable, true);
  assert.equal(
    paymentAvailability({ ...plan, stripe_price_id: null }, env).cardAvailable,
    false,
  );
  assert.equal(
    paymentAvailability(plan, {
      ...env,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_fixture",
    }).cardAvailable,
    false,
  );
  assert.equal(
    paymentAvailability(plan, { ...env, STRIPE_SECRET_KEY: "rk_test_fixture" })
      .cardAvailable,
    true,
  );
  for (const candidate of [
    null,
    { ...plan, is_active: false },
    { ...plan, is_deleted: true },
    { ...plan, price_cents: 0 },
  ])
    assert.equal(paymentAvailability(candidate, env).available, false);
});
test("checkout chooses from active plans while administration can retain inactive plans", async () => {
  const { PlanService } = loadTs("src/services/PlanService.ts", {
    "../lib/supabase/server": {},
    "./AuditLogService": { AuditLogService: {} },
  });
  let options;
  PlanService.list = async (value) => {
    options = value;
    return value?.includeInactive
      ? [{ id: "inactive" }, { id: "active" }]
      : [{ id: "active" }];
  };
  assert.equal((await PlanService.getCheckoutPlan()).id, "active");
  assert.equal(options, undefined);
  assert.equal((await PlanService.getPrimary()).id, "inactive");
  assert.deepEqual(options, { includeInactive: true });
});
test("administrator readiness diagnostics show missing field names without credential values", () => {
  const before = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_sensitive_fixture";
  try {
    const { PaymentSetupPanel } = loadTs(
      "src/components/admin/billing/PaymentSetupPanel.tsx",
      { "server-only": {} },
    );
    const html = renderToStaticMarkup(
      React.createElement(PaymentSetupPanel, { plan, locale: "pt-BR" }),
    );
    assert(html.includes("STRIPE_SECRET_KEY"));
    assert(html.includes("ASAAS_API_KEY"));
    assert(!html.includes("sk_test_sensitive_fixture"));
    assert(!html.includes("pk_test_sensitive_fixture"));
  } finally {
    if (before === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = before;
  }
});

test("checkout unavailable page offers support without redirecting back into the billing loop", async () => {
  const keys = [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "ASAAS_API_KEY",
  ];
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
  const mocks = {
    "@/components/payments/checkout.css": {},
    "next/navigation": {
      redirect: (path) => {
        throw Error("redirect:" + path);
      },
    },
    "next-intl/server": {
      setRequestLocale() {},
      getTranslations: async () => (key) => key,
    },
    "@/components/public/PublicShell": {
      PublicShell: ({ children }) => React.createElement("div", {}, children),
    },
    "@/components/payments/CheckoutClient": {
      CheckoutClient: () => React.createElement("span", {}, "Enabled checkout"),
    },
    "@/lib/payments/services": {
      ProfileService: { getProfile: async () => ({}) },
    },
    "@/services/PlanService": {
      PlanService: {
        getCheckoutPlan: async () => ({
          ...plan,
          id: "plan",
          name_pt: "Essencial",
          name_en: "Essential",
          billing_cycle_days: 30,
        }),
      },
    },
    "@/lib/supabase/server": {
      createClientSSR: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "student" } } }) },
      }),
    },
    "@/lib/auth/access": {
      canAccessPlatform: async () => ({ allowed: false }),
    },
    "@/lib/payments/support": { paymentSupportHref: async () => "/pt-BR/faq" },
  };
  try {
    const { default: Page } = loadTs(
      "src/app/[locale]/assinatura/checkout/page.tsx",
      mocks,
    );
    const html = renderToStaticMarkup(
      await Page({ params: Promise.resolve({ locale: "pt-BR" }) }),
    );
    assert(html.includes("Contratação online indisponível"));
    assert(html.includes('href="/pt-BR/faq"'));
    assert(!html.includes('href="/pt-BR/assinatura"'));
    assert(!html.includes("Enabled checkout"));
  } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
