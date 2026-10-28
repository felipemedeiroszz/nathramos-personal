import { staffStudentIds } from "@/lib/auth/platform";
import { checked } from "./StudentRoutineService";
import { createServiceClientSSR } from "../lib/supabase/server";
import type { MealTypeT } from "../lib/supabase/types";
import type {
  DietProgramRow,
  DietMealRow,
  DietMealItemRow,
  DietFoodRow,
  DietKitRow,
  DietKitItemWithFood,
  DietKitAssignmentStatus,
  StudentDietKitRow,
  StudentDietKitWithKit,
} from "../types";
import { AuditLogService } from "./AuditLogService";
import {
  upsertDietProgramSchema,
  upsertDietMealSchema,
  upsertDietMealItemSchema,
  upsertDietFoodSchema,
  upsertDietKitSchema,
  upsertDietKitItemSchema,
  saveDietKitSchema,
  syncDietKitStudentsSchema,
  syncStudentDietKitsSchema,
  type UpsertDietProgramInput,
  type UpsertDietMealInput,
  type UpsertDietMealItemInput,
  type UpsertDietFoodInput,
  type UpsertDietKitInput,
  type UpsertDietKitItemInput,
  type SaveDietKitInput,
  type SyncDietKitStudentsInput,
  type SyncStudentDietKitsInput,
} from "../schemas/diets";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface DietNutritionTotals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export class DietService {
  private static async getSupabase() {
    return createServiceClientSSR();
  }

  // ---------------------------------------------------------------------
  // DIET PROGRAMS
  // ---------------------------------------------------------------------
  static async listPrograms(filters?: {
    user_id?: string;
    is_active?: boolean;
    search?: string;
    limit?: number;
  }): Promise<DietProgramRow[]> {
    try {
      const supabase = await this.getSupabase();
      const limit = filters?.limit ?? 100;
      let q: any = supabase
        .from("diet_programs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filters?.user_id) q = q.eq("user_id", filters.user_id);
      if (typeof filters?.is_active !== "undefined")
        q = q.eq("is_active", filters.is_active);
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`title_pt.ilike.${s},title_en.ilike.${s}`);
      }

      const { data, error } = await q;
      if (error) return [];
      return (data as DietProgramRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async getProgram(id: string): Promise<DietProgramRow | null> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("diet_programs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) return null;
      return (data as DietProgramRow | null) ?? null;
    } catch {
      return null;
    }
  }

  static async upsertProgram(
    input: UpsertDietProgramInput,
    userId: string,
    adminId?: string,
  ): Promise<DietProgramRow | null> {
    try {
      const parsed = upsertDietProgramSchema.parse(input);
      const supabase = await this.getSupabase();

      const payload: Record<string, any> = { ...parsed };
      payload.user_id = userId;
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("diet_programs")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("diet_programs").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;

      void AuditLogService.log({
        adminId: adminId ?? userId,
        action: parsed.id ? "diet_program.update" : "diet_program.create",
        entity_type: "diet_programs",
        entity_id: data.id,
        details: { title_pt: parsed.title_pt, title_en: parsed.title_en },
      });

      return data as DietProgramRow;
    } catch {
      return null;
    }
  }

  static async deleteProgram(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("diet_programs")
        .update({ is_active: false } as never)
        .eq("id", id);
      if (error) return false;
      void AuditLogService.log({
        adminId,
        action: "diet_program.delete",
        entity_type: "diet_programs",
        entity_id: id,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // DIET MEALS
  // ---------------------------------------------------------------------
  static async listMeals(dietId: string): Promise<DietMealRow[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("diet_meals")
        .select("*")
        .eq("diet_id", dietId)
        .order("order_index", { ascending: true });
      if (error) return [];
      return (data as DietMealRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async upsertMeal(
    input: UpsertDietMealInput,
  ): Promise<DietMealRow | null> {
    try {
      const parsed = upsertDietMealSchema.parse(input);
      const supabase = await this.getSupabase();
      const payload: Record<string, any> = { ...parsed };
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("diet_meals")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("diet_meals").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;
      return data as DietMealRow;
    } catch {
      return null;
    }
  }

  static async deleteMeal(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase.from("diet_meals").delete().eq("id", id);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // DIET MEAL ITEMS
  // ---------------------------------------------------------------------
  static async listMealItems(mealId: string): Promise<DietMealItemRow[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("diet_meal_items")
        .select("*")
        .eq("meal_id", mealId)
        .order("order_index", { ascending: true });
      if (error) return [];
      return (data as DietMealItemRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async upsertMealItem(
    input: UpsertDietMealItemInput,
  ): Promise<DietMealItemRow | null> {
    try {
      const parsed = upsertDietMealItemSchema.parse(input);
      const supabase = await this.getSupabase();
      const payload: Record<string, any> = { ...parsed };
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("diet_meal_items")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("diet_meal_items").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;
      return data as DietMealItemRow;
    } catch {
      return null;
    }
  }

  static async deleteMealItem(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("diet_meal_items")
        .delete()
        .eq("id", id);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // NUTRITION CALCULATION
  // ---------------------------------------------------------------------
  static calculateItemNutrition(item: {
    quantity: number;
    calories_kcal: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  }): DietNutritionTotals {
    const qty = item.quantity || 0;
    return {
      calories_kcal: Math.round(item.calories_kcal * qty),
      protein_g: +(item.protein_g * qty).toFixed(1),
      carbs_g: +(item.carbs_g * qty).toFixed(1),
      fats_g: +(item.fats_g * qty).toFixed(1),
    };
  }

  static async getMealNutrition(mealId: string): Promise<DietNutritionTotals> {
    const items = await this.listMealItems(mealId);
    return items.reduce<DietNutritionTotals>(
      (acc, item) => {
        const n = this.calculateItemNutrition(item);
        acc.calories_kcal += n.calories_kcal;
        acc.protein_g += n.protein_g;
        acc.carbs_g += n.carbs_g;
        acc.fats_g += n.fats_g;
        return acc;
      },
      { calories_kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0 },
    );
  }

  static async getProgramNutrition(
    dietId: string,
  ): Promise<DietNutritionTotals> {
    const meals = await this.listMeals(dietId);
    const totals: DietNutritionTotals = {
      calories_kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    };
    for (const meal of meals) {
      const mealTotals = await this.getMealNutrition(meal.id);
      totals.calories_kcal += mealTotals.calories_kcal;
      totals.protein_g += mealTotals.protein_g;
      totals.carbs_g += mealTotals.carbs_g;
      totals.fats_g += mealTotals.fats_g;
    }
    return totals;
  }

  // ---------------------------------------------------------------------
  // CATÁLOGO DE ALIMENTOS
  // ---------------------------------------------------------------------
  static async listFoods(filters?: {
    is_active?: boolean;
    search?: string;
    category?: string;
    limit?: number;
  }): Promise<DietFoodRow[]> {
    try {
      const supabase = await this.getSupabase();
      const limit = filters?.limit ?? 100;
      let q: any = supabase
        .from("diet_foods")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (typeof filters?.is_active !== "undefined")
        q = q.eq("is_active", filters.is_active);
      if (filters?.category) {
        const s = `%${filters.category}%`;
        q = q.or(`category_pt.ilike.${s},category_en.ilike.${s}`);
      }
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`name_pt.ilike.${s},name_en.ilike.${s},brand.ilike.${s}`);
      }

      const { data, error } = await q;
      if (error) return [];
      return (data as DietFoodRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async getFood(id: string): Promise<DietFoodRow | null> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("diet_foods")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) return null;
      return (data as DietFoodRow | null) ?? null;
    } catch {
      return null;
    }
  }

  static async upsertFood(
    input: UpsertDietFoodInput,
    createdById?: string,
  ): Promise<DietFoodRow | null> {
    try {
      const parsed = upsertDietFoodSchema.parse(input);
      const supabase = await this.getSupabase();
      const payload: Record<string, any> = { ...parsed };
      if (!parsed.id && createdById) payload.created_by_id = createdById;
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("diet_foods")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("diet_foods").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;

      void AuditLogService.log({
        adminId: createdById,
        action: parsed.id ? "diet_food.update" : "diet_food.create",
        entity_type: "diet_foods",
        entity_id: data.id,
        details: { name_pt: parsed.name_pt, name_en: parsed.name_en },
      });

      return data as DietFoodRow;
    } catch {
      return null;
    }
  }

  static async deleteFood(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("diet_foods")
        .update({ is_active: false } as never)
        .eq("id", id);
      if (error) return false;
      void AuditLogService.log({
        adminId,
        action: "diet_food.delete",
        entity_type: "diet_foods",
        entity_id: id,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // KITS DE DIETA
  // ---------------------------------------------------------------------
  private static async ensureUniqueKitSlug(
    supabase: any,
    base: string,
    excludeId?: string,
  ): Promise<string> {
    const clean = base || "kit";
    let candidate = clean;
    let i = 1;
    for (;;) {
      const { data } = await supabase
        .from("diet_kits")
        .select("id")
        .eq("slug", candidate)
        .limit(1);
      const conflict = ((data as { id: string }[]) ?? []).find(
        (r) => r.id !== excludeId,
      );
      if (!conflict) return candidate;
      i += 1;
      candidate = `${clean}-${i}`;
    }
  }

  static async listKits(filters?: {
    is_published?: boolean;
    is_featured?: boolean;
    search?: string;
    limit?: number;
  }): Promise<DietKitRow[]> {
    try {
      const supabase = await this.getSupabase();
      const limit = filters?.limit ?? 100;
      let q: any = supabase
        .from("diet_kits")
        .select("*")
        .eq("is_deleted", false)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (typeof filters?.is_published !== "undefined") {
        q = q.eq("is_published", filters.is_published);
      }
      if (typeof filters?.is_featured !== "undefined") {
        q = q.eq("is_featured", filters.is_featured);
      }
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(
          `name_pt.ilike.${s},name_en.ilike.${s},short_desc_pt.ilike.${s}`,
        );
      }

      const { data, error } = await q;
      if (error) return [];
      return (data as DietKitRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async getKit(id: string): Promise<DietKitRow | null> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("diet_kits")
        .select("*")
        .eq("id", id)
        .eq("is_deleted", false)
        .maybeSingle();
      if (error) return null;
      return (data as DietKitRow | null) ?? null;
    } catch {
      return null;
    }
  }

  static async upsertKit(
    input: UpsertDietKitInput,
    createdById?: string,
  ): Promise<DietKitRow | null> {
    try {
      const parsed = upsertDietKitSchema.parse(input);
      const supabase = await this.getSupabase();

      const baseSlug = slugify(parsed.slug || parsed.name_pt);
      const slug = await this.ensureUniqueKitSlug(
        supabase,
        baseSlug,
        parsed.id,
      );

      const payload: Record<string, any> = {
        name_pt: parsed.name_pt,
        name_en: parsed.name_en,
        slug,
        description_pt: parsed.description_pt ?? "",
        description_en: parsed.description_en ?? "",
        short_desc_pt: parsed.short_desc_pt ?? "",
        short_desc_en: parsed.short_desc_en ?? "",
        cover_image_url: parsed.cover_image_url || null,
        goal_pt: parsed.goal_pt ?? null,
        goal_en: parsed.goal_en ?? null,
        tags: parsed.tags ?? [],
        is_published: parsed.is_published,
        is_featured: parsed.is_featured,
      };
      if (!parsed.id && createdById) payload.created_by_id = createdById;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("diet_kits")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("diet_kits").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;

      void AuditLogService.log({
        adminId: createdById,
        action: parsed.id ? "diet_kit.update" : "diet_kit.create",
        entity_type: "diet_kits",
        entity_id: data.id,
        details: { name_pt: parsed.name_pt, slug },
      });

      return data as DietKitRow;
    } catch {
      return null;
    }
  }

  static async deleteKit(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("diet_kits")
        .update({ is_deleted: true } as never)
        .eq("id", id);
      if (error) return false;
      void AuditLogService.log({
        adminId,
        action: "diet_kit.delete",
        entity_type: "diet_kits",
        entity_id: id,
      });
      return true;
    } catch {
      return false;
    }
  }

  static async listKitItems(kitId: string): Promise<DietKitItemWithFood[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("diet_kit_items")
        .select(
          "*, food:diet_foods(id,name_pt,name_en,category_pt,category_en,serving_size,serving_unit,calories_kcal,protein_g,carbs_g,fats_g,image_url,brand)",
        )
        .eq("kit_id", kitId)
        .order("order_index", { ascending: true });
      if (error) return [];
      return (data as DietKitItemWithFood[]) ?? [];
    } catch {
      return [];
    }
  }

  static async listKitItemsForKits(
    kitIds: string[],
  ): Promise<DietKitItemWithFood[]> {
    if (!kitIds.length) return [];
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("diet_kit_items")
        .select(
          "*, food:diet_foods(id,name_pt,name_en,category_pt,category_en,serving_size,serving_unit,calories_kcal,protein_g,carbs_g,fats_g,image_url,brand)",
        )
        .in("kit_id", kitIds)
        .order("order_index", { ascending: true });
      if (error) return [];
      return (data as DietKitItemWithFood[]) ?? [];
    } catch {
      return [];
    }
  }

  static async saveKit(
    input: SaveDietKitInput,
    createdById?: string,
  ): Promise<DietKitRow | null> {
    const parsed = saveDietKitSchema.parse(input);
    const db = await this.getSupabase();
    const slug = await this.ensureUniqueKitSlug(
      db,
      slugify(parsed.kit.slug || parsed.kit.name_pt),
      parsed.kit.id,
    );
    return checked<DietKitRow>(
      await (db.rpc as any)("admin_save_content_kit", {
        p_kind: "diet",
        p_kit: { ...parsed.kit, slug },
        p_items: parsed.items,
        p_actor: createdById,
      }),
      "save diet kit",
    );
  }

  // ---------------------------------------------------------------------
  // VÍNCULO ALUNO × KIT DE DIETA
  // ---------------------------------------------------------------------
  static async listKitAssignments(
    kitIds: string[],
  ): Promise<StudentDietKitRow[]> {
    if (!kitIds.length) return [];
    try {
      const supabase = await this.getSupabase();
      const scope = await staffStudentIds();
      let query: any = supabase
        .from("student_diet_kits")
        .select("*")
        .in("kit_id", kitIds)
        .eq("status", "active");
      if (scope !== null) query = query.in("student_id", scope);
      const { data, error } = await query;
      if (error) return [];
      return (data as StudentDietKitRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async listStudentKits(
    studentId: string,
    status: DietKitAssignmentStatus = "active",
  ): Promise<StudentDietKitWithKit[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("student_diet_kits")
        .select("*, kit:diet_kits(*)")
        .eq("student_id", studentId)
        .eq("status", status)
        .order("assigned_at", { ascending: false });
      if (error) return [];
      return (data as StudentDietKitWithKit[]) ?? [];
    } catch {
      return [];
    }
  }

  static async syncKitStudents(
    input: SyncDietKitStudentsInput,
    assignedById?: string,
  ): Promise<boolean> {
    const parsed = syncDietKitStudentsSchema.parse(input);
    const db = await this.getSupabase();
    checked(
      await (db.rpc as any)("admin_sync_content_assignments", {
        p_kind: "diet",
        p_scope: "kit",
        p_id: parsed.kit_id,
        p_ids: parsed.student_ids,
        p_start: parsed.start_date || null,
        p_end: parsed.end_date || null,
        p_notes: parsed.notes ?? null,
        p_actor: assignedById,
        p_expected: parsed.expected_fingerprint,
      }),
      "sync diet assignments",
    );
    return true;
  }
  static async syncStudentKits(
    input: SyncStudentDietKitsInput,
    assignedById?: string,
  ): Promise<boolean> {
    const parsed = syncStudentDietKitsSchema.parse(input);
    const db = await this.getSupabase();
    checked(
      await (db.rpc as any)("admin_sync_content_assignments", {
        p_kind: "diet",
        p_scope: "student",
        p_id: parsed.student_id,
        p_ids: parsed.kit_ids,
        p_start: parsed.start_date || null,
        p_end: parsed.end_date || null,
        p_notes: parsed.notes ?? null,
        p_actor: assignedById,
        p_expected: parsed.expected_fingerprint,
      }),
      "sync diet assignments",
    );
    return true;
  }
}
