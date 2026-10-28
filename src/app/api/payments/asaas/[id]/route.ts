import { billingProfile, STUDENT_PAYMENT_COLUMNS } from "@/lib/payments/student"
import { randomUUID } from "node:crypto"
import { NextRequest } from "next/server"
import { handleApiError,jsonResponse,errorResponse,requireApiUser } from "@/lib/api/response"
import { billingDb,syncAsaasPayment } from "@/lib/payments/sync"
export const dynamic="force-dynamic"
export const runtime="nodejs"
export async function GET(_req: NextRequest,{params}:{params:{id:string}}) {
 try {
  const {userId}=await requireApiUser()
  await billingProfile(userId)
  const db=await billingDb()
  const isUuid=/^[0-9a-f-]{36}$/i.test(params.id)
  const {data,error}=await db.from("payments").select("*").eq("provider","asaas").eq(isUuid ? "id" : "external_id",params.id).eq("user_id",userId).maybeSingle()
  if(error) throw error
  if(!data?.external_id) return errorResponse("Pagamento não encontrado.",404)
  await syncAsaasPayment(data.external_id,`poll:${randomUUID()}`,"PAYMENT_POLL")
  const {data:updated,error:readError}=await db.from("payments").select(STUDENT_PAYMENT_COLUMNS).eq("id",data.id).single()
  if(readError) throw readError
  return jsonResponse(updated)
 } catch(error) {return handleApiError(error)}
}
