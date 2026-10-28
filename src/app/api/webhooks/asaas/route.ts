import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { AsaasProvider } from "@/lib/payments/asaas"
import { PaymentService } from "@/lib/payments/services"
import { syncAsaasPayment } from "@/lib/payments/sync"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export async function POST(req: NextRequest) {
 const expected = AsaasProvider.getWebhookToken()
 if (!expected) return NextResponse.json({error:"Webhook não configurado."},{status:503})
 const provided = req.headers.get("asaas-access-token") || ""
 if (Buffer.byteLength(provided)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided),Buffer.from(expected))) return NextResponse.json({error:"Token inválido."},{status:401})
 let payload: any
 try {payload=await req.json()} catch {return NextResponse.json({error:"JSON inválido."},{status:400})}
 if (typeof payload.id !== "string" || !payload.id || typeof payload.event !== "string" || !payload.event) return NextResponse.json({error:"Evento sem identificação."},{status:400})
 try {
  if (await PaymentService.isEventProcessed("asaas",payload.id)) return NextResponse.json({ok:true,duplicate:true})
  if (payload.event.startsWith("PAYMENT_") && payload.payment?.id) await syncAsaasPayment(payload.payment.id,payload.id,payload.event)
  else await PaymentService.markEventProcessed({provider:"asaas",eventId:payload.id,eventType:payload.event,payload:{},signatureOk:true})
  return NextResponse.json({ok:true})
 } catch {
  try {await PaymentService.markEventProcessed({provider:"asaas",eventId:payload.id,eventType:payload.event,payload:{payment_id:payload.payment?.id},signatureOk:true,errorText:"payment_sync_failed"})} catch { /* Provider retries on 500. */ }
  return NextResponse.json({error:"Falha na conciliação. Evento será reenviado."},{status:500})
 }
}
