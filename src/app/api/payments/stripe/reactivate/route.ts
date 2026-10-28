import { NextRequest } from "next/server"
import { requireApiUser,jsonResponse,errorResponse,handleApiError } from "@/lib/api/response"
import { billingDb } from "@/lib/payments/sync"
import { AdminSubscriptionService } from "@/services/AdminSubscriptionService"
export const dynamic="force-dynamic"
export const runtime="nodejs"
export async function POST(req: NextRequest) {
 try {
  const {userId}=await requireApiUser()
  const {subscription_id}=await req.json()
  if(typeof subscription_id!=="string" || !/^[0-9a-f-]{36}$/i.test(subscription_id)) return errorResponse("Assinatura inválida.",400)
  const db=await billingDb()
  const {data,error}=await db.from("subscriptions").select("id").eq("id",subscription_id).eq("user_id",userId).maybeSingle()
  if(error) throw error
  if(!data) return errorResponse("Assinatura não encontrada.",404)
  await AdminSubscriptionService.reactivate(subscription_id)
  return jsonResponse({ok:true})
 } catch(error) {return handleApiError(error)}
}
