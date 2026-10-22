import { createServiceClientSSR } from "../lib/supabase/server"
import type { SocialLinkRow } from "../types"
import { AuditLogService } from "./AuditLogService"
import {
  reorderSocialLinksSchema,
  upsertSocialLinkSchema,
  type ReorderSocialLinksInput,
  type UpsertSocialLinkInput,
} from "../schemas/social"

export class SocialLinksService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  static async list(filters?: {
    is_active?: boolean
    limit?: number
  }): Promise<SocialLinkRow[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("social_links")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(filters?.limit ?? 100)

      if (typeof filters?.is_active !== "undefined") {
        q = q.eq("is_active", filters.is_active)
      }

      const { data, error } = await q
      if (error) return []
      return (data as SocialLinkRow[]) ?? []
    } catch {
      return []
    }
  }

  static async upsert(
    input: UpsertSocialLinkInput,
    adminId?: string
  ): Promise<SocialLinkRow | null> {
    try {
      const parsed = upsertSocialLinkSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, any> = {
        platform: parsed.platform,
        label_pt: parsed.label_pt ?? null,
        label_en: parsed.label_en ?? null,
        handle: parsed.handle ?? null,
        icon_url: parsed.icon_url ?? null,
        url: parsed.url,
        is_active: parsed.is_active ?? true,
      }

      if (parsed.id) {
        const { data, error } = await supabase
          .from("social_links")
          .update(payload as never)
          .eq("id", parsed.id)
          .select()
          .single()
        if (error || !data) return null

        void AuditLogService.log({
          adminId,
          action: "social_link.update",
          entity_type: "social_link",
          entity_id: (data as SocialLinkRow).id,
          details: { platform: parsed.platform, url: parsed.url },
        })
        return data as SocialLinkRow
      }

      // nova rede: entra no fim da lista
      const { data: last } = await supabase
        .from("social_links")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle()
      payload.sort_order = ((last as { sort_order?: number } | null)?.sort_order ?? -1) + 1
      if (adminId) payload.created_by_id = adminId

      const { data, error } = await supabase
        .from("social_links")
        .insert(payload as never)
        .select()
        .single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId,
        action: "social_link.create",
        entity_type: "social_link",
        entity_id: (data as SocialLinkRow).id,
        details: { platform: parsed.platform, url: parsed.url },
      })
      return data as SocialLinkRow
    } catch {
      return null
    }
  }

  static async remove(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("social_links").delete().eq("id", id)
      if (error) return false

      void AuditLogService.log({
        adminId,
        action: "social_link.delete",
        entity_type: "social_link",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  static async toggleActive(
    id: string,
    isActive: boolean,
    adminId?: string
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("social_links")
        .update({ is_active: isActive } as never)
        .eq("id", id)
      if (error) return false

      void AuditLogService.log({
        adminId,
        action: "social_link.toggle",
        entity_type: "social_link",
        entity_id: id,
        details: { is_active: isActive },
      })
      return true
    } catch {
      return false
    }
  }

  static async reorder(input: ReorderSocialLinksInput, adminId?: string): Promise<boolean> {
    try {
      const parsed = reorderSocialLinksSchema.parse(input)
      const supabase = await this.getSupabase()

      for (let i = 0; i < parsed.ids.length; i++) {
        const { error } = await supabase
          .from("social_links")
          .update({ sort_order: i } as never)
          .eq("id", parsed.ids[i])
        if (error) return false
      }

      void AuditLogService.log({
        adminId,
        action: "social_link.reorder",
        entity_type: "social_link",
        details: { count: parsed.ids.length },
      })
      return true
    } catch {
      return false
    }
  }
}
