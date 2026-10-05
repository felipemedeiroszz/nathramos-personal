import { NextRequest } from "next/server"
import { createCheckoutSchema } from "@/schemas/payments"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { StripeProvider } from "@/lib/payments/stripe"
import { ProfileService } from "@/lib/payments/services"

export async function POST(req: NextRequest) {
  try {
    const { userId, supabase } = await requireApiUser()
    const raw = await req.json()
    const parsed = createCheckoutSchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse("Dados de checkout inválidos.", 400, "VALIDATION_ERROR", { issues: parsed.error.flatten() })
    }

    const { plan_id, coupon_code, success_path, cancel_path } = parsed.data

    const { data: plan } = await (supabase as any)
      .from("plans")
      .select("id, slug, stripe_price_id, price_cents, currency, billing_cycle_days, trial_days, name_pt, name_en, is_active")
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
    const appUrl = StripeProvider.getAppUrl()
    const successUrl = `${appUrl}${success_path}?session_id={CHECKOUT_SESSION_ID}&plan=${plan.slug}`
    const cancelUrl = `${appUrl}${cancel_path}?plan=${plan.slug}`

    const result = await StripeProvider.createCheckoutSession({
      priceId: plan.stripe_price_id,
      customerId: profile?.stripe_customer_id ?? undefined,
      userId,
      planId: plan.id,
      trialDays: plan.trial_days,
      successUrl,
      cancelUrl,
      couponCode: coupon_code,
    })

    return jsonResponse({
      sessionId: result.sessionId,
      url: result.url,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
