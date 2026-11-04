import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";

test("Stripe cobra na contratação e ignora trial legado nos dois fluxos de checkout", async () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  const requests = [];
  class Stripe {
    customers = { update: async () => ({}) };
    checkout = { sessions: { create: async params => { requests.push(params); return { id: "cs_test", url: "https://example.test/checkout", expires_at: 1800000000 }; } } };
    subscriptions = { create: async params => { requests.push(params); return { id: "sub_test", status: "incomplete" }; } };
  }
  try {
    const { StripeProvider } = loadTs("src/lib/payments/stripe.ts", { stripe: Stripe });
    await StripeProvider.createCheckoutSession({ userId: "user", planId: "plan", priceId: "price", trialDays: 7, successUrl: "https://example.test/success", cancelUrl: "https://example.test/cancel" });
    await StripeProvider.createSubscriptionWithPaymentMethod({ customerId: "cus", priceId: "price", paymentMethodId: "pm", userId: "user", planId: "plan", trialDays: 7 });
    assert.equal(requests.length, 2);
    for (const params of requests) {
      assert.equal(params.trial_period_days, undefined);
      assert.equal(params.subscription_data?.trial_period_days, undefined);
      assert.equal(params.trial_end, undefined);
    }
    assert.equal(requests[1].payment_behavior, "allow_incomplete");
    const { eligibleTrialDays } = loadTs("src/lib/payments/validation.ts", { "server-only": {}, "./stripe": {} });
    assert.equal(await eligibleTrialDays("user", 7), 0);
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
  }
});

test("resumo mostra o preço integral no cartão e PIX, sem oferta de teste", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { createElement } = await import("react");
  const { CheckoutSummary } = loadTs("src/components/payments/CheckoutSummary.tsx", { "next/link": ({ children }) => children });
  for (const method of ["card", "pix"]) {
    const html = renderToStaticMarkup(createElement(CheckoutSummary, {
      locale: "pt-BR", planName: "Plano completo", priceLabel: "R$ 97,00", cycleLabel: "mês", method, preview: true,
      // Stale caller props must never override immediate billing.
      trialDays: 7, totalTodayLabel: "R$ 0,00",
      labels: { planSummary: "Resumo", billingCycle: "Ciclo", method: "Forma", creditCard: "Cartão", pix: "PIX", totalDueToday: "Total hoje", secureNote: "Seguro", trialNote: "Teste de 7 dias" },
    }));
    assert.ok(html.includes("R$ 97,00"));
    assert.equal(html.includes("R$ 0,00"), false);
    assert.equal(html.includes("Teste de 7 dias"), false);
  }
});
