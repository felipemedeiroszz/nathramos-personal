import { createServiceClientSSR } from "../lib/supabase/server"
import type { MealTypeT } from "../lib/supabase/types"
import type {
  DietProgramRow,
  DietMealRow,
  DietMealItemRow,
} from "../types"
import { AuditLogService } from "./AuditLogService"
import {
  upsertDietProgramSchema,
  upsertDietMealSchema,
  upsertDietMealItemSchema,
  type UpsertDietProgramInput,
  type UpsertDietMealInput,
  type UpsertDietMealItemInput,
} from "../schemas/diets"

export interface DietNutritionTotals {
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fats_g: number
}

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
    input: UpsertDietProgramInput,
    userId: string,
    adminId?: string
  ): Promise<DietProgramRow | null> {
    try {
      const parsed = upsertDietProgramSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, any> = { ...parsed }
      payload.user_id = userId
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase
          .from("diet_programs")
          .update(payload as never)
          .eq("id", parsed.id)
      } else {
        q = supabase.from("diet_programs").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId: adminId ?? userId,
        action: parsed.id ? "diet_program.update" : "diet_program.create",
        entity_type: "diet_programs",
        entity_id: data.id,
        details: { title_pt: parsed.title_pt, title_en: parsed.title_en },
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

  static async upsertMeal(input: UpsertDietMealInput): Promise<DietMealRow | null> {
    try {
      const parsed = upsertDietMealSchema.parse(input)
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...parsed }
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase.from("diet_meals").update(payload as never).eq("id", parsed.id)
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

  static async upsertMealItem(input: UpsertDietMealItemInput): Promise<DietMealItemRow | null> {
    try {
      const parsed = upsertDietMealItemSchema.parse(input)
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...parsed }
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase.from("diet_meal_items").update(payload as never).eq("id", parsed.id)
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

  // ---------------------------------------------------------------------
  // NUTRITION CALCULATION
  // ---------------------------------------------------------------------
  static calculateItemNutrition(
    item: { quantity: number; calories_kcal: number; protein_g: number; carbs_g: number; fats_g: number }
  ): DietNutritionTotals {
    const qty = item.quantity || 0
    return {
      calories_kcal: Math.round(item.calories_kcal * qty),
      protein_g: +(item.protein_g * qty).toFixed(1),
      carbs_g: +(item.carbs_g * qty).toFixed(1),
      fats_g: +(item.fats_g * qty).toFixed(1),
    }
  }

  static async getMealNutrition(mealId: string): Promise<DietNutritionTotals> {
    const items = await this.listMealItems(mealId)
    return items.reduce<DietNutritionTotals>(
      (acc, item) => {
        const n = this.calculateItemNutrition(item)
        acc.calories_kcal += n.calories_kcal
        acc.protein_g += n.protein_g
        acc.carbs_g += n.carbs_g
        acc.fats_g += n.fats_g
        return acc
      },
      { calories_kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
    )
  }

  static async getProgramNutrition(dietId: string): Promise<DietNutritionTotals> {
    const meals = await this.listMeals(dietId)
    const totals: DietNutritionTotals = { calories_kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
    for (const meal of meals) {
      const mealTotals = await this.getMealNutrition(meal.id)
      totals.calories_kcal += mealTotals.calories_kcal
      totals.protein_g += mealTotals.protein_g
      totals.carbs_g += mealTotals.carbs_g
      totals.fats_g += mealTotals.fats_g
    }
    return totals
  }
}
