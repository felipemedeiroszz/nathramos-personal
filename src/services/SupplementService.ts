import { createServiceClientSSR } from "../lib/supabase/server"
import type {
  SupplementRow,
  UserSupplementRow,
} from "../types"
import { AuditLogService } from "./AuditLogService"

export class SupplementService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  // ---------------------------------------------------------------------
  // SUPPLEMENTS
  // ---------------------------------------------------------------------
  static async listSupplements(filters?: {
    is_active?: boolean
    search?: string
    category?: string
    limit?: number
  }): Promise<SupplementRow[]> {
    try {
      const supabase = await this.getSupabase()
      const limit = filters?.limit ?? 100
      let q: any = supabase
        .from("supplements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)

      if (typeof filters?.is_active !== "undefined") q = q.eq("is_active", filters.is_active)
      if (filters?.category) {
        const s = `%${filters.category}%`
        q = q.or(`category_pt.ilike.${s},category_en.ilike.${s}`)
      }
      if (filters?.search) {
        const s = `%${filters.search}%`
        q = q.or(`name_pt.ilike.${s},name_en.ilike.${s},brand.ilike.${s}`)
      }

      const { data, error } = await q
      if (error) return []
      return (data as SupplementRow[]) ?? []
    } catch {
      return []
    }
  }

  static async getSupplement(id: string): Promise<SupplementRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("supplements")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (error) return null
      return (data as SupplementRow | null) ?? null
    } catch {
      return null
    }
  }

  static async upsertSupplement(
    input: any,
    createdById?: string
  ): Promise<SupplementRow | null> {
    try {
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...input }
      if (!input.id && createdById) payload.created_by_id = createdById
      delete payload.id

      let q: any
      if (input.id) {
        q = supabase
          .from("supplements")
          .update(payload as never)
          .eq("id", input.id)
      } else {
        q = supabase.from("supplements").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId: createdById,
        action: input.id ? "supplement.update" : "supplement.create",
        entity_type: "supplements",
        entity_id: data.id,
        details: { name_pt: input.name_pt, name_en: input.name_en },
      })

      return data as SupplementRow
    } catch {
      return null
    }
  }

  static async deleteSupplement(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("supplements")
        .update({ is_active: false } as never)
        .eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "supplement.delete",
        entity_type: "supplements",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // USER SUPPLEMENTS
  // ---------------------------------------------------------------------
  static async listUserSupplements(userId: string): Promise<UserSupplementRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("user_supplements")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      if (error) return []
      return (data as UserSupplementRow[]) ?? []
    } catch {
      return []
    }
  }

  static async upsertUserSupplement(
    input: any,
    assignedById?: string
  ): Promise<UserSupplementRow | null> {
    try {
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...input }
      if (assignedById) payload.assigned_by_id = assignedById
      delete payload.id

      let q: any
      if (input.id) {
        q = supabase.from("user_supplements").update(payload as never).eq("id", input.id)
      } else {
        q = supabase.from("user_supplements").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null
      return data as UserSupplementRow
    } catch {
      return null
    }
  }

  static async deleteUserSupplement(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("user_supplements").delete().eq("id", id)
      if (error) return false
      return true
    } catch {
      return false
    }
  }
}
