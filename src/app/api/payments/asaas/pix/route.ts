import { NextRequest } from "next/server"
import { createPixSchema } from "@/schemas/payments"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { AsaasProvider } from "@/lib/payments/asaas"
import { PaymentService, ProfileService, SubscriptionService } from "@/lib/payments/services"
import type { PaymentMethod } from "@/types"
import type { CurrencyT } from "@/lib/supabase/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { userId, supabase } = await requireApiUser()
    const raw = await req.json()
    const parsed = createPixSchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse("Dados inválidos.", 400, "VALIDATION_ERROR", { issues: parsed.error.flatten() })
    }
    const { plan_id } = parsed.data

    const { data: plan } = await (supabase as any)
      .from("plans")
      .select("id, stripe_price_id, price_cents, currency, billing_cycle_days, trial_days, name_pt, name_en, is_active, asaas_plan_id")
      .eq("id", plan_id)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .limit(1)
      .maybeSingle()

    if (!plan) {
      return errorResponse("Plano não encontrado ou indisponível.", 404, "PLAN_NOT_FOUND")
    }

    const profile = await ProfileService.getProfile(userId)
    if (!profile) {
      return errorResponse("Perfil de usuário não encontrado.", 404, "PROFILE_NOT_FOUND")
    }

    const amount = plan.price_cents / 100
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    const idempotencyKey = `pix_${userId}_${plan.id}_${Date.now()}`

    const pixResult = await AsaasProvider.createPixCharge({
      customerId: profile.asaas_customer_id ?? undefined,
      name: profile.full_name || "Cliente",
      email: (profile as any).email || "",
      cpfCnpj: profile.cpf ?? undefined,
      phone: profile.phone ?? undefined,
      amount,
      dueDate,
      description: `Assinatura Plano ${plan.name_pt}`,
      externalReference: idempotencyKey,
      userId,
      planId: plan.id,
    })

    if (!profile.asaas_customer_id) {
      const customer = await AsaasProvider.findOrCreateCustomer({
        name: profile.full_name || "Cliente",
        email: (profile as any).email || "",
        cpfCnpj: profile.cpf ?? undefined,
        phone: profile.phone ?? undefined,
        userId,
      })
      await ProfileService.setAsaasCustomerId(userId, customer.id)
    }

    const now = new Date()
    const intervalMs = (plan.billing_cycle_days || 30) * 86400_000

    // Cria a assinatura local em estado inativo e vincula o PIX a ela,
    // para que o webhook ative o acesso assim que o pagamento for confirmado.
    const subscription = await SubscriptionService.upsertSubscription({
      userId,
      planId: plan.id,
      externalId: pixResult.id,
      provider: "asaas",
      externalStatus: "pending",
      status: "inactive",
      currency: plan.currency as CurrencyT,
      unitAmountCents: plan.price_cents,
      billingCycleDays: plan.billing_cycle_days,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: new Date(now.getTime() + intervalMs).toISOString(),
      cancelAtPeriodEnd: false,
    })

    const payment = await PaymentService.upsertPayment({
      userId,
      subscriptionId: subscription?.id ?? undefined,
      provider: "asaas",
      externalId: pixResult.id,
      status: "pending",
      amountCents: plan.price_cents,
      currency: plan.currency,
      method: "pix" as PaymentMethod,
      descriptionPt: `Pagamento PIX - Plano ${plan.name_pt}`,
      descriptionEn: `PIX Payment - ${plan.name_en} Plan`,
      pixQrCode: pixResult.pix_qr_code,
      pixCopyPaste: pixResult.pix_copy_paste,
      pixExpiresAt: pixResult.pix_expires_at,
      idempotencyKey,
      metadata: { plan_id: plan.id },
    })

    return jsonResponse({
      pix_qr_code: pixResult.pix_qr_code,
      pix_copy_paste: pixResult.pix_copy_paste,
      pix_expires_at: pixResult.pix_expires_at,
      payment_id: payment?.id ?? pixResult.id,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
