import { createServiceClientSSR } from "../lib/supabase/server"
import type { LocaleT } from "../lib/supabase/types"
import type {
  EbookRow,
  EbookDownloadRow,
  EbookPurchaseRow,
  PaymentProvider,
  Currency,
} from "../types"
import { AuditLogService } from "./AuditLogService"
import { upsertEbookSchema, type UpsertEbookInput } from "../schemas/ebooks"

export class EbookService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  // ---------------------------------------------------------------------
  // EBOOKS
  // ---------------------------------------------------------------------
  static async listEbooks(filters?: {
    is_published?: boolean
    is_free?: boolean
    language?: LocaleT
    search?: string
    limit?: number
  }): Promise<EbookRow[]> {
    try {
      const supabase = await this.getSupabase()
      const limit = filters?.limit ?? 100
      let q: any = supabase
        .from("ebooks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)

      if (typeof filters?.is_published !== "undefined") q = q.eq("is_published", filters.is_published)
      if (typeof filters?.is_free !== "undefined") q = q.eq("is_free", filters.is_free)
      if (filters?.language) q = q.eq("language", filters.language)
      if (filters?.search) {
        const s = `%${filters.search}%`
        q = q.or(`title_pt.ilike.${s},title_en.ilike.${s},summary_pt.ilike.${s},summary_en.ilike.${s}`)
      }

      const { data, error } = await q
      if (error) return []
      return (data as EbookRow[]) ?? []
    } catch {
      return []
    }
  }

  static async getEbook(id: string): Promise<EbookRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("ebooks")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (error) return null
      return (data as EbookRow | null) ?? null
    } catch {
      return null
    }
  }

  static async upsertEbook(
    input: UpsertEbookInput,
    adminId?: string
  ): Promise<EbookRow | null> {
    try {
      const parsed = upsertEbookSchema.parse(input)
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...parsed }
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase
          .from("ebooks")
          .update(payload as never)
          .eq("id", parsed.id)
      } else {
        q = supabase.from("ebooks").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId,
        action: parsed.id ? "ebook.update" : "ebook.create",
        entity_type: "ebooks",
        entity_id: data.id,
        details: { title_pt: parsed.title_pt, title_en: parsed.title_en },
      })

      return data as EbookRow
    } catch {
      return null
    }
  }

  static async deleteEbook(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("ebooks")
        .update({ is_deleted: true } as never)
        .eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "ebook.delete",
        entity_type: "ebooks",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // EBOOK DOWNLOADS
  // ---------------------------------------------------------------------
  static async recordDownload(ebookId: string, userId: string, ipAddress?: string): Promise<EbookDownloadRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("ebook_downloads")
        .upsert({
          user_id: userId,
          ebook_id: ebookId,
          ip_address: ipAddress ?? null,
        } as never, {
          onConflict: "user_id,ebook_id"
        })
        .select()
        .single()
      if (error) return null
      return data as EbookDownloadRow
    } catch {
      return null
    }
  }

  static async getUserDownloads(userId: string): Promise<EbookDownloadRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("ebook_downloads")
        .select("*")
        .eq("user_id", userId)
        .order("downloaded_at", { ascending: false })
      if (error) return []
      return (data as EbookDownloadRow[]) ?? []
    } catch {
      return []
    }
  }

  // ---------------------------------------------------------------------
  // COMPRAS DE EBOOK
  // ---------------------------------------------------------------------
  static async getPurchases(userId: string): Promise<EbookPurchaseRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("ebook_purchases")
        .select("*")
        .eq("user_id", userId)
      if (error) return []
      return (data as EbookPurchaseRow[]) ?? []
    } catch {
      return []
    }
  }

  static async getPaidEbookIds(userId: string): Promise<string[]> {
    const purchases = await this.getPurchases(userId)
    return purchases.filter((p) => ["paid", "partially_refunded"].includes(p.status)).map((p) => p.ebook_id)
  }

  static async createPendingPurchase(input: {
    userId: string
    ebookId: string
    provider: PaymentProvider
    amountCents: number
    currency: Currency
    externalId?: string | null
    pixQrCode?: string | null
    pixCopyPaste?: string | null
    pixExpiresAt?: string | null
  }): Promise<EbookPurchaseRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("ebook_purchases")
        .upsert(
          {
            user_id: input.userId,
            ebook_id: input.ebookId,
            provider: input.provider,
            status: "pending",
            amount_cents: input.amountCents,
            currency: input.currency,
            external_id: input.externalId ?? null,
            pix_qr_code: input.pixQrCode ?? null,
            pix_copy_paste: input.pixCopyPaste ?? null,
            pix_expires_at: input.pixExpiresAt ?? null,
            paid_at: null,
            failed_at: null,
            refunded_at: null,
          } as never,
          { onConflict: "user_id,ebook_id" }
        )
        .select()
        .single()
      if (error) return null
      return data as EbookPurchaseRow
    } catch {
      return null
    }
  }

  static async markPurchasePaid(input: {
    userId: string
    ebookId: string
    provider: PaymentProvider
    amountCents: number
    currency: Currency
    externalId?: string | null
    externalEventId?: string | null
    paidAt?: string
  }): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("ebook_purchases")
        .upsert(
          {
            user_id: input.userId,
            ebook_id: input.ebookId,
            provider: input.provider,
            status: "paid",
            amount_cents: input.amountCents,
            currency: input.currency,
            external_id: input.externalId ?? null,
            external_event_id: input.externalEventId ?? null,
            paid_at: input.paidAt ?? new Date().toISOString(),
          } as never,
          { onConflict: "user_id,ebook_id" }
        )
      return !error
    } catch {
      return false
    }
  }

  static async markPurchaseStatusByExternalId(
    provider: PaymentProvider,
    externalId: string,
    status: "failed" | "canceled" | "expired" | "refunded",
    timestampField: "failed_at" | "refunded_at"
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("ebook_purchases")
        .update({
          status,
          [timestampField]: new Date().toISOString(),
        } as never)
        .eq("provider", provider)
        .eq("external_id", externalId)
      return !error
    } catch {
      return false
    }
  }
}
