import "server-only"
import { getStripeClient } from "./stripe"
import { ApiValidationError } from "@/lib/api/response"
export async function validateStripePlan(plan: any) {
 const price=await getStripeClient().prices.retrieve(plan.stripe_price_id)
 const days=({day:1,week:7,month:30,year:365} as Record<string,number>)[price.recurring?.interval || ""] * (price.recurring?.interval_count || 1)
 if (!price.active || !price.recurring || price.unit_amount!==plan.price_cents || price.currency.toUpperCase()!==plan.currency || days!==plan.billing_cycle_days) throw new ApiValidationError("O preço ou a periodicidade do plano divergem do Stripe. O administrador precisa revisar a configuração.")
}
// New purchases are charged immediately, including legacy plans configured with a trial.
export async function eligibleTrialDays(_userId: string, _days: number) {
 return 0
}
