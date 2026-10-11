import { createServiceClientSSR } from "../lib/supabase/server"
import type { LocaleT } from "../lib/supabase/types"
import type {
  EbookRow,
  EbookDownloadRow,
} from "../types"
import { AuditLogService } from "./AuditLogService"

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
    input: any,
    adminId?: string
  ): Promise<EbookRow | null> {
    try {
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...input }
      delete payload.id

      let q: any
      if (input.id) {
        q = supabase
          .from("ebooks")
          .update(payload as never)
          .eq("id", input.id)
      } else {
        q = supabase.from("ebooks").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId,
        action: input.id ? "ebook.update" : "ebook.create",
        entity_type: "ebooks",
        entity_id: data.id,
        details: { title_pt: input.title_pt, title_en: input.title_en },
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
}
