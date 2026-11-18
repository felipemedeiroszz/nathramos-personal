export type CheckoutPlan = {
  is_active: boolean;
  is_deleted?: boolean;
  price_cents: number;
  currency: string;
  stripe_price_id?: string | null;
};
export type PaymentEnvironment = Record<string, string | undefined>;
export function configured(value?: string | null) {
  const text = value?.trim();
  return Boolean(
    text &&
    !/[<>]/.test(text) &&
    !/^(?:your[_-]|replace[_-]|changeme|placeholder|x{3,}$)/i.test(text),
  );
}
export function paymentAvailability(
  plan: CheckoutPlan | null,
  env: PaymentEnvironment,
) {
  const eligible = Boolean(
    plan?.is_active &&
    !plan.is_deleted &&
    Number.isInteger(plan.price_cents) &&
    plan.price_cents > 0,
  );
  const secretMode = env.STRIPE_SECRET_KEY?.match(
      /^(?:sk|rk)_(test|live)_/,
    )?.[1],
    publicMode =
      env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.match(/^pk_(test|live)_/)?.[1];
  const cardAvailable =
    eligible &&
    configured(plan?.stripe_price_id) &&
    Boolean(plan?.stripe_price_id?.startsWith("price_")) &&
    configured(env.STRIPE_SECRET_KEY) &&
    configured(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) &&
    Boolean(secretMode && secretMode === publicMode);
  const asaasEnvironment = env.ASAAS_ENVIRONMENT?.trim() || "sandbox";
  const pixAvailable =
    eligible &&
    plan?.currency === "BRL" &&
    configured(env.ASAAS_API_KEY) &&
    ["sandbox", "production"].includes(asaasEnvironment);
  return {
    available: cardAvailable || pixAvailable,
    cardAvailable,
    pixAvailable: Boolean(pixAvailable),
  };
}
