import { NextRequest } from "next/server"
import { handleApiError, jsonResponse, requireApiUser } from "@/lib/api/response"
import { PaymentService } from "@/lib/payments/services"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireApiUser()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 200)
    const history = await PaymentService.getUserPaymentHistory(userId, limit)
    return jsonResponse({ history })
  } catch (error) {
    return handleApiError(error)
  }
}
