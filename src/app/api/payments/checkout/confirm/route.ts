import { NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { getStripeClient } from "@/lib/payments/stripe"
import { ProfileService } from "@/lib/payments/services"
import { syncStripeSubscription } from "@/lib/payments/sync"
import { requireApiUser,jsonResponse,errorResponse,handleApiError } from "@/lib/api/response"
export const dynamic="force-dynamic"
export const runtime="nodejs"
export async function POST(req: NextRequest) {
 try {
  const {userId}=await requireApiUser()
  const body=await req.json()
  if(typeof body.subscription_id!=="string" || !body.subscription_id.startsWith("sub_")) return errorResponse("Assinatura inválida.",400)
  const profile=await ProfileService.getProfile(userId)
  const sub=await getStripeClient().subscriptions.retrieve(body.subscription_id)
  if(!profile || profile.is_deleted || sub.customer!==profile.stripe_customer_id || sub.metadata.user_id!==userId) return errorResponse("Acesso negado.",403)
  return jsonResponse(await syncStripeSubscription(sub.id,`sync:${randomUUID()}`,"CHECKOUT_CONFIRM"))
 } catch(error) {return handleApiError(error)}
}
