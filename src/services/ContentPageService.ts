import { createServiceClientSSR } from "../lib/supabase/server"
import type { ContentPageRow } from "../types"
import { AuditLogService } from "./AuditLogService"
import {
  upsertContentPageSchema,
  type UpsertContentPageInput,
} from "../schemas/contentPages"

export class ContentPageService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  static async list(): Promise<ContentPageRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("content_pages")
        .select("*")
        .order("slug", { ascending: true })
      if (error) return []
      return (data as ContentPageRow[]) ?? []
    } catch {
      return []
    }
  }

  static async getBySlug(slug: string): Promise<ContentPageRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("content_pages")
        .select("*")
        .eq("slug", slug)
        .limit(1)
        .maybeSingle()
      if (error || !data) return null
      return data as ContentPageRow
    } catch {
      return null
    }
  }

  static async upsert(
    input: UpsertContentPageInput,
    adminId?: string
  ): Promise<ContentPageRow | null> {
    try {
      const parsed = upsertContentPageSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, unknown> = {
        slug: parsed.slug,
        title_pt: parsed.title_pt ?? null,
        title_en: parsed.title_en ?? null,
        subtitle_pt: parsed.subtitle_pt ?? null,
        subtitle_en: parsed.subtitle_en ?? null,
        image_url: parsed.image_url ?? null,
        cta_label_pt: parsed.cta_label_pt ?? null,
        cta_label_en: parsed.cta_label_en ?? null,
        cta_url: parsed.cta_url ?? null,
        blocks: parsed.blocks,
        is_active: parsed.is_active ?? true,
      }

      const existing = await this.getBySlug(parsed.slug)

      if (existing) {
        if (adminId) payload.updated_by_id = adminId
        const { data, error } = await supabase
          .from("content_pages")
          .update(payload as never)
          .eq("id", existing.id)
          .select()
          .single()
        if (error || !data) return null

        void AuditLogService.log({
          adminId,
          action: "content_page.update",
          entity_type: "content_page",
          entity_id: (data as ContentPageRow).id,
          details: { slug: parsed.slug, blocks: parsed.blocks.length },
        })
        return data as ContentPageRow
      }

      if (adminId) payload.updated_by_id = adminId
      const { data, error } = await supabase
        .from("content_pages")
        .insert(payload as never)
        .select()
        .single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId,
        action: "content_page.create",
        entity_type: "content_page",
        entity_id: (data as ContentPageRow).id,
        details: { slug: parsed.slug, blocks: parsed.blocks.length },
      })
      return data as ContentPageRow
    } catch {
      return null
    }
  }
}
