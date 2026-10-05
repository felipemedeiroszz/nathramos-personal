import { NextRequest } from "next/server"
import { handleApiError, jsonResponse, errorResponse, requireApiUser } from "@/lib/api/response"
import { SubscriptionService } from "@/lib/payments/services"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(_req: NextRequest) {
  try {
    const { userId } = await requireApiUser()
    const result = await SubscriptionService.reactivate(userId)
    if (!result.ok) {
      return errorResponse("Nenhuma assinatura encontrada para reativar.", 404, "NO_ACTIVE_SUBSCRIPTION")
    }
    return jsonResponse({ ok: true, cancel_at_period_end: false })
  } catch (error) {
    return handleApiError(error)
  }
}
