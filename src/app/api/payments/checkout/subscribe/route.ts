import { NextRequest } from "next/server"
import { checkoutSubscribeSchema } from "@/schemas/payments"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { StripeProvider } from "@/lib/payments/stripe"
import { ProfileService, SubscriptionService } from "@/lib/payments/services"
import type { CurrencyT, SubscriptionStatusT } from "@/lib/supabase/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function mapStripeStatus(status: string): SubscriptionStatusT {
  switch (status) {
    case "trialing":
      return "trialing"
    case "active":
      return "active"
    case "past_due":
      return "past_due"
    default:
      return "inactive"
  }
}

/**
 * Cria a assinatura usando o cartão salvo (SetupIntent confirmado) e
 * sincroniza a assinatura local para liberar o acesso sem depender do webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, supabase } = await requireApiUser()
    const raw = await req.json()
    const parsed = checkoutSubscribeSchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse("Dados inválidos.", 400, "VALIDATION_ERROR", { issues: parsed.error.flatten() })
    }

    const { plan_id, payment_method_id } = parsed.data

    const { data: plan } = await (supabase as any)
      .from("plans")
      .select("id, slug, stripe_price_id, price_cents, currency, billing_cycle_days, trial_days, is_active")
      .eq("id", plan_id)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .limit(1)
      .maybeSingle()

    if (!plan) {
      return errorResponse("Plano não encontrado ou indisponível.", 404, "PLAN_NOT_FOUND")
    }
    if (!plan.stripe_price_id) {
      return errorResponse("Plano não configurado para Stripe.", 400, "PLAN_NO_STRIPE")
    }

    const profile = await ProfileService.getProfile(userId)
    if (!profile?.stripe_customer_id) {
      return errorResponse("Sessão de pagamento expirada. Recarregue a página.", 400, "NO_CUSTOMER")
    }

    const subscription = await StripeProvider.createSubscriptionWithPaymentMethod({
      customerId: profile.stripe_customer_id,
      priceId: plan.stripe_price_id,
      paymentMethodId: payment_method_id,
      userId,
      planId: plan.id,
      trialDays: plan.trial_days,
    })

    const rawSub = subscription as any
    const item = rawSub.items?.data?.[0]
    const now = new Date()
    const periodStart = item?.current_period_start
      ? new Date(item.current_period_start * 1000)
      : now
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : new Date(now.getTime() + (plan.billing_cycle_days || 30) * 86400_000)
    const trialEndsAt = rawSub.trial_end
      ? new Date(rawSub.trial_end * 1000).toISOString()
      : undefined

    const stripeStatus = String(rawSub.status ?? "")
    const localStatus = mapStripeStatus(stripeStatus)

    await SubscriptionService.upsertSubscription({
      userId,
      planId: plan.id,
      externalId: subscription.id,
      provider: "stripe",
      externalStatus: stripeStatus,
      status: localStatus,
      currency: plan.currency as CurrencyT,
      unitAmountCents: plan.price_cents,
      billingCycleDays: plan.billing_cycle_days,
      trialEndsAt,
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: Boolean(rawSub.cancel_at_period_end),
      lastPaidAt: localStatus === "active" ? now.toISOString() : undefined,
    })

    const latestInvoice = rawSub.latest_invoice
    const paymentIntent =
      latestInvoice && typeof latestInvoice === "object" ? latestInvoice.payment_intent : null
    const clientSecret =
      paymentIntent && typeof paymentIntent === "object" ? paymentIntent.client_secret : null

    return jsonResponse({
      status: localStatus,
      stripe_status: stripeStatus,
      subscription_id: subscription.id,
      requires_action: stripeStatus === "incomplete",
      client_secret: clientSecret ?? null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
