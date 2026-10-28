import { NextRequest } from "next/server"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { billingProfile } from "@/lib/payments/student"
import { appReturnUrl } from "@/lib/payments/checkout"
import { StripeProvider } from "@/lib/payments/stripe"
import { ProfileService, SubscriptionService } from "@/lib/payments/services"
import type { SubscriptionRow } from "@/lib/supabase/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireApiUser()
    await billingProfile(userId)
    const profile = await ProfileService.getProfile(userId)
    const subscription = (await SubscriptionService.getActive(userId)) as
      | (SubscriptionRow & { plan: any } | null)

    let customerId = profile?.stripe_customer_id
    if (!customerId && subscription?.provider === "stripe" && subscription.external_id) {
      const stripeSub = await StripeProvider.getSubscription(subscription.external_id)
      if (stripeSub) {
        if (typeof stripeSub.customer === "string") {
          customerId = stripeSub.customer
        } else if (stripeSub.customer && typeof (stripeSub.customer as any).id === "string") {
          customerId = (stripeSub.customer as any).id
        }
      }
      if (customerId) {
        await ProfileService.setStripeCustomerId(userId, customerId)
      }
    }

    if (!customerId) {
      return errorResponse("Cliente Stripe não encontrado para este usuário.", 404, "NO_CUSTOMER")
    }

    const body = await req.json().catch(() => ({}) as any)
    const returnUrl = appReturnUrl(StripeProvider.getAppUrl(), body?.return_path, "/pt-BR/assinatura")
    const usePortal = body?.use_portal !== false

    if (usePortal) {
      const session = await StripeProvider.createBillingPortalSession(customerId, returnUrl)
      return jsonResponse({ type: "billing_portal", url: session.url })
    }

    const intent = await StripeProvider.createSetupIntent(customerId)
    return jsonResponse({
      type: "setup_intent",
      setup_intent_id: intent.setupIntentId,
      client_secret: intent.clientSecret,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
