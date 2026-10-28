import "server-only";
import { billingDb } from "./sync";
import { SubscriptionService } from "./services";
import { canAccessPlatform } from "@/lib/auth/access";
import { ApiAuthError, ApiValidationError } from "@/lib/api/response";
export const STUDENT_PAYMENT_COLUMNS =
  "id,status,amount_cents,currency,method,provider,external_id,created_at,paid_at,failed_at,refunded_at,refunded_amount_cents,pix_qr_code,pix_copy_paste,pix_expires_at,description_pt,description_en,card_last4,card_brand";
export function paymentFilters(params: Record<string, string | undefined>) {
  const page = Number(params.page || 1),
    status = params.status || "all";
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    throw new ApiValidationError("Página inválida.");
  if (
    ![
      "all",
      "paid",
      "pending",
      "processing",
      "failed",
      "expired",
      "canceled",
      "refunded",
      "partially_refunded",
    ].includes(status)
  )
    throw new ApiValidationError("Status inválido.");
  return { page, status };
}
export async function billingProfile(userId: string) {
  const db = await billingDb();
  const { data, error } = await db
    .from("profiles")
    .select("id,role,is_deleted,full_name,stripe_customer_id,asaas_customer_id")
    .eq("id", userId)
    .single();
  if (error) throw error;
  if (!data || data.is_deleted || data.role !== "student")
    throw new ApiAuthError("Conta de aluno indisponível.");
  return data;
}
export async function studentPaymentPage(
  userId: string,
  params: Record<string, string | undefined> = {},
) {
  const { page, status } = paymentFilters(params);
  const db = await billingDb();
  let query = db
    .from("payments")
    .select(STUDENT_PAYMENT_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .eq("is_duplicate", false);
  if (status !== "all") query = query.eq("status", status);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 15, page * 15 - 1);
  if (error) throw error;
  return { rows: data || [], total: count || 0, page, size: 15, status };
}
export async function studentBillingSummary(
  userId: string,
  params: Record<string, string | undefined> = {},
) {
  const profile = await billingProfile(userId),
    db = await billingDb();
  const [subscription, access, payments, operations] = await Promise.all([
    SubscriptionService.getActive(userId),
    canAccessPlatform(userId, true),
    studentPaymentPage(userId, params),
    db
      .from("billing_checkout_operations")
      .select(
        "id,kind,provider,remote_id,state,amount_cents,currency,created_at,expires_at",
      )
      .eq("user_id", userId)
      .eq("kind", "plan")
      .in("state", ["creating", "ready"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (operations.error) throw operations.error;
  return {
    name: profile.full_name,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          provider: subscription.provider,
          external_id: subscription.external_id,
          source: subscription.source,
          unit_amount_cents:subscription.unit_amount_cents,
          currency:subscription.currency,
          billing_cycle_days:subscription.billing_cycle_days,
          trial_ends_at:subscription.trial_ends_at,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          plan: subscription.plan
            ? {
                name_pt: subscription.plan.name_pt,
                name_en: subscription.plan.name_en,
              }
            : null,
        }
      : null,
    access,
    payments,
    operations: operations.data || [],
  };
}
