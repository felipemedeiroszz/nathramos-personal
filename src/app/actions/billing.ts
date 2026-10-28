"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/access";
import { PlanService } from "@/services/PlanService";
import { AdminSubscriptionService } from "@/services/AdminSubscriptionService";
import { z } from "zod";
import { AuditLogService } from "@/services/AuditLogService";
import type { UpsertPlanInput } from "@/schemas/plans";
import type { SubscriptionStatusT } from "@/lib/supabase/types";

const VALID_STATUSES: SubscriptionStatusT[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "inactive",
  "expired",
  "blocked",
];

function revalidateBilling() {
  revalidatePath("/[locale]/admin/relatorios", "page");
  revalidatePath("/[locale]/admin/planos", "page");
  revalidatePath("/[locale]/admin/assinaturas", "page");
  revalidatePath("/[locale]/admin/pagamentos", "page");
  revalidatePath("/[locale]/admin/financeiro", "page");
  revalidatePath("/[locale]/planos", "page");
  revalidatePath("/[locale]/(student)", "layout");
  revalidatePath("/[locale]/admin/dashboard", "page");
  revalidatePath("/[locale]/admin/alunos/[id]", "page");
}

// ---------------------------------------------------------------------
// PLANO ÚNICO (acesso a tudo)
// ---------------------------------------------------------------------
export async function savePlanAction(input: UpsertPlanInput) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    const saved = await PlanService.savePrimary(input, userId);
    if (!saved) {
      return { success: false as const, message: "Falha ao salvar o plano." };
    }
    revalidateBilling();
    return { success: true as const, data: saved };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao salvar o plano.",
    };
  }
}

// ---------------------------------------------------------------------
// ASSINATURAS
// ---------------------------------------------------------------------
export async function updateSubscriptionStatusAction(
  id: string,
  status: SubscriptionStatusT,
) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    if (!VALID_STATUSES.includes(status)) {
      return { success: false as const, message: "Status inválido." };
    }
    z.string().uuid().parse(id);
    await AdminSubscriptionService.updateStatus(id, status);
    await AuditLogService.log({
      adminId: userId,
      action: "subscription.status_update",
      entity_type: "subscription",
      entity_id: id,
      details: { status },
    });
    revalidateBilling();
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao atualizar a assinatura.",
    };
  }
}

export async function cancelSubscriptionAdminAction(
  id: string,
  atPeriodEnd: boolean = true,
) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    z.string().uuid().parse(id);
    z.boolean().parse(atPeriodEnd);
    await AdminSubscriptionService.cancel(id, atPeriodEnd);
    await AuditLogService.log({
      adminId: userId,
      action: "subscription.cancel",
      entity_type: "subscription",
      entity_id: id,
      details: { at_period_end: atPeriodEnd },
    });
    revalidateBilling();
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao cancelar a assinatura.",
    };
  }
}

export async function reactivateSubscriptionAdminAction(id: string) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  try {
    z.string().uuid().parse(id);
    await AdminSubscriptionService.reactivate(id);
    await AuditLogService.log({
      adminId: userId,
      action: "subscription.reactivate",
      entity_type: "subscription",
      entity_id: id,
    });
    revalidateBilling();
    return { success: true as const };
  } catch (e: any) {
    return {
      success: false as const,
      message: e?.message ?? "Falha ao reativar a assinatura.",
    };
  }
}

export async function reconcilePaymentAction(id: string) {
 const {userId}=await requireRole(["admin"],"/dashboard");
 try {
  z.string().uuid().parse(id);
  const {billingDb,syncAsaasPayment,syncStripeEvent}=await import("@/lib/payments/sync");
  const {randomUUID}=await import("node:crypto");
  const db=await billingDb();
  const {data:payment,error}=await db.from("payments").select("*").eq("id",id).single();
  if(error || !payment?.external_id) throw new Error("Pagamento sem identificador externo.");
  const eventId=`admin:${randomUUID()}`;
  if(payment.provider==="asaas") await syncAsaasPayment(payment.external_id,eventId,"ADMIN_RECONCILE");
  else if(payment.provider==="stripe") {
   const ext=payment.external_id;
   const {getStripeClient}=await import("@/lib/payments/stripe");
   let object:any, type:string;
   if(ext.startsWith("in_")) {object={id:ext};type="invoice.updated";}
   else if(ext.startsWith("ch_")) {object={id:ext,object:"charge"};type="charge.refunded";}
   else if(ext.startsWith("pi_")) {
    const pi=await getStripeClient().paymentIntents.retrieve(ext);
    const charge=typeof pi.latest_charge==="string" ? pi.latest_charge : pi.latest_charge?.id;
    if(!charge) throw new Error("Pagamento ainda sem cobrança; aguarde o webhook.");
    object={id:charge,object:"charge"};type="charge.refunded";
   } else if(ext.startsWith("checkout_cs_") || ext.startsWith("cs_")) {object={id:ext.replace(/^checkout_/,"")};type="checkout.session.completed";}
   else throw new Error("Identificador Stripe não reconhecido.");
   await syncStripeEvent({id:eventId,type,data:{object}});
  } else throw new Error("Provedor não suportado.");
  await AuditLogService.log({adminId:userId,action:"payment.reconcile",entity_type:"payment",entity_id:id});
  revalidateBilling();
  return {success:true as const};
 } catch {return {success:false as const,message:"Não foi possível conciliar com o provedor. Consulte as credenciais e o vínculo do pagamento."};}
}
