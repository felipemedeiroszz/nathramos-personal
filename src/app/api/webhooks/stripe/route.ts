import { NextRequest, NextResponse } from "next/server"
import { StripeProvider } from "@/lib/payments/stripe"
import { PaymentService } from "@/lib/payments/services"
import { syncStripeEvent } from "@/lib/payments/sync"
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export async function POST(req: NextRequest) {
 const secret=process.env.STRIPE_WEBHOOK_SECRET
 if(!secret) return NextResponse.json({error:"Webhook não configurado."},{status:503})
 let event
 try {event=await StripeProvider.constructWebhookEvent(await req.text(),req.headers.get("stripe-signature") || "",secret)} catch {return NextResponse.json({error:"Assinatura inválida."},{status:400})}
 try {
  if(await PaymentService.isEventProcessed("stripe",event.id)) return NextResponse.json({ok:true,duplicate:true})
  await syncStripeEvent(event)
  return NextResponse.json({ok:true})
 } catch {
  try {await PaymentService.markEventProcessed({provider:"stripe",eventId:event.id,eventType:event.type,payload:{object_id:(event.data.object as {id?:string}).id},signatureOk:true,errorText:"payment_sync_failed"})} catch { /* Provider retries on 500. */ }
  return NextResponse.json({error:"Falha na conciliação. Evento será reenviado."},{status:500})
 }
}
