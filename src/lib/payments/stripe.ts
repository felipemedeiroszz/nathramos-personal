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
      timeout: 15000,
      maxNetworkRetries: 2,
    })
  }
  return stripeInstance
}

export interface CreateCheckoutSessionInput {
  priceId: string
  idempotencyKey?: string
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
  expiresAt: string
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
          ...(input.metadata ?? {}),
        },
        ...(input.trialDays && input.trialDays > 0
          ? { trial_period_days: input.trialDays }
          : {}),
      },
      allow_promotion_codes: true,
      ...(input.customerId ? { customer: input.customerId } : {}),
    }

    if (input.couponCode && input.couponCode.length > 0) {
      try {
        const promo = await stripe.promotionCodes.list({ code: input.couponCode, active: true, limit: 1 })
        if (promo.data.length > 0) {
          delete params.allow_promotion_codes
          params.discounts = [{ promotion_code: promo.data[0].id }]
        }
      } catch {
        // ignora cupom inválido
      }
    }

    const session = await stripe.checkout.sessions.create(params, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined)
    if (!session.url) {
      throw new Error("Stripe não retornou URL de checkout.")
    }
    return { sessionId: session.id, url: session.url, expiresAt: new Date(session.expires_at * 1000).toISOString() }
  },

  async getOrCreateCustomer(input: {
    userId: string
    email: string
    name?: string
    existingCustomerId?: string | null
  }): Promise<string> {
    const stripe = getStripeClient()

    if (input.existingCustomerId) {
      try {
        const existing = await stripe.customers.retrieve(input.existingCustomerId)
        if (!(existing as Stripe.DeletedCustomer).deleted) {
          return input.existingCustomerId
        }
      } catch (error) {
        if (!(error instanceof Stripe.errors.StripeInvalidRequestError) || error.code !== "resource_missing") throw error
      }
    }

    const created = await stripe.customers.create({
      email: input.email || undefined,
      name: input.name || undefined,
      metadata: { user_id: input.userId },
    }, { idempotencyKey: `customer:${input.userId}:${input.existingCustomerId || "initial"}` })
    return created.id
  },

  /** SetupIntent para coletar e salvar o cartão sem cobrança imediata. */
  async createSetupIntentForSubscription(input: {
    customerId: string
    userId: string
    planId: string
  }): Promise<{ clientSecret: string; setupIntentId: string }> {
    const stripe = getStripeClient()
    const intent = await stripe.setupIntents.create({
      customer: input.customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { user_id: input.userId, plan_id: input.planId },
    })
    if (!intent.client_secret) {
      throw new Error("Stripe não retornou o client secret do SetupIntent.")
    }
    return { clientSecret: intent.client_secret, setupIntentId: intent.id }
  },

  /**
   * Cria a assinatura usando um cartão já salvo (SetupIntent confirmado).
   * - Com trial: a assinatura entra em `trialing` sem cobrança imediata.
   * - Sem trial: o Stripe cobra a primeira fatura com o cartão salvo.
   */
  async createSubscriptionWithPaymentMethod(input: {
    customerId: string
    priceId: string
    paymentMethodId: string
    userId: string
    planId: string
    trialDays?: number
    idempotencyKey?: string
  }): Promise<Stripe.Subscription> {
    const stripe = getStripeClient()

    await stripe.customers.update(input.customerId, {
      invoice_settings: { default_payment_method: input.paymentMethodId },
    })

    const subscription = await stripe.subscriptions.create({
      customer: input.customerId,
      items: [{ price: input.priceId }],
      default_payment_method: input.paymentMethodId,
      payment_behavior: "allow_incomplete",
      expand: ["latest_invoice.payment_intent"],
      metadata: { user_id: input.userId, plan_id: input.planId, ...(input.idempotencyKey ? {checkout_id:input.idempotencyKey} : {}) },
      ...(input.trialDays && input.trialDays > 0
        ? { trial_period_days: input.trialDays }
        : {}),
    }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined)

    return subscription
  },

  async createOneTimeCheckoutSession(input: {
    userId: string
    customerId?: string
    idempotencyKey?: string
    customerEmail?: string
    amountCents: number
    currency: string
    productName: string
    productDescription?: string
    successUrl: string
    cancelUrl: string
    metadata?: Record<string, string>
  }): Promise<CheckoutSessionResult> {
    const stripe = getStripeClient()
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.userId,
      metadata: {
        user_id: input.userId,
        ...(input.metadata ?? {}),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (input.currency || "BRL").toLowerCase(),
            unit_amount: input.amountCents,
            product_data: {
              name: input.productName,
              ...(input.productDescription ? { description: input.productDescription } : {}),
            },
          },
        },
      ],
      ...(input.customerId
        ? { customer: input.customerId }
        : input.customerEmail
        ? { customer_email: input.customerEmail }
        : { customer_creation: "always" }),
    }

    const session = await stripe.checkout.sessions.create(params, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined)
    if (!session.url) {
      throw new Error("Stripe não retornou URL de checkout.")
    }
    return { sessionId: session.id, url: session.url, expiresAt: new Date(session.expires_at * 1000).toISOString() }
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
