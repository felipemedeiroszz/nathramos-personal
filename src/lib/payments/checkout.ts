import "server-only"
import { randomUUID } from "node:crypto"
import { billingDb, syncAsaasPayment, asaasDate } from "./sync"
import { ProfileService } from "./services"
import { AsaasProvider } from "./asaas"
import { validCpf } from "./document"
import { ApiValidationError } from "@/lib/api/response"
export async function reserveCheckout(userId: string,kind: "plan" | "ebook",target: string,provider: "asaas" | "stripe",key?: string) {
 const db=await billingDb()
 if (!key) {
  const {data,error}=await db.from("billing_checkout_operations").select("*").eq("user_id",userId).eq("kind",kind).eq("target_id",target).eq("provider",provider).like("request_key",provider === "stripe" ? "hosted:%" : "pix:%").in("state",["creating","ready"]).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle()
  if(error) throw error
  key=data?.request_key || `${provider === "stripe" ? "hosted" : "pix"}:${randomUUID()}`
 }
 const {data,error}=await db.rpc("billing_reserve_checkout",{p_user:userId,p_kind:kind,p_target:target,p_provider:provider,p_key:key})
 if(error) throw new ApiValidationError(error.message)
 return data
}
export async function readyCheckout(opId: string,remoteId: string,expiresAt?: string) {
 const db=await billingDb()
 const {error}=await db.from("billing_checkout_operations").update({state:"ready",remote_id:remoteId,...(expiresAt ? {expires_at:expiresAt} : {})}).eq("id",opId).neq("state","completed")
 if(error) throw error
}
export async function createAsaasPix(userId: string,kind: "plan" | "ebook",target: string,cpf?: string,phone?: string) {
 const profile=await ProfileService.getProfile(userId)
 if(!profile || profile.is_deleted || profile.role!=="student") throw new ApiValidationError("Conta de aluno indisponível.")
 if (cpf && !validCpf(cpf)) throw new ApiValidationError("Informe um CPF válido para identificar o pagador.")
 if (!profile.asaas_customer_id && !validCpf(cpf || profile.cpf || "")) throw new ApiValidationError("Informe seu CPF para gerar a cobrança PIX.")
 const op=await reserveCheckout(userId,kind,target,"asaas")
 let customerId=profile.asaas_customer_id
 if(!customerId) {
  const customer=await AsaasProvider.findOrCreateCustomer({userId,name:profile.full_name || "Aluno",email:(profile as any).email || "",cpfCnpj:(cpf || profile.cpf || "").replace(/\D/g,"") || undefined,phone:phone || profile.phone || undefined})
  customerId=customer.id
  const db=await billingDb()
  const {error}=await db.from("profiles").update({asaas_customer_id:customerId}).eq("id",userId)
  if(error) throw error
 }
 if (cpf && customerId) await AsaasProvider.updateCustomerDocument(customerId,cpf)
 let remoteId=op.remote_id
 let pix
 if(!remoteId) {
  const found=await AsaasProvider.findPayment(op.id)
  if(found) remoteId=found.id
  else {
   pix=await AsaasProvider.createPixCharge({customerId,name:profile.full_name || "Aluno",email:(profile as any).email || "",amount:op.amount_cents/100,dueDate:op.expires_at.slice(0,10),description:kind === "plan" ? "Assinatura - acesso por período" : "Compra de e-book",externalReference:op.id,userId})
   remoteId=pix.id
  }
  await readyCheckout(op.id,remoteId)
 }
 pix=pix || await AsaasProvider.getPix(remoteId)
 await readyCheckout(op.id,remoteId,asaasDate(pix.pix_expires_at) || op.expires_at)
 await syncAsaasPayment(remoteId,`poll:${randomUUID()}`,"CHECKOUT_SYNC",{pix_qr_code:pix.pix_qr_code,pix_copy_paste:pix.pix_copy_paste,pix_expires_at:pix.pix_expires_at})
 return {...pix,payment_id:remoteId}
}
export function appReturnUrl(base: string,path: string | undefined,fallback: string) {
 if(path && (!path.startsWith("/") || path.startsWith("//") || path.includes("\\"))) throw new ApiValidationError("Caminho de retorno inválido.")
 const url=new URL(path || fallback,base)
 if(url.origin!==new URL(base).origin) throw new ApiValidationError("Origem de retorno inválida.")
 return url.toString()
}
