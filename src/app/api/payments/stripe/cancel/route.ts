import { NextRequest } from "next/server"
import { subscriptionActionSchema } from "@/schemas/payments"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { SubscriptionService } from "@/lib/payments/services"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireApiUser()
    const raw = await req.json()
    const parsed = subscriptionActionSchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse("Dados inválidos.", 400, "VALIDATION_ERROR", { issues: parsed.error.flatten() })
    }
    const result = await SubscriptionService.cancel(userId)
    if (!result.ok) {
      return errorResponse("Nenhuma assinatura ativa encontrada.", 404, "NO_ACTIVE_SUBSCRIPTION")
    }
    return jsonResponse({ ok: true, canceled_at_period_end: true })
  } catch (error) {
    return handleApiError(error)
  }
}
