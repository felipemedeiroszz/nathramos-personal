import Stripe from "stripe"

const getEnv = (key: string, required = false) => {
  const value = process.env[key]
  if (required && (!value || value.length === 0)) {
    throw new Error(`[stripe] Missing required env: ${key}`)
  }
  return value ?? ""
}

const apiKey = getEnv("STRIPE_SECRET_KEY")
const appUrl = getEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000"

let stripeInstance: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY não configurada.")
    }
    stripeInstance = new Stripe(apiKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    })
  }
  return stripeInstance
}

export interface CreateCheckoutSessionInput {
  priceId: string
  customerId?: string
  userId: string
  planId: string
  trialDays?: number
  successUrl: string
  cancelUrl: string
  couponCode?: string
  metadata?: Record<string, string>
}

export interface CheckoutSessionResult {
  sessionId: string
  url: string
}

export const StripeProvider = {
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResult> {
    const stripe = getStripeClient()
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.userId,
      metadata: {
        user_id: input.userId,
        plan_id: input.planId,
        ...(input.metadata ?? {}),
      },
      line_items: [
        {
          price: input.priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          user_id: input.userId,
          plan_id: input.planId,
        },
        ...(input.trialDays && input.trialDays > 0
          ? { trial_period_days: input.trialDays }
          : {}),
      },
      allow_promotion_codes: true,
      ...(input.customerId ? { customer: input.customerId } : { customer_creation: "always" }),
    }

    if (input.couponCode && input.couponCode.length > 0) {
      try {
        const promo = await stripe.promotionCodes.list({ code: input.couponCode, active: true, limit: 1 })
        if (promo.data.length > 0) {
          params.discounts = [{ promotion_code: promo.data[0].id }]
        }
      } catch {
        // ignora cupom inválido
      }
    }

    const session = await stripe.checkout.sessions.create(params)
    if (!session.url) {
      throw new Error("Stripe não retornou URL de checkout.")
    }
    return { sessionId: session.id, url: session.url }
  },

  async cancelSubscription(externalSubscriptionId: string): Promise<void> {
    const stripe = getStripeClient()
    await stripe.subscriptions.update(externalSubscriptionId, {
      cancel_at_period_end: true,
    })
  },

  async cancelSubscriptionImmediately(externalSubscriptionId: string): Promise<void> {
    const stripe = getStripeClient()
    await stripe.subscriptions.cancel(externalSubscriptionId)
  },

  async reactivateSubscription(externalSubscriptionId: string): Promise<void> {
    const stripe = getStripeClient()
    const sub = await stripe.subscriptions.retrieve(externalSubscriptionId)
    if (sub.cancel_at_period_end) {
      await stripe.subscriptions.update(externalSubscriptionId, {
        cancel_at_period_end: false,
      })
    }
  },

  async createSetupIntent(customerId: string): Promise<{ clientSecret: string; setupIntentId: string }> {
    const stripe = getStripeClient()
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true },
    })
    return { clientSecret: intent.client_secret ?? "", setupIntentId: intent.id }
  },

  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    const stripe = getStripeClient()
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return { url: session.url }
  },

  async getSubscription(externalSubscriptionId: string) {
    const stripe = getStripeClient()
    return stripe.subscriptions.retrieve(externalSubscriptionId)
  },

  async constructWebhookEvent(body: string, signature: string, secret: string) {
    const stripe = getStripeClient()
    return stripe.webhooks.constructEvent(body, signature, secret)
  },

  getAppUrl() {
    return appUrl
  },
}
