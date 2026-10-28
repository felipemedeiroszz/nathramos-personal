import { validateStripePlan, eligibleTrialDays } from "@/lib/payments/validation"
import { NextRequest } from "next/server"
import { checkoutSubscribeSchema } from "@/schemas/payments"
import { handleApiError,jsonResponse,errorResponse,requireApiUser } from "@/lib/api/response"
import { StripeProvider,getStripeClient } from "@/lib/payments/stripe"
import { ProfileService } from "@/lib/payments/services"
import { reserveCheckout,readyCheckout } from "@/lib/payments/checkout"
import { syncStripeSubscription } from "@/lib/payments/sync"
import { randomUUID } from "node:crypto"
export const dynamic="force-dynamic"
export const runtime="nodejs"
export async function POST(req: NextRequest) {
 try {
  const {userId,supabase}=await requireApiUser()
  const parsed=checkoutSubscribeSchema.safeParse(await req.json())
  if(!parsed.success) return errorResponse("Dados inválidos.",400)
  const {plan_id,payment_method_id,setup_intent_id}=parsed.data
  const {data:plan,error}=await (supabase as any).from("plans").select("*").eq("id",plan_id).eq("is_active",true).eq("is_deleted",false).maybeSingle()
  if(error) throw error
  if(!plan?.stripe_price_id) return errorResponse("Plano indisponível para cartão.",400)
  const profile=await ProfileService.getProfile(userId)
  if(!profile?.stripe_customer_id || profile.is_deleted || profile.role!=="student") return errorResponse("Sessão de pagamento indisponível.",403)
  const stripe=getStripeClient()
  const setup=await stripe.setupIntents.retrieve(setup_intent_id)
  if(setup.status!=="succeeded" || setup.customer!==profile.stripe_customer_id || setup.payment_method!==payment_method_id || setup.metadata?.user_id!==userId || setup.metadata?.plan_id!==plan_id) return errorResponse("Confirmação de cartão inválida.",403)
  await validateStripePlan(plan)
  const trialDays=await eligibleTrialDays(userId,plan.trial_days)
  const op=await reserveCheckout(userId,"plan",plan_id,"stripe",`setup:${setup.id}`)
  const subscription: any=op.remote_id ? await stripe.subscriptions.retrieve(op.remote_id,{expand:["latest_invoice.payment_intent"]}) : await StripeProvider.createSubscriptionWithPaymentMethod({customerId:profile.stripe_customer_id,priceId:plan.stripe_price_id,paymentMethodId:payment_method_id,userId,planId:plan.id,trialDays,idempotencyKey:op.id})
  await readyCheckout(op.id,subscription.id)
  const synced=await syncStripeSubscription(subscription.id,`sync:${randomUUID()}`,"CHECKOUT_SYNC")
  const pi=subscription.latest_invoice?.payment_intent
  return jsonResponse({...synced,requires_action:subscription.status==="incomplete",client_secret:typeof pi === "object" ? pi.client_secret : null})
 } catch(error) {return handleApiError(error)}
}
