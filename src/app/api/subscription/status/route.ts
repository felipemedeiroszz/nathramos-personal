import { NextRequest } from "next/server"
import { handleApiError, jsonResponse, requireApiUser } from "@/lib/api/response"
import { SubscriptionService } from "@/lib/payments/services"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await requireApiUser()
    const access = await SubscriptionService.canAccess(userId)
    return jsonResponse({
      status: access.status,
      canAccessPlatform: access.allowed,
      reason: access.reason,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
