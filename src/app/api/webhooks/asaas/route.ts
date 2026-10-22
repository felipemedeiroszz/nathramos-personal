import { NextRequest, NextResponse } from "next/server"
import { AsaasProvider } from "@/lib/payments/asaas"
import { PaymentService, SubscriptionService } from "@/lib/payments/services"
import type { PaymentProvider, PaymentStatus, SubscriptionStatus, Currency } from "@/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type AsaasEventType = string

const ASAAS_STATUS_MAP: Record<string, PaymentStatus> = {
  PENDING: "pending",
  RECEIVED: "paid",
  CONFIRMED: "paid",
  APPROVED: "paid",
  OVERDUE: "expired",
  CANCELED: "canceled",
  REFUNDED: "refunded",
  DELETED: "canceled",
  REJECTED: "failed",
  FAILED: "failed",
  PROCESSING: "processing",
  AWAITING_RISK_ANALYSIS: "processing",
  CHARGEBACK: "refunded",
  AWAITING_CHARGEBACK_REVERSAL: "refunded",
}

function resolveEventStatus(type: AsaasEventType, payment: any): PaymentStatus | null {
  switch (type) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      return "paid"
    case "PAYMENT_OVERDUE":
    case "PAYMENT_DUNNING_RECEIVED":
    case "PAYMENT_DUNNING_REQUESTED":
      return "expired"
    case "PAYMENT_CANCELED":
    case "PAYMENT_DELETED":
      return "canceled"
    case "PAYMENT_REFUNDED":
    case "PAYMENT_FEE_CHARGEBACK_REFUNDED":
    case "PAYMENT_CHARGEBACK_REQUESTED":
    case "PAYMENT_CHARGEBACK_DISPUTE":
      return "refunded"
    default:
      if (payment && payment.status && ASAAS_STATUS_MAP[payment.status]) {
        return ASAAS_STATUS_MAP[payment.status]
      }
      return null
  }
}

function mapToInternalStatus(status: string | null | undefined): SubscriptionStatus {
  if (!status) return "inactive"
  switch (status) {
    case "paid":
    case "PAID":
      return "active"
    case "PENDING":
    case "pending":
    case "PROCESSING":
    case "processing":
      return "past_due"
    case "CANCELED":
    case "canceled":
    case "DELETED":
    case "deleted":
      return "canceled"
    case "REFUNDED":
    case "refunded":
      return "canceled"
    case "EXPIRED":
    case "expired":
    case "OVERDUE":
      return "expired"
    case "FAILED":
    case "failed":
    case "REJECTED":
      return "blocked"
    default:
      return "inactive"
  }
}

export async function POST(req: NextRequest) {
  const query = req.nextUrl.searchParams
  const queryToken = query.get("token") ?? query.get("asaasToken") ?? ""
  const headerToken = req.headers.get("asaas-access-token") ?? req.headers.get("asaas-webhook-token") ?? ""

  const expected = AsaasProvider.getWebhookToken()

  if (!expected) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 500 })
  }

  const providedToken = headerToken || queryToken
  if (!providedToken || providedToken !== expected) {
    return NextResponse.json({ error: "Token de webhook inválido." }, { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 })
  }

  const eventId = payload?.event
    ? `${payload.event}_${payload?.payment?.id ?? payload?.id ?? ""}_${String(payload?.dateCreated || payload?.createdAt || Date.now())}`
    : `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const eventType = (payload?.event || "UNKNOWN") as AsaasEventType
  const paymentData = payload?.payment || payload
  const externalPaymentId = paymentData?.id

  const provider: PaymentProvider = "asaas"
  const alreadyProcessed = await PaymentService.isEventProcessed(provider, eventId)

  const mark = async (params: { errorText?: string } = {}) => {
    try {
      await PaymentService.markEventProcessed({
        provider,
        eventId,
        eventType,
        payload: payload as Record<string, unknown>,
        signatureOk: true,
        errorText: params.errorText,
      })
    } catch (logErr) {
      console.error("[webhook:asaas] markEventProcessed failed:", logErr)
    }
  }

  if (alreadyProcessed) {
    await mark()
    return NextResponse.json({ ok: true, idempotent: true })
  }

  try {
    const relevantEvents = [
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED",
      "PAYMENT_OVERDUE",
      "PAYMENT_CANCELED",
      "PAYMENT_REFUNDED",
      "PAYMENT_DELETED",
      "PAYMENT_CHARGEBACK_REQUESTED",
      "PAYMENT_CHARGEBACK_DISPUTE",
      "PAYMENT_DUNNING_RECEIVED",
      "PAYMENT_DUNNING_REQUESTED",
      "PAYMENT_FEE_CHARGEBACK_REFUNDED",
    ]

    if (!relevantEvents.includes(eventType)) {
      await mark()
      return NextResponse.json({ ok: true, skipped: true, type: eventType })
    }

    if (!externalPaymentId) {
      await mark({ errorText: "missing_payment_id" })
      return NextResponse.json({ ok: true, warning: "no_payment_id" })
    }

    const existingPayment = await PaymentService.findByExternalId(provider, externalPaymentId)

    const newStatus = resolveEventStatus(eventType, paymentData)
    if (!newStatus || !existingPayment) {
      await mark()
      return NextResponse.json({ ok: true, unchanged: true })
    }

    const now = new Date().toISOString()
    const paidAt = newStatus === "paid" ? (paymentData?.paymentDate ? new Date(paymentData.paymentDate).toISOString() : now) : existingPayment.paid_at ?? undefined
    const refundedAt = newStatus === "refunded" ? now : existingPayment.refunded_at ?? undefined
    const failedAt = (newStatus === "failed" || newStatus === "expired") ? now : existingPayment.failed_at ?? undefined

    await PaymentService.upsertPayment({
      userId: existingPayment.user_id,
      subscriptionId: existingPayment.subscription_id ?? undefined,
      provider,
      externalId: externalPaymentId,
      externalEventId: eventId,
      status: newStatus,
      amountCents: existingPayment.amount_cents,
      currency: existingPayment.currency as Currency,
      feeCents: existingPayment.fee_cents,
      method: existingPayment.method as any,
      installments: existingPayment.installments,
      descriptionPt: existingPayment.description_pt,
      descriptionEn: existingPayment.description_en,
      pixQrCode: existingPayment.pix_qr_code ?? undefined,
      pixCopyPaste: existingPayment.pix_copy_paste ?? undefined,
      pixExpiresAt: existingPayment.pix_expires_at ?? undefined,
      paidAt,
      failedAt,
      refundedAt,
      metadata: { asaas_event: eventType },
    })

    if (newStatus === "paid" && existingPayment.subscription_id) {
      try {
        const { createServiceClientSSR } = await import("@/lib/supabase/server")
        const supabase = await createServiceClientSSR()
        const { data: subRow } = await (supabase as any)
          .from("subscriptions")
          .select("*, plan:plans(*)")
          .eq("id", existingPayment.subscription_id)
          .limit(1)
          .maybeSingle()
        const sub = subRow as any
        if (sub) {
          await SubscriptionService.upsertSubscription({
            userId: sub.user_id,
            planId: sub.plan_id,
            externalId: sub.external_id ?? undefined,
            provider: sub.provider ?? undefined,
            externalStatus: "paid_via_asaas",
            status: mapToInternalStatus(newStatus),
            currency: sub.currency as Currency,
            unitAmountCents: sub.unit_amount_cents,
            billingCycleDays: sub.billing_cycle_days,
            trialEndsAt: sub.trial_ends_at ?? undefined,
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date(Date.now() + (sub.billing_cycle_days || 30) * 86400_000).toISOString(),
            cancelAtPeriodEnd: false,
            lastPaidAt: now,
          })
        }
      } catch {
        // ignora erro de atualização de assinatura
      }
    }

    const ebookId = (existingPayment.metadata as Record<string, unknown> | null)?.ebook_id as
      | string
      | undefined

    if (ebookId) {
      const { EbookService } = await import("@/services/EbookService")
      if (newStatus === "paid") {
        await EbookService.markPurchasePaid({
          userId: existingPayment.user_id,
          ebookId,
          provider: "asaas",
          amountCents: existingPayment.amount_cents,
          currency: existingPayment.currency as Currency,
          externalId: externalPaymentId,
          externalEventId: eventId,
          paidAt,
        })
      } else if (newStatus === "refunded") {
        await EbookService.markPurchaseStatusByExternalId(
          "asaas",
          externalPaymentId,
          "refunded",
          "refunded_at"
        )
      } else if (
        newStatus === "failed" ||
        newStatus === "canceled" ||
        newStatus === "expired"
      ) {
        await EbookService.markPurchaseStatusByExternalId(
          "asaas",
          externalPaymentId,
          newStatus,
          "failed_at"
        )
      }
    }

    await mark()
    return NextResponse.json({ ok: true, processed: true, type: eventType, status: newStatus })
  } catch (err: any) {
    const message = String(err?.message ?? err)
    console.error(`[webhook:asaas] error processing ${eventType}:`, err)
    await mark({ errorText: message })
    return NextResponse.json({ ok: false, error: "Erro ao processar webhook." }, { status: 500 })
  }
}
