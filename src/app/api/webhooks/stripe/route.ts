import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { StripeProvider } from "@/lib/payments/stripe"
import { PaymentService, SubscriptionService, ProfileService } from "@/lib/payments/services"
import type {
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  Currency,
} from "@/types"

const getEnv = (key: string) => process.env[key] ?? ""

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  unpaid: "past_due",
  canceled: "canceled",
  incomplete: "inactive",
  incomplete_expired: "expired",
  paused: "inactive",
}

function toIsoOrNull(value: number | null | undefined): string | undefined {
  if (value == null) return undefined
  return new Date(value * 1000).toISOString()
}

function getPaymentMethodFromStripe(invoice: any): PaymentMethod {
  const charge = invoice?.charge
  if (!charge) return "credit_card"
  if (typeof charge === "object") {
    const method = charge?.payment_method_details?.type
    if (method === "card") return "credit_card"
    if (method === "pix") return "pix"
    if (method === "boleto") return "boleto"
    if (method === "bank_transfer") return "bank_transfer"
  }
  return "credit_card"
}

function resolveClientReferenceId(eventObj: any): string | null {
  return (
    eventObj?.metadata?.user_id ||
    eventObj?.client_reference_id ||
    eventObj?.customer_email ||
    null
  )
}

async function resolveUserIdFromEvent(event: Stripe.Event, obj: any): Promise<string | null> {
  const directUserId = resolveClientReferenceId(obj)
  if (directUserId && /^[0-9a-fA-F-]{36}$/.test(directUserId)) return directUserId

  const customerId =
    (obj && typeof obj.customer === "string" ? obj.customer : obj?.customer?.id) ?? null

  if (customerId) {
    const { createServiceClientSSR } = await import("@/lib/supabase/server")
    const supabase = await createServiceClientSSR()
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .limit(1)
      .maybeSingle()
    if (profile) return (profile as any).id
  }

  if (event.type.startsWith("customer.subscription") || event.type.startsWith("invoice") || event.type.startsWith("charge")) {
    const subId =
      (obj?.subscription && typeof obj.subscription === "string"
        ? obj.subscription
        : obj?.subscription?.id) ??
      (event.type.startsWith("customer.subscription") ? obj?.id : null)
    if (subId) {
      const sub = await SubscriptionService.findByExternalId("stripe", subId)
      if (sub) return sub.user_id
    }
  }

  return null
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session: any = event.data.object
  const userId =
    (session.metadata?.user_id as string) ||
    session.client_reference_id ||
    (await resolveUserIdFromEvent(event, session))
  if (!userId) throw new Error("checkout.session.completed sem user_id resolvível")

  const planId = session.metadata?.plan_id as string | undefined
  const ebookId = session.metadata?.ebook_id as string | undefined
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id

  if (customerId) {
    await ProfileService.setStripeCustomerId(userId, customerId)
  }

  if (ebookId) {
    const currency = ((session.currency as string)?.toUpperCase() as Currency) ?? "BRL"
    const amountCents = session.amount_total ?? 0
    const externalId = session.payment_intent ? String(session.payment_intent) : `checkout_${session.id}`

    await PaymentService.upsertPayment({
      userId,
      provider: "stripe",
      externalId,
      externalEventId: event.id,
      status: "paid",
      amountCents,
      currency,
      method: "credit_card",
      descriptionPt: "Compra de e-book (Stripe Checkout)",
      descriptionEn: "E-book purchase (Stripe Checkout)",
      paidAt: new Date().toISOString(),
      metadata: { checkout_session_id: session.id, ebook_id: ebookId },
    })

    const { EbookService } = await import("@/services/EbookService")
    await EbookService.markPurchasePaid({
      userId,
      ebookId,
      provider: "stripe",
      amountCents,
      currency,
      externalId,
      externalEventId: event.id,
    })
  }

  if (planId) {
    const currency = ((session.currency as string)?.toUpperCase() as Currency) ?? "BRL"
    const amountCents = session.amount_total ?? 0

    await PaymentService.upsertPayment({
      userId,
      provider: "stripe",
      externalId: session.payment_intent ? String(session.payment_intent) : `checkout_${session.id}`,
      externalEventId: event.id,
      status: "paid",
      amountCents,
      currency,
      method: "credit_card",
      descriptionPt: "Assinatura inicial (Stripe Checkout)",
      descriptionEn: "Initial subscription (Stripe Checkout)",
      paidAt: new Date().toISOString(),
      metadata: { checkout_session_id: session.id, plan_id: planId },
    })
  }

  return { userId, planId, customerId }
}

async function handleSubscriptionCreatedOrUpdated(event: Stripe.Event, _type: "created" | "updated") {
  const sub: any = event.data.object
  const userId =
    (sub.metadata?.user_id as string) ||
    (await resolveUserIdFromEvent(event, sub))
  if (!userId) throw new Error(`${event.type} sem user_id resolvível`)

  const planId = sub.metadata?.plan_id as string | undefined
  if (!planId) {
    const existing = await SubscriptionService.findByExternalId("stripe", sub.id)
    if (existing) return { userId, planId: existing.plan_id }
    return null
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id
  if (customerId) {
    try { await ProfileService.setStripeCustomerId(userId, customerId) } catch { /* noop */ }
  }

  const status = STRIPE_STATUS_MAP[sub.status as string] ?? "inactive"
  const item = sub.items?.data?.[0]
  const price = item?.price
  const unitAmount =
    price?.unit_amount ??
    (sub.items?.data || []).reduce((acc: number, i: any) => acc + (i.price?.unit_amount ?? 0), 0)
  const billingCycleDays =
    price?.recurring?.interval === "year" ? 365 :
    price?.recurring?.interval === "month" ? 30 :
    price?.recurring?.interval === "week" ? 7 : 30

  await SubscriptionService.upsertSubscription({
    userId,
    planId,
    externalId: sub.id,
    provider: "stripe",
    externalStatus: sub.status,
    status,
    currency: (((sub.currency as string) || "brl").toUpperCase() as Currency),
    unitAmountCents: unitAmount,
    billingCycleDays,
    trialEndsAt: toIsoOrNull(sub.trial_end),
    currentPeriodStart: toIsoOrNull(sub.current_period_start) || new Date().toISOString(),
    currentPeriodEnd: toIsoOrNull(sub.current_period_end) || new Date(Date.now() + 30 * 86400_000).toISOString(),
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    canceledAt: toIsoOrNull(sub.canceled_at),
    endedAt: toIsoOrNull(sub.ended_at),
    lastPaidAt: status === "active" ? new Date().toISOString() : undefined,
  })

  return { userId, planId }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const sub: any = event.data.object
  const existing = await SubscriptionService.findByExternalId("stripe", sub.id)
  if (!existing) return null
  await SubscriptionService.upsertSubscription({
    userId: existing.user_id,
    planId: existing.plan_id,
    externalId: sub.id,
    provider: "stripe",
    externalStatus: sub.status,
    status: "canceled",
    currency: existing.currency as Currency,
    unitAmountCents: existing.unit_amount_cents,
    billingCycleDays: existing.billing_cycle_days,
    currentPeriodStart: existing.current_period_start,
    currentPeriodEnd: existing.current_period_end,
    endedAt: toIsoOrNull(sub.ended_at) || new Date().toISOString(),
    canceledAt: toIsoOrNull(sub.canceled_at) || new Date().toISOString(),
  })
  return { userId: existing.user_id }
}

async function handleInvoicePaid(event: Stripe.Event) {
  const invoice: any = event.data.object
  const userId =
    (invoice.metadata?.user_id as string) ||
    (await resolveUserIdFromEvent(event, invoice))
  if (!userId) throw new Error("invoice.paid sem user_id resolvível")

  const subId =
    (invoice.subscription && typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id) ?? null
  let subscriptionId: string | undefined
  let planId: string | undefined
  if (subId) {
    const sub = await SubscriptionService.findByExternalId("stripe", subId)
    subscriptionId = sub?.id
    planId = sub?.plan_id
  }

  const now = new Date().toISOString()
  if (subId && planId) {
    try {
      const stripeSub: any = await StripeProvider.getSubscription(subId)
      if (stripeSub) {
        const item = stripeSub.items?.data?.[0]
        const price = item?.price
        const billingCycleDays =
          price?.recurring?.interval === "year" ? 365 :
          price?.recurring?.interval === "month" ? 30 :
          price?.recurring?.interval === "week" ? 7 : 30
        await SubscriptionService.upsertSubscription({
          userId,
          planId,
          externalId: stripeSub.id,
          provider: "stripe",
          externalStatus: stripeSub.status,
          status: STRIPE_STATUS_MAP[stripeSub.status as string] ?? "active",
          currency: (((stripeSub.currency as string) || "brl").toUpperCase() as Currency),
          unitAmountCents: price?.unit_amount ?? 0,
          billingCycleDays,
          trialEndsAt: toIsoOrNull(stripeSub.trial_end),
          currentPeriodStart: toIsoOrNull(stripeSub.current_period_start) || new Date().toISOString(),
          currentPeriodEnd: toIsoOrNull(stripeSub.current_period_end) || new Date(Date.now() + 30 * 86400_000).toISOString(),
          cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
          canceledAt: toIsoOrNull(stripeSub.canceled_at),
          endedAt: toIsoOrNull(stripeSub.ended_at),
          lastPaidAt: now,
        })
      }
    } catch { /* noop */ }
  }

  const chargeObj = invoice.charge
  const feeCents =
    (chargeObj && typeof chargeObj === "object" && (chargeObj as any).balance_transaction
      ? ((chargeObj as any).fee ?? 0)
      : 0) || 0

  const method = getPaymentMethodFromStripe(invoice)

  await PaymentService.upsertPayment({
    userId,
    subscriptionId,
    provider: "stripe",
    externalId: invoice.id,
    externalEventId: event.id,
    status: "paid",
    amountCents: invoice.total ?? 0,
    currency: (((invoice.currency as string) || "brl").toUpperCase() as Currency),
    feeCents,
    method,
    descriptionPt: invoice.description ? String(invoice.description) : "Fatura paga",
    descriptionEn: invoice.description ? String(invoice.description) : "Invoice paid",
    paidAt: now,
    metadata: { invoice_id: invoice.id, subscription_external_id: subId, plan_id: planId },
  })

  return { userId, subscriptionId }
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice: any = event.data.object
  const userId = await resolveUserIdFromEvent(event, invoice)
  if (!userId) return null

  const subId =
    (invoice.subscription && typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id) ?? null

  const existingSub = subId ? await SubscriptionService.findByExternalId("stripe", subId) : null
  const now = new Date().toISOString()
  if (existingSub) {
    await SubscriptionService.upsertSubscription({
      userId,
      planId: existingSub.plan_id,
      externalId: existingSub.external_id ?? subId ?? undefined,
      provider: "stripe",
      externalStatus: "past_due",
      status: "past_due",
      currency: existingSub.currency as Currency,
      unitAmountCents: existingSub.unit_amount_cents,
      billingCycleDays: existingSub.billing_cycle_days,
      currentPeriodStart: existingSub.current_period_start,
      currentPeriodEnd: existingSub.current_period_end,
      lastFailedAt: now,
    })
  }

  await PaymentService.upsertPayment({
    userId,
    subscriptionId: existingSub?.id,
    provider: "stripe",
    externalId: invoice.id,
    externalEventId: event.id,
    status: "failed",
    amountCents: invoice.total ?? 0,
    currency: (((invoice.currency as string) || "brl").toUpperCase() as Currency),
    method: getPaymentMethodFromStripe(invoice),
    descriptionPt: "Falha no pagamento da fatura",
    descriptionEn: "Invoice payment failed",
    failedAt: now,
    failureReason: (invoice as any).last_payment_error?.message,
    metadata: { invoice_id: invoice.id },
  })
  return { userId }
}

async function handleChargeRefunded(event: Stripe.Event) {
  const charge: any = event.data.object
  const userId = await resolveUserIdFromEvent(event, charge)
  if (!userId) return null

  const invoiceId = (charge as any).invoice
  let subscriptionId: string | undefined
  if (invoiceId && typeof invoiceId === "string") {
    const existing = await PaymentService.findByExternalId("stripe", invoiceId)
    subscriptionId = existing?.subscription_id ?? undefined
  }

  const refundedAmount = charge.amount_refunded ?? charge.amount ?? 0
  const status: PaymentStatus = charge.refunded && refundedAmount >= (charge.amount ?? 0) ? "refunded" : "partially_refunded"

  await PaymentService.upsertPayment({
    userId,
    subscriptionId,
    provider: "stripe",
    externalId: charge.id,
    externalEventId: event.id,
    status,
    amountCents: charge.amount ?? 0,
    currency: (((charge.currency as string) || "brl").toUpperCase() as Currency),
    method: charge.payment_method_details?.type === "pix" ? "pix" : "credit_card",
    descriptionPt: `Reembolso ${status === "refunded" ? "total" : "parcial"}`,
    descriptionEn: `${status === "refunded" ? "Full" : "Partial"} refund`,
    refundedAt: new Date().toISOString(),
    metadata: { charge_id: charge.id },
  })
  return { userId }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature") ?? ""
  const secret = getEnv("STRIPE_WEBHOOK_SECRET")
  const rawBody = await req.text()

  if (!secret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 500 })
  }
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = await StripeProvider.constructWebhookEvent(rawBody, signature, secret)
  } catch (err: any) {
    return NextResponse.json({ error: "Assinatura inválida.", detail: String(err?.message ?? err) }, { status: 400 })
  }

  const provider: PaymentProvider = "stripe"
  const alreadyProcessed = await PaymentService.isEventProcessed(provider, event.id)

  const mark = async (params: { errorText?: string } = {}) => {
    try {
      await PaymentService.markEventProcessed({
        provider,
        eventId: event.id,
        eventType: event.type,
        payload: event.data.object as unknown as Record<string, unknown>,
        signatureOk: true,
        errorText: params.errorText,
      })
    } catch (logErr) {
      console.error("[webhook:stripe] markEventProcessed failed:", logErr)
    }
  }

  if (alreadyProcessed) {
    await mark()
    return NextResponse.json({ ok: true, idempotent: true })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event)
        break
      case "customer.subscription.created":
        await handleSubscriptionCreatedOrUpdated(event, "created")
        break
      case "customer.subscription.updated":
        await handleSubscriptionCreatedOrUpdated(event, "updated")
        break
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event)
        break
      case "invoice.paid":
        await handleInvoicePaid(event)
        break
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event)
        break
      case "charge.refunded":
        await handleChargeRefunded(event)
        break
      default:
        break
    }
    await mark()
    return NextResponse.json({ ok: true, received: true, type: event.type })
  } catch (err: any) {
    const message = String(err?.message ?? err)
    console.error(`[webhook:stripe] error processing ${event.type}:`, err)
    await mark({ errorText: message })
    return NextResponse.json({ ok: false, error: "Erro ao processar webhook." }, { status: 500 })
  }
}
