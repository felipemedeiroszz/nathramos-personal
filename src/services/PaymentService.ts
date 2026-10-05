"use server"

import { createServiceClientSSR } from "../lib/supabase/server"
import type {
  PaymentRow,
  PaymentProviderT,
  WebhookEventRow,
} from "../lib/supabase/types"
import type { DatabasePublicSchema } from "../lib/supabase/server"

type PaymentInsertT = DatabasePublicSchema["payments"]["Insert"]
type WebhookInsertT = DatabasePublicSchema["webhook_events"]["Insert"]

export type PaymentInsertInput = Omit<PaymentRow, "id" | "created_at" | "updated_at" | "net_amount_cents"> & {
  net_amount_cents?: number
}

export class PaymentService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  static async recordPayment(input: PaymentInsertInput): Promise<PaymentRow> {
    const supabase = await this.getSupabase()

    const insertData: PaymentInsertT = {
      subscription_id: input.subscription_id ?? null,
      user_id: input.user_id,
      provider: input.provider,
      external_id: input.external_id ?? null,
      external_event_id: input.external_event_id ?? null,
      status: input.status,
      amount_cents: input.amount_cents,
      currency: input.currency,
      fee_cents: input.fee_cents,
      method: input.method,
      installments: input.installments,
      description_pt: input.description_pt,
      description_en: input.description_en,
      pix_qr_code: input.pix_qr_code ?? null,
      pix_copy_paste: input.pix_copy_paste ?? null,
      pix_expires_at: input.pix_expires_at ?? null,
      boleto_barcode: input.boleto_barcode ?? null,
      boleto_digitable_line: input.boleto_digitable_line ?? null,
      boleto_expires_at: input.boleto_expires_at ?? null,
      boleto_url: input.boleto_url ?? null,
      card_last4: input.card_last4 ?? null,
      card_brand: input.card_brand ?? null,
      card_holder: input.card_holder ?? null,
      due_at: input.due_at ?? null,
      paid_at: input.paid_at ?? null,
      failed_at: input.failed_at ?? null,
      refunded_at: input.refunded_at ?? null,
      failure_reason: input.failure_reason ?? null,
      metadata: input.metadata ?? {},
      idempotency_key: input.idempotency_key ?? null,
    }

    let data: PaymentRow | null = null
    let errorMsg: string | undefined

    if (insertData.external_id) {
      const result = await supabase
        .from("payments")
        .upsert(insertData as never, {
          onConflict: "external_id,provider",
          ignoreDuplicates: false,
        })
        .select()
        .single()
      data = result.data as PaymentRow | null
      errorMsg = result.error?.message
    } else if (insertData.idempotency_key) {
      const result = await supabase
        .from("payments")
        .upsert(insertData as never, {
          onConflict: "idempotency_key",
          ignoreDuplicates: false,
        })
        .select()
        .single()
      data = result.data as PaymentRow | null
      errorMsg = result.error?.message
    } else {
      const result = await supabase
        .from("payments")
        .insert(insertData as never)
        .select()
        .single()
      data = result.data as PaymentRow | null
      errorMsg = result.error?.message
    }

    if (!data) {
      throw new Error(`Falha ao registrar pagamento: ${errorMsg ?? "unknown"}`)
    }

    return data
  }

  static async recordWebhookEvent(
    provider: PaymentProviderT,
    eventId: string,
    eventType: string,
    payload: Record<string, unknown>,
    signatureOk: boolean,
    errorText?: string
  ): Promise<WebhookEventRow | null> {
    const supabase = await this.getSupabase()

    const now = new Date().toISOString()

    const insertPayload: WebhookInsertT = {
      provider,
      event_id: eventId,
      event_type: eventType,
      payload,
      signature_ok: signatureOk,
      processed_at: signatureOk && !errorText ? now : null,
      error_text: errorText ?? null,
    }

    const result = await supabase
      .from("webhook_events")
      .insert(insertPayload as never)
      .select()
      .single()

    if (result.error) {
      if (result.error.code === "23505") {
        return null
      }
      throw new Error(`Falha ao registrar evento webhook: ${result.error.message}`)
    }

    return (result.data as WebhookEventRow | null) ?? null
  }

  static async getHistory(userId: string, limit: number = 50): Promise<PaymentRow[]> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Falha ao buscar histórico de pagamentos: ${error.message}`)
    }

    return (data as PaymentRow[]) ?? []
  }

  static async isEventProcessed(
    provider: PaymentProviderT,
    eventId: string
  ): Promise<boolean> {
    const supabase = await this.getSupabase()

    const result = await supabase
      .from("webhook_events")
      .select("id, processed_at")
      .eq("provider", provider)
      .eq("event_id", eventId)
      .not("processed_at", "is", null)
      .limit(1)
      .maybeSingle()

    if (result.error) {
      throw new Error(`Falha ao verificar evento webhook: ${result.error.message}`)
    }

    return !!result.data
  }
}
