import "server-only"
import { getStripeClient } from "./stripe"
import { billingDb } from "./sync"
import { ApiValidationError } from "@/lib/api/response"
export async function validateStripePlan(plan: any) {
 const price=await getStripeClient().prices.retrieve(plan.stripe_price_id)
 const days=({day:1,week:7,month:30,year:365} as Record<string,number>)[price.recurring?.interval || ""] * (price.recurring?.interval_count || 1)
 if (!price.active || !price.recurring || price.unit_amount!==plan.price_cents || price.currency.toUpperCase()!==plan.currency || days!==plan.billing_cycle_days) throw new ApiValidationError("O preço ou a periodicidade do plano divergem do Stripe. O administrador precisa revisar a configuração.")
}
export async function eligibleTrialDays(userId: string,days: number) {
 if (!days) return 0
 const db=await billingDb()
 const {data,error}=await db.from("subscriptions").select("id").eq("user_id",userId).or("trial_ends_at.not.is.null,last_paid_at.not.is.null").limit(1)
 if(error) throw error
 return data?.length ? 0 : days
}
