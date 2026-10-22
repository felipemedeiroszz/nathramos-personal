"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth/access"
import { PlanService } from "@/services/PlanService"
import { SubscriptionService } from "@/services/SubscriptionService"
import { AuditLogService } from "@/services/AuditLogService"
import type { UpsertPlanInput } from "@/schemas/plans"
import type { SubscriptionStatusT } from "@/lib/supabase/types"

const VALID_STATUSES: SubscriptionStatusT[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "inactive",
  "expired",
  "blocked",
]

function revalidateBilling() {
  revalidatePath("/[locale]/admin/planos", "page")
  revalidatePath("/[locale]/admin/assinaturas", "page")
  revalidatePath("/[locale]/admin/pagamentos", "page")
  revalidatePath("/[locale]/admin/financeiro", "page")
  revalidatePath("/[locale]/planos", "page")
}

// ---------------------------------------------------------------------
// PLANO ÚNICO (acesso a tudo)
// ---------------------------------------------------------------------
export async function savePlanAction(input: UpsertPlanInput) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard")
  try {
    const saved = await PlanService.savePrimary(input, userId)
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar o plano." }
    }
    revalidateBilling()
    return { success: true as const, data: saved }
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar o plano.",
    }
  }
}

// ---------------------------------------------------------------------
// ASSINATURAS
// ---------------------------------------------------------------------
export async function updateSubscriptionStatusAction(
  id: string,
  status: SubscriptionStatusT
) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard")
  try {
    if (!VALID_STATUSES.includes(status)) {
      return { success: false as const, message: "Status inválido." }
    }
    await SubscriptionService.updateStatus(id, status)
    void AuditLogService.log({
      adminId: userId,
      action: "subscription.status_update",
      entity_type: "subscription",
      entity_id: id,
      details: { status },
    })
    revalidateBilling()
    return { success: true as const }
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao atualizar a assinatura.",
    }
  }
}

export async function cancelSubscriptionAdminAction(
  id: string,
  atPeriodEnd: boolean = true
) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard")
  try {
    await SubscriptionService.cancel(id, atPeriodEnd)
    void AuditLogService.log({
      adminId: userId,
      action: "subscription.cancel",
      entity_type: "subscription",
      entity_id: id,
      details: { at_period_end: atPeriodEnd },
    })
    revalidateBilling()
    return { success: true as const }
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao cancelar a assinatura.",
    }
  }
}

export async function reactivateSubscriptionAdminAction(id: string) {
  const { userId } = await requireRole(["admin", "coach"], "/dashboard")
  try {
    await SubscriptionService.reactivate(id)
    void AuditLogService.log({
      adminId: userId,
      action: "subscription.reactivate",
      entity_type: "subscription",
      entity_id: id,
    })
    revalidateBilling()
    return { success: true as const }
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao reativar a assinatura.",
    }
  }
}
