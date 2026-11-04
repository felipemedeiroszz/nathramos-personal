"use server";
import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { manualBillingSchema } from "@/schemas/manualBilling";

export async function recordStudentManualAction(_previous: unknown, formData: FormData) {
  const { userId } = await requireRole(["admin"], "/dashboard");
  const en = formData.get("locale") === "en-US";
  const parsed = manualBillingSchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, value]) => value !== "")));
  if (!parsed.success) return { success: false, message: en ? "Check the plan, expiration, amount and payment date. Use an amount such as 150.00." : "Confira plano, vencimento, valor e data do recebimento. Informe o valor como 150,00, sem separador de milhares." };
  const input = parsed.data;
  try {
    const db = await createServiceClientSSR();
    const { error } = await (db.rpc as any)("admin_record_student_manual", {
      p_actor: userId, p_student: input.studentId, p_key: input.requestKey,
      p_plan: input.operation !== "payment" ? input.planId : null,
      p_expires: input.operation !== "payment" ? input.expires : null,
      p_amount: input.operation !== "plan" ? input.amount : null,
      p_currency: input.currency, p_method: input.method,
      p_paid_date: input.operation !== "plan" ? input.paidDate : null, p_notes: input.notes,
    });
    if (error) {
      if (error.message?.includes("EXTERNAL_SUBSCRIPTION_EXISTS")) return { success: false, message: en ? "This student has a gateway subscription or pending checkout. Resolve it before granting a manual plan. You can record a payment separately." : "O aluno possui assinatura no provedor ou checkout pendente. Resolva esse vínculo antes de liberar um plano manual. É possível registrar somente o recebimento." };
      if (error.message?.includes("INVALID_EXPIRY")) return { success: false, message: en ? "Choose an expiration from today up to ten years ahead." : "Escolha um vencimento a partir de hoje e até dez anos à frente." };
      if (error.message?.includes("INVALID_PAYMENT")) return { success: false, message: en ? "Check the amount and receipt date. Future payments cannot be marked as received." : "Confira valor e data. Não é possível registrar como recebido um pagamento futuro." };
      if (error.message?.includes("CURRENCY_MISMATCH")) return { success: false, message: en ? "Use the same currency as the selected plan." : "Use a mesma moeda do plano selecionado." };
      throw new Error("manual_billing_failed");
    }
  } catch {
    return { success: false, message: en ? "Could not save. Check the connection and database migrations, then try again." : "Não foi possível salvar. Confira a conexão e as migrações do banco e tente novamente." };
  }
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]/(student)", "layout");
  revalidatePath("/[locale]/assinatura", "layout");
  return { success: true, message: en ? "Saved. The student's access and payment history have been updated." : "Registro salvo. O acesso e o histórico financeiro do aluno foram atualizados." };
}
