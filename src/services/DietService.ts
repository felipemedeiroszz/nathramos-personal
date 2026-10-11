import { createServiceClientSSR } from "../lib/supabase/server"
import type { MealTypeT } from "../lib/supabase/types"
import type {
  DietProgramRow,
  DietMealRow,
  DietMealItemRow,
} from "../types"
import { AuditLogService } from "./AuditLogService"

export class DietService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  // ---------------------------------------------------------------------
  // DIET PROGRAMS
  // ---------------------------------------------------------------------
  static async listPrograms(filters?: {
    user_id?: string
    is_active?: boolean
    search?: string
    limit?: number
  }): Promise<DietProgramRow[]> {
    try {
      const supabase = await this.getSupabase()
      const limit = filters?.limit ?? 100
      let q: any = supabase
        .from("diet_programs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)

      if (filters?.user_id) q = q.eq("user_id", filters.user_id)
      if (typeof filters?.is_active !== "undefined") q = q.eq("is_active", filters.is_active)
      if (filters?.search) {
        const s = `%${filters.search}%`
        q = q.or(`title_pt.ilike.${s},title_en.ilike.${s}`)
      }

      const { data, error } = await q
      if (error) return []
      return (data as DietProgramRow[]) ?? []
    } catch {
      return []
    }
  }

  static async getProgram(id: string): Promise<DietProgramRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("diet_programs")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (error) return null
      return (data as DietProgramRow | null) ?? null
    } catch {
      return null
    }
  }

  static async upsertProgram(
    input: any,
    userId: string,
    adminId?: string
  ): Promise<DietProgramRow | null> {
    try {
      const supabase = await this.getSupabase()

      const payload: Record<string, any> = { ...input }
      if (!input.id) payload.user_id = userId
      else payload.user_id = userId
      delete payload.id

      let q: any
      if (input.id) {
        q = supabase
          .from("diet_programs")
          .update(payload as never)
          .eq("id", input.id)
      } else {
        q = supabase.from("diet_programs").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId: adminId ?? userId,
        action: input.id ? "diet_program.update" : "diet_program.create",
        entity_type: "diet_programs",
        entity_id: data.id,
        details: { title_pt: input.title_pt, title_en: input.title_en },
      })

      return data as DietProgramRow
    } catch {
      return null
    }
  }

  static async deleteProgram(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("diet_programs")
        .update({ is_active: false } as never)
        .eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "diet_program.delete",
        entity_type: "diet_programs",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // DIET MEALS
  // ---------------------------------------------------------------------
  static async listMeals(dietId: string): Promise<DietMealRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("diet_meals")
        .select("*")
        .eq("diet_id", dietId)
        .order("order_index", { ascending: true })
      if (error) return []
      return (data as DietMealRow[]) ?? []
    } catch {
      return []
    }
  }

  static async upsertMeal(input: any): Promise<DietMealRow | null> {
    try {
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...input }
      delete payload.id

      let q: any
      if (input.id) {
        q = supabase.from("diet_meals").update(payload as never).eq("id", input.id)
      } else {
        q = supabase.from("diet_meals").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null
      return data as DietMealRow
    } catch {
      return null
    }
  }

  static async deleteMeal(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("diet_meals").delete().eq("id", id)
      if (error) return false
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // DIET MEAL ITEMS
  // ---------------------------------------------------------------------
  static async listMealItems(mealId: string): Promise<DietMealItemRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("diet_meal_items")
        .select("*")
        .eq("meal_id", mealId)
        .order("order_index", { ascending: true })
      if (error) return []
      return (data as DietMealItemRow[]) ?? []
    } catch {
      return []
    }
  }

  static async upsertMealItem(input: any): Promise<DietMealItemRow | null> {
    try {
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...input }
      delete payload.id

      let q: any
      if (input.id) {
        q = supabase.from("diet_meal_items").update(payload as never).eq("id", input.id)
      } else {
        q = supabase.from("diet_meal_items").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null
      return data as DietMealItemRow
    } catch {
      return null
    }
  }

  static async deleteMealItem(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("diet_meal_items").delete().eq("id", id)
      if (error) return false
      return true
    } catch {
      return false
    }
  }
}
