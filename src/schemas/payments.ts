import { z } from "zod"

const uuidSchema = z.string().uuid({ message: "ID inválido." })

export const createCheckoutSchema = z.object({
  plan_id: uuidSchema,
  method: z.enum(["credit_card", "pix"], {
    required_error: "Método de pagamento é obrigatório.",
    invalid_type_error: "Método deve ser credit_card ou pix.",
  }),
  locale: z.enum(["pt-BR", "en-US"]).default("pt-BR"),
  success_url: z
    .string({ required_error: "URL de sucesso é obrigatória." })
    .url({ message: "URL de sucesso inválida." }),
  cancel_url: z
    .string({ required_error: "URL de cancelamento é obrigatória." })
    .url({ message: "URL de cancelamento inválida." }),
  coupon_code: z.string().trim().max(50).optional().or(z.literal("")),
  success_path: z.string().trim().min(1).optional(),
  cancel_path: z.string().trim().min(1).optional(),
})
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>

export const createSubscriptionSchema = z.object({
  plan_id: uuidSchema,
  customer_id: z.string().optional(),
  payment_method: z.string().optional(),
  coupon: z.string().optional(),
})
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>

export const subscriptionActionSchema = z.object({
  subscription_id: z.string({ required_error: "ID da assinatura é obrigatório." }),
  action: z.enum(["cancel", "reactivate", "update-method"], {
    required_error: "Ação é obrigatória.",
    invalid_type_error: "Ação deve ser cancel, reactivate ou update-method.",
  }),
})
export type SubscriptionActionInput = z.infer<typeof subscriptionActionSchema>

export const asaasPixSchema = z.object({
  plan_id: uuidSchema,
  customer_id: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || v === "" || /^\d{11}$/.test(v.replace(/\D/g, "")),
      { message: "CPF inválido." }
    ),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || v === "" || /^(\+?\d{10,15})$/.test(String(v).replace(/\D/g, "")),
      { message: "Telefone inválido." }
    ),
})
export type AsaasPixInput = z.infer<typeof asaasPixSchema>
export { asaasPixSchema as createPixSchema }
export type CreatePixInput = AsaasPixInput

export const ebookCheckoutSchema = z.object({
  ebook_id: uuidSchema,
  locale: z.enum(["pt-BR", "en-US"]).default("pt-BR"),
  success_path: z.string().trim().min(1).optional(),
  cancel_path: z.string().trim().min(1).optional(),
})
export type EbookCheckoutInput = z.infer<typeof ebookCheckoutSchema>

export const ebookPixSchema = z.object({
  ebook_id: uuidSchema,
})
export type EbookPixInput = z.infer<typeof ebookPixSchema>

export const checkoutIntentSchema = z.object({
  plan_id: uuidSchema,
})
export type CheckoutIntentInput = z.infer<typeof checkoutIntentSchema>

export const checkoutSubscribeSchema = z.object({
  plan_id: uuidSchema,
  payment_method_id: z.string({ required_error: "Método de pagamento é obrigatório." }).min(3),
})
export type CheckoutSubscribeInput = z.infer<typeof checkoutSubscribeSchema>

export const webhookStripeSchema = z.object({
  signature: z.string({ required_error: "Assinatura Stripe é obrigatória." }).min(1),
})
export type WebhookStripeInput = z.infer<typeof webhookStripeSchema>

export const webhookAsaasSchema = z.object({
  token: z.string({ required_error: "Token Asaas é obrigatório." }).min(1),
})
export type WebhookAsaasInput = z.infer<typeof webhookAsaasSchema>
