import "server-only"
import { createHash } from "node:crypto"
import { createServiceClientSSR } from "@/lib/supabase/server"
import { getStripeClient } from "./stripe"
import { AsaasProvider } from "./asaas"
import { zonedTimeToUtc } from "@/lib/notifications/time"

const id = (value: any): string | null => typeof value === "string" ? value : value?.id ?? null
const iso = (value: number | null | undefined) => value ? new Date(value * 1000).toISOString() : null
export function asaasDate(value?: string | null): string | null {
  if (!value) return null
  if (/^\d{4}-\d\d-\d\d(?:[ T]\d\d:\d\d(?::\d\d)?)?$/.test(value)) {
    return zonedTimeToUtc(value.slice(0,10), value.slice(11,19) || "00:00", "America/Sao_Paulo").toISOString()
  }
  return new Date(value).toISOString()
}
export function asaasStatus(status: string): string {
  if (["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"].includes(status)) return "paid"
  if (status === "REFUNDED") return "refunded"
  if (status === "OVERDUE") return "expired"
  if (["DELETED", "CANCELED"].includes(status)) return "canceled"
  if (["REJECTED", "FAILED"].includes(status)) return "failed"
  return ["PENDING"].includes(status) ? "pending" : "processing"
}
export async function billingDb() { return await createServiceClientSSR() as any }
async function one(table: string, field: string, value: string) {
  const db = await billingDb()
  const { data, error } = await db.from(table).select("*").eq(field,value).maybeSingle()
  if (error) throw error
  return data
}
export async function applyBilling(provider: "stripe" | "asaas", eventId: string, eventType: string, subscription: any, payment: any, observed: string) {
  const db = await billingDb()
  const { data, error } = await db.rpc("billing_apply_event", { p_provider:provider,p_event_id:eventId,p_event_type:eventType,p_payload:{ object_id:payment?.external_id ?? subscription?.external_id },p_subscription:subscription,p_payment:payment,p_observed:observed })
  if (error) throw error
  return data
}
async function stripeOwner(object: any) {
  if (object.metadata?.user_id) return object.metadata.user_id
  const profile = await one("profiles","stripe_customer_id",id(object.customer) || "")
  if (!profile) throw new Error("Stripe customer has no local owner")
  return profile.id
}
async function stripeRefunds(chargeId: string | null) {
  if (!chargeId) return []
  const stripe = getStripeClient()
  const refunds: any[] = []
  for await (const r of stripe.refunds.list({charge:chargeId,limit:100})) {
    refunds.push({ id:r.id,amount_cents:r.amount,status:r.status === "succeeded" ? "succeeded" : ["failed","canceled"].includes(r.status || "") ? "failed" : "pending",occurred_at:iso(r.created) })
  }
  return refunds
}
async function invoicePayment(invoice: any, userId: string) {
  const stripe = getStripeClient()
  const pi: any = id(invoice.payment_intent) ? await stripe.paymentIntents.retrieve(id(invoice.payment_intent)!) : null
  const chargeId = id(invoice.charge) || id(pi?.latest_charge)
  const charge: any = chargeId ? await stripe.charges.retrieve(chargeId, {expand:["balance_transaction"]}) : null
  const refunds = await stripeRefunds(chargeId)
  return { user_id:userId,external_id:invoice.id,aliases:[invoice.id,id(invoice.payment_intent),chargeId].filter(Boolean),status:invoice.paid ? "paid" : invoice.status === "void" ? "canceled" : invoice.status === "uncollectible" ? "failed" : "pending",amount_cents:invoice.paid ? invoice.amount_paid : invoice.amount_due,currency:String(invoice.currency).toUpperCase(),method:"credit_card",paid_at:invoice.paid ? iso(invoice.status_transitions?.paid_at) : null,fee_cents:charge?.balance_transaction?.currency === invoice.currency ? charge.balance_transaction.fee : undefined,refunds,disputed:Boolean(charge?.disputed),metadata:{ invoice_id:invoice.id,payment_intent_id:id(invoice.payment_intent),charge_id:chargeId,fee_known:Boolean(charge?.balance_transaction && typeof charge.balance_transaction === "object" && charge.balance_transaction.currency === invoice.currency) } }
}
export async function syncStripeSubscription(subscriptionId: string, eventId: string, eventType: string, invoiceId?: string) {
  const observed = new Date().toISOString()
  const stripe = getStripeClient()
  const sub: any = await stripe.subscriptions.retrieve(subscriptionId, {expand:["latest_invoice"]})
  const userId = await stripeOwner(sub)
  const price = sub.items?.data?.[0]?.price
  let plan = price?.id ? await one("plans","stripe_price_id",price.id) : null
  if (!plan && sub.metadata?.plan_id) plan = await one("plans","id",sub.metadata.plan_id)
  if (!plan || plan.stripe_price_id !== price?.id) throw new Error("Stripe subscription price has no matching plan")
  const latest: any = typeof sub.latest_invoice === "object" ? sub.latest_invoice : id(sub.latest_invoice) ? await stripe.invoices.retrieve(id(sub.latest_invoice)!) : null
  const latestPayment = latest ? await invoicePayment(latest,userId) : null
  const refunded = latestPayment?.refunds.reduce((n: number,r: any) => n+(r.status === "succeeded" ? r.amount_cents : 0),0) || 0
  let status = ({active:"active",trialing:"trialing",past_due:"past_due",canceled:"canceled",unpaid:"blocked",paused:"blocked"} as Record<string,string>)[sub.status] || "inactive"
  if (latestPayment?.disputed || (refunded>0 && refunded>=(latestPayment?.amount_cents ?? Infinity))) status="blocked"
  const start = iso(sub.current_period_start ?? sub.items?.data?.[0]?.current_period_start)
  const end = iso(sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end)
  if (!start || !end) throw new Error("Stripe subscription has no billing period")
  const normalized = {stripe_customer_id:id(sub.customer),checkout_id:sub.metadata?.checkout_id,user_id:userId,plan_id:plan.id,external_id:sub.id,status,external_status:sub.status,currency:String(sub.currency).toUpperCase(),unit_amount_cents:price.unit_amount ?? plan.price_cents,billing_cycle_days:(({day:1,week:7,month:30,year:365} as Record<string,number>)[price.recurring?.interval as string] ?? plan.billing_cycle_days) * (price.recurring?.interval_count || 1),current_period_start:start,current_period_end:end,trial_ends_at:iso(sub.trial_end),cancel_at_period_end:sub.cancel_at_period_end,canceled_at:iso(sub.canceled_at),ended_at:iso(sub.ended_at),last_paid_at:latestPayment?.paid_at}
  const payment = invoiceId && invoiceId !== latest?.id ? await invoicePayment(await stripe.invoices.retrieve(invoiceId),userId) : latestPayment
  await applyBilling("stripe",eventId,eventType,normalized,payment,observed)
  return { status, stripe_status:sub.status, subscription_id:sub.id }
}
export async function syncStripeEvent(event: any) {
  const stripe = getStripeClient()
  const obj = event.data.object
  if (event.type.startsWith("customer.subscription.")) return syncStripeSubscription(obj.id,event.id,event.type)
  if (event.type.startsWith("invoice.")) {
    const invoice: any = await stripe.invoices.retrieve(obj.id)
    if (id(invoice.subscription)) return syncStripeSubscription(id(invoice.subscription)!,event.id,event.type,invoice.id)
  }
  if (event.type.startsWith("checkout.session.")) {
    const session: any = await stripe.checkout.sessions.retrieve(obj.id)
    if (id(session.subscription)) return syncStripeSubscription(id(session.subscription)!,event.id,event.type)
    return syncStripeOneTime(session,event.id,event.type)
  }
  if (event.type.startsWith("charge.refund") || event.type.startsWith("charge.dispute.") || event.type.startsWith("refund.")) {
    const chargeId = obj.object === "charge" ? obj.id : id(obj.charge)
    if (!chargeId) throw new Error("Missing refund charge")
    const charge: any = await stripe.charges.retrieve(chargeId)
    if (id(charge.invoice)) {
      const invoice: any = await stripe.invoices.retrieve(id(charge.invoice)!)
      if (id(invoice.subscription)) return syncStripeSubscription(id(invoice.subscription)!,event.id,event.type,invoice.id)
    }
    const sessions = await stripe.checkout.sessions.list({payment_intent:id(charge.payment_intent)!,limit:1})
    if (!sessions.data[0]) throw new Error("Missing purchase session")
    return syncStripeOneTime(sessions.data[0],event.id,event.type)
  }
  return applyBilling("stripe",event.id,event.type,null,null,new Date().toISOString())
}
async function syncStripeOneTime(session: any,eventId: string,eventType: string) {
  const observed = new Date().toISOString()
  const stripe = getStripeClient()
  const userId = session.client_reference_id || await stripeOwner(session)
  const pi: any = id(session.payment_intent) ? await stripe.paymentIntents.retrieve(id(session.payment_intent)!) : null
  const chargeId = id(pi?.latest_charge)
  const charge: any = chargeId ? await stripe.charges.retrieve(chargeId,{expand:["balance_transaction"]}) : null
  const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required"
  return applyBilling("stripe",eventId,eventType,null,{user_id:userId,external_id:id(pi) || `checkout_${session.id}`,aliases:[session.id,`checkout_${session.id}`,id(pi),chargeId].filter(Boolean),status:paid ? "paid" : session.status === "expired" ? "expired" : "pending",amount_cents:pi?.amount_received || session.amount_total || 0,currency:String(session.currency).toUpperCase(),method:"credit_card",paid_at:paid ? iso(charge?.created || session.created) : null,checkout_id:session.metadata?.checkout_id,ebook_id:session.metadata?.ebook_id,refunds:await stripeRefunds(chargeId),fee_cents:charge?.balance_transaction?.currency === session.currency ? charge.balance_transaction.fee : undefined,metadata:{ebook_id:session.metadata?.ebook_id,session_id:session.id,fee_known:charge?.balance_transaction?.currency === session.currency}},observed)
}
export function normalizeAsaasRefunds(paymentId: string,items: any[]) {
  const counts = new Map<string,number>()
  return items.map(r => {
    if (!r.dateCreated || !Number.isFinite(Number(r.value))) throw new Error("Incomplete Asaas refund")
    const key = `${paymentId}:${r.id || r.endToEndIdentifier || r.transactionReceiptUrl || ""}:${r.dateCreated}:${r.value}`
    const count = counts.get(key) || 0
    counts.set(key,count+1)
    return {id:createHash("sha256").update(`${key}:${count}`).digest("hex"),amount_cents:Math.round(Number(r.value)*100),status:r.status === "DONE" ? "succeeded" : r.status === "CANCELLED" ? "failed" : "pending",occurred_at:asaasDate(r.dateCreated)}
  })
}
export async function syncAsaasPayment(paymentId: string,eventId: string,eventType: string,extra: Record<string,unknown> = {}) {
  const observed = new Date().toISOString()
  const remote = await AsaasProvider.getPayment(paymentId)
  const db = await billingDb()
  const {data:existing,error} = await db.from("payments").select("*").eq("provider","asaas").eq("external_id",paymentId).maybeSingle()
  if(error) throw error
  const ref = remote.externalReference
  const op = /^[0-9a-f-]{36}$/i.test(ref || "") ? await one("billing_checkout_operations","id",ref) : null
  if (!existing && !op) throw new Error("Payment has no local checkout binding")
  const userId = op?.user_id || existing.user_id
  const profile = await one("profiles","id",userId)
  if (profile?.asaas_customer_id !== remote.customer) throw new Error("Asaas customer mismatch")
  const amount = Math.round(Number(remote.value)*100)
  if(amount !== (op?.amount_cents ?? existing.amount_cents)) throw new Error("Asaas amount mismatch")
  const refunds = normalizeAsaasRefunds(paymentId,remote.refunds || [])
  const remoteState = asaasStatus(remote.status)
  let state = remote.deleted && !["paid","refunded"].includes(remoteState) ? "canceled" : remoteState
  if (state === "processing" && existing?.paid_at && ["paid","refunded","partially_refunded"].includes(existing.status)) state = "paid"
  if (state === "refunded" && !refunds.some((r: any) => r.status === "succeeded")) throw new Error("Refund details unavailable")
  return applyBilling("asaas",eventId,eventType,null,{...extra,user_id:userId,external_id:remote.id,aliases:[remote.id],checkout_id:op?.id,subscription_id:existing?.subscription_id,ebook_id:op?.kind === "ebook" ? op.target_id : existing?.metadata?.ebook_id,status:state,amount_cents:amount,currency:"BRL",method:remote.billingType === "BOLETO" ? "boleto" : remote.billingType === "CREDIT_CARD" ? "credit_card" : "pix",paid_at:asaasDate(remote.paymentDate || remote.clientPaymentDate) || existing?.paid_at,fee_cents:typeof remote.netValue === "number" ? Math.max(0,amount-Math.round(remote.netValue*100)) : undefined,refunds,disputed:["CHARGEBACK_REQUESTED","CHARGEBACK_DISPUTE","AWAITING_CHARGEBACK_REVERSAL"].includes(remote.status),metadata:{...existing?.metadata,asaas_status:remote.status,fee_known:typeof remote.netValue === "number"}},observed)
}
