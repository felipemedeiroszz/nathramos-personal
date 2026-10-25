import { NextRequest } from "next/server"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { AsaasProvider } from "@/lib/payments/asaas"
import { PaymentService, SubscriptionService } from "@/lib/payments/services"
import type { PaymentStatus, PaymentRow } from "@/lib/supabase/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type StatusMap = Record<string, PaymentStatus>

const ASAAS_STATUS_MAP: StatusMap = {
  PENDING: "pending",
  RECEIVED: "paid",
  CONFIRMED: "paid",
  APPROVED: "paid",
  OVERDUE: "expired",
  CANCELED: "canceled",
  REFUNDED: "refunded",
  REJECTED: "failed",
  FAILED: "failed",
  PROCESSING: "processing",
  AWAITING_RISK_ANALYSIS: "processing",
  CHARGEBACK: "refunded",
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireApiUser()
    const paymentId = params.id

    const localPayment: PaymentRow | null = await PaymentService.findByExternalId("asaas", paymentId)
    if (!localPayment) {
      return errorResponse("Pagamento não encontrado.", 404, "PAYMENT_NOT_FOUND")
    }
    if (localPayment.user_id !== userId) {
      return errorResponse("Acesso negado.", 403, "FORBIDDEN")
    }

    try {
      const asaasStatus = await AsaasProvider.getPaymentStatus(paymentId)
      const mapped = ASAAS_STATUS_MAP[asaasStatus.status] || localPayment.status

      if (mapped !== localPayment.status) {
        await PaymentService.upsertPayment({
          userId: localPayment.user_id,
          subscriptionId: localPayment.subscription_id ?? undefined,
          provider: "asaas",
          externalId: localPayment.external_id ?? undefined,
          status: mapped,
          amountCents: localPayment.amount_cents,
          currency: localPayment.currency as any,
          feeCents: localPayment.fee_cents,
          method: localPayment.method as any,
          installments: localPayment.installments,
          descriptionPt: localPayment.description_pt,
          descriptionEn: localPayment.description_en,
          paidAt: asaasStatus.payment_date || localPayment.paid_at || undefined,
        })

        // Libera o acesso imediatamente, sem depender do webhook.
        if (mapped === "paid" && localPayment.subscription_id) {
          await SubscriptionService.markPaid(
            localPayment.subscription_id,
            asaasStatus.payment_date || undefined
          )
        }
      }

      return jsonResponse({
        id: localPayment.id,
        external_id: asaasStatus.id,
        status: mapped,
        asaas_status: asaasStatus.status,
        amount_cents: localPayment.amount_cents,
        currency: localPayment.currency,
        method: localPayment.method,
        pix_qr_code: localPayment.pix_qr_code,
        pix_copy_paste: localPayment.pix_copy_paste,
        pix_expires_at: localPayment.pix_expires_at,
        paid_at: asaasStatus.payment_date || localPayment.paid_at,
        created_at: localPayment.created_at,
      })
    } catch {
      return jsonResponse({
        id: localPayment.id,
        external_id: localPayment.external_id,
        status: localPayment.status,
        asaas_status: null,
        amount_cents: localPayment.amount_cents,
        currency: localPayment.currency,
        method: localPayment.method,
        pix_qr_code: localPayment.pix_qr_code,
        pix_copy_paste: localPayment.pix_copy_paste,
        pix_expires_at: localPayment.pix_expires_at,
        paid_at: localPayment.paid_at,
        created_at: localPayment.created_at,
      })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
