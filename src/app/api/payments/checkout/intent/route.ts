import { NextRequest } from "next/server"
import { checkoutIntentSchema } from "@/schemas/payments"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { StripeProvider } from "@/lib/payments/stripe"
import { ProfileService } from "@/lib/payments/services"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Prepara o pagamento com cartão dentro do site.
 * Cria/reutiliza o cliente no Stripe e gera um SetupIntent para salvar o cartão
 * sem cobrança imediata (a cobrança ocorre ao criar a assinatura).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, supabase } = await requireApiUser()
    const raw = await req.json()
    const parsed = checkoutIntentSchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse("Dados inválidos.", 400, "VALIDATION_ERROR", { issues: parsed.error.flatten() })
    }

    const { plan_id } = parsed.data

    const { data: plan } = await (supabase as any)
      .from("plans")
      .select("id, slug, stripe_price_id, is_active")
      .eq("id", plan_id)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .limit(1)
      .maybeSingle()

    if (!plan) {
      return errorResponse("Plano não encontrado ou indisponível.", 404, "PLAN_NOT_FOUND")
    }
    if (!plan.stripe_price_id) {
      return errorResponse("Pagamento com cartão indisponível.", 400, "PLAN_NO_STRIPE")
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const profile = await ProfileService.getProfile(userId)

    if (!profile || profile.is_deleted || profile.role !== "student") return errorResponse("Conta indisponível para pagamento.",403)

    const customerId = await StripeProvider.getOrCreateCustomer({
      userId,
      email: user?.email ?? (profile as any)?.email ?? "",
      name: profile?.full_name ?? undefined,
      existingCustomerId: profile?.stripe_customer_id ?? null,
    })

    if (profile?.stripe_customer_id !== customerId) {
      await ProfileService.setStripeCustomerId(userId, customerId)
    }

    const intent = await StripeProvider.createSetupIntentForSubscription({
      customerId,
      userId,
      planId: plan.id,
    })

    return jsonResponse({
      client_secret: intent.clientSecret,
      setup_intent_id: intent.setupIntentId,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
