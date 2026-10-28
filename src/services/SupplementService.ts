import { staffStudentIds } from "@/lib/auth/platform";
import { checked } from "./StudentRoutineService";
import { createServiceClientSSR } from "../lib/supabase/server";
import type {
  StudentSupplementKitRow,
  StudentSupplementKitWithKit,
  SupplementKitAssignmentStatus,
  SupplementKitItemWithSupplement,
  SupplementKitRow,
  SupplementRow,
  UserSupplementRow,
} from "../types";
import { AuditLogService } from "./AuditLogService";
import {
  saveSupplementKitSchema,
  syncStudentSupplementKitsSchema,
  syncSupplementKitStudentsSchema,
  upsertSupplementKitItemSchema,
  upsertSupplementKitSchema,
  upsertSupplementSchema,
  upsertUserSupplementSchema,
  type SaveSupplementKitInput,
  type SyncStudentSupplementKitsInput,
  type SyncSupplementKitStudentsInput,
  type UpsertSupplementInput,
  type UpsertSupplementKitInput,
  type UpsertSupplementKitItemInput,
  type UpsertUserSupplementInput,
} from "../schemas/supplements";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export class SupplementService {
  private static async getSupabase() {
    return createServiceClientSSR();
  }

  // ---------------------------------------------------------------------
  // SUPPLEMENTS
  // ---------------------------------------------------------------------
  static async listSupplements(filters?: {
    is_active?: boolean;
    search?: string;
    category?: string;
    limit?: number;
  }): Promise<SupplementRow[]> {
    try {
      const supabase = await this.getSupabase();
      const limit = filters?.limit ?? 100;
      let q: any = supabase
        .from("supplements")
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
      return (data as SupplementRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async getSupplement(id: string): Promise<SupplementRow | null> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("supplements")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) return null;
      return (data as SupplementRow | null) ?? null;
    } catch {
      return null;
    }
  }

  static async upsertSupplement(
    input: UpsertSupplementInput,
    createdById?: string,
  ): Promise<SupplementRow | null> {
    try {
      const parsed = upsertSupplementSchema.parse(input);
      const supabase = await this.getSupabase();
      const payload: Record<string, any> = { ...parsed };
      if (!parsed.id && createdById) payload.created_by_id = createdById;
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("supplements")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("supplements").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;

      void AuditLogService.log({
        adminId: createdById,
        action: parsed.id ? "supplement.update" : "supplement.create",
        entity_type: "supplements",
        entity_id: data.id,
        details: { name_pt: parsed.name_pt, name_en: parsed.name_en },
      });

      return data as SupplementRow;
    } catch {
      return null;
    }
  }

  static async deleteSupplement(
    id: string,
    adminId?: string,
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("supplements")
        .update({ is_active: false } as never)
        .eq("id", id);
      if (error) return false;
      void AuditLogService.log({
        adminId,
        action: "supplement.delete",
        entity_type: "supplements",
        entity_id: id,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // USER SUPPLEMENTS
  // ---------------------------------------------------------------------
  static async listUserSupplements(
    userId: string,
  ): Promise<UserSupplementRow[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("user_supplements")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data as UserSupplementRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async upsertUserSupplement(
    input: UpsertUserSupplementInput,
    assignedById?: string,
  ): Promise<UserSupplementRow | null> {
    try {
      const parsed = upsertUserSupplementSchema.parse(input);
      const supabase = await this.getSupabase();
      const payload: Record<string, any> = { ...parsed };
      if (assignedById) payload.assigned_by_id = assignedById;
      delete payload.id;

      let q: any;
      if (parsed.id) {
        q = supabase
          .from("user_supplements")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("user_supplements").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;
      return data as UserSupplementRow;
    } catch {
      return null;
    }
  }

  static async deleteUserSupplement(id: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("user_supplements")
        .delete()
        .eq("id", id);
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // SUPPLEMENT KITS
  // ---------------------------------------------------------------------
  private static async ensureUniqueSlug(
    supabase: any,
    base: string,
    excludeId?: string,
  ): Promise<string> {
    const clean = base || "kit";
    let candidate = clean;
    let i = 1;
    for (;;) {
      const { data } = await supabase
        .from("supplement_kits")
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
  }): Promise<SupplementKitRow[]> {
    try {
      const supabase = await this.getSupabase();
      const limit = filters?.limit ?? 100;
      let q: any = supabase
        .from("supplement_kits")
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
      return (data as SupplementKitRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async getKit(id: string): Promise<SupplementKitRow | null> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("supplement_kits")
        .select("*")
        .eq("id", id)
        .eq("is_deleted", false)
        .maybeSingle();
      if (error) return null;
      return (data as SupplementKitRow | null) ?? null;
    } catch {
      return null;
    }
  }

  static async upsertKit(
    input: UpsertSupplementKitInput,
    createdById?: string,
  ): Promise<SupplementKitRow | null> {
    try {
      const parsed = upsertSupplementKitSchema.parse(input);
      const supabase = await this.getSupabase();

      const baseSlug = slugify(parsed.slug || parsed.name_pt);
      const slug = await this.ensureUniqueSlug(supabase, baseSlug, parsed.id);

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
          .from("supplement_kits")
          .update(payload as never)
          .eq("id", parsed.id);
      } else {
        q = supabase.from("supplement_kits").insert(payload as never);
      }

      const { data, error } = await q.select().single();
      if (error || !data) return null;

      void AuditLogService.log({
        adminId: createdById,
        action: parsed.id ? "supplement_kit.update" : "supplement_kit.create",
        entity_type: "supplement_kits",
        entity_id: data.id,
        details: { name_pt: parsed.name_pt, slug },
      });

      return data as SupplementKitRow;
    } catch {
      return null;
    }
  }

  static async deleteKit(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("supplement_kits")
        .update({ is_deleted: true } as never)
        .eq("id", id);
      if (error) return false;
      void AuditLogService.log({
        adminId,
        action: "supplement_kit.delete",
        entity_type: "supplement_kits",
        entity_id: id,
      });
      return true;
    } catch {
      return false;
    }
  }

  static async listKitItems(
    kitId: string,
  ): Promise<SupplementKitItemWithSupplement[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("supplement_kit_items")
        .select(
          "*, supplement:supplements(id,name_pt,name_en,category_pt,category_en,serving_size,serving_unit,image_url,brand)",
        )
        .eq("kit_id", kitId)
        .order("order_index", { ascending: true });
      if (error) return [];
      return (data as SupplementKitItemWithSupplement[]) ?? [];
    } catch {
      return [];
    }
  }

  static async listKitItemsForKits(
    kitIds: string[],
  ): Promise<SupplementKitItemWithSupplement[]> {
    if (!kitIds.length) return [];
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("supplement_kit_items")
        .select(
          "*, supplement:supplements(id,name_pt,name_en,category_pt,category_en,serving_size,serving_unit,image_url,brand)",
        )
        .in("kit_id", kitIds)
        .order("order_index", { ascending: true });
      if (error) return [];
      return (data as SupplementKitItemWithSupplement[]) ?? [];
    } catch {
      return [];
    }
  }

  static async upsertKitItem(
    kitId: string,
    input: UpsertSupplementKitItemInput,
  ): Promise<boolean> {
    try {
      const parsed = upsertSupplementKitItemSchema.parse(input);
      const supabase = await this.getSupabase();
      const payload: Record<string, any> = {
        kit_id: kitId,
        supplement_id: parsed.supplement_id,
        dosage: parsed.dosage ?? null,
        dosage_unit: parsed.dosage_unit ?? null,
        frequency_per_day: parsed.frequency_per_day,
        times_of_day: parsed.times_of_day,
        notes_pt: parsed.notes_pt ?? null,
        notes_en: parsed.notes_en ?? null,
        order_index: parsed.order_index,
      };
      const { error } = await supabase
        .from("supplement_kit_items")
        .insert(payload as never);
      return !error;
    } catch {
      return false;
    }
  }

  static async removeKitItem(itemId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from("supplement_kit_items")
        .delete()
        .eq("id", itemId);
      return !error;
    } catch {
      return false;
    }
  }

  static async saveKit(
    input: SaveSupplementKitInput,
    createdById?: string,
  ): Promise<SupplementKitRow | null> {
    const parsed = saveSupplementKitSchema.parse(input);
    const db = await this.getSupabase();
    const slug = await this.ensureUniqueSlug(
      db,
      slugify(parsed.kit.slug || parsed.kit.name_pt),
      parsed.kit.id,
    );
    return checked<SupplementKitRow>(
      await (db.rpc as any)("admin_save_content_kit", {
        p_kind: "supplement",
        p_kit: { ...parsed.kit, slug },
        p_items: parsed.items,
        p_actor: createdById,
      }),
      "save supplement kit",
    );
  }

  // ---------------------------------------------------------------------
  // VÍNCULO ALUNO × KIT DE SUPLEMENTOS
  // ---------------------------------------------------------------------
  static async listKitAssignments(
    kitIds: string[],
  ): Promise<StudentSupplementKitRow[]> {
    if (!kitIds.length) return [];
    try {
      const supabase = await this.getSupabase();
      const scope = await staffStudentIds();
      let query: any = supabase
        .from("student_supplement_kits")
        .select("*")
        .in("kit_id", kitIds)
        .eq("status", "active");
      if (scope !== null) query = query.in("student_id", scope);
      const { data, error } = await query;
      if (error) return [];
      return (data as StudentSupplementKitRow[]) ?? [];
    } catch {
      return [];
    }
  }

  static async listStudentKits(
    studentId: string,
    status: SupplementKitAssignmentStatus = "active",
  ): Promise<StudentSupplementKitWithKit[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from("student_supplement_kits")
        .select("*, kit:supplement_kits(*)")
        .eq("student_id", studentId)
        .eq("status", status)
        .order("assigned_at", { ascending: false });
      if (error) return [];
      return (data as StudentSupplementKitWithKit[]) ?? [];
    } catch {
      return [];
    }
  }

  static async syncKitStudents(
    input: SyncSupplementKitStudentsInput,
    assignedById?: string,
  ): Promise<boolean> {
    const parsed = syncSupplementKitStudentsSchema.parse(input);
    const db = await this.getSupabase();
    checked(
      await (db.rpc as any)("admin_sync_content_assignments", {
        p_kind: "supplement",
        p_scope: "kit",
        p_id: parsed.kit_id,
        p_ids: parsed.student_ids,
        p_start: parsed.start_date || null,
        p_end: parsed.end_date || null,
        p_notes: parsed.notes ?? null,
        p_actor: assignedById,
        p_expected: parsed.expected_fingerprint,
      }),
      "sync supplement assignments",
    );
    return true;
  }
  static async syncStudentKits(
    input: SyncStudentSupplementKitsInput,
    assignedById?: string,
  ): Promise<boolean> {
    const parsed = syncStudentSupplementKitsSchema.parse(input);
    const db = await this.getSupabase();
    checked(
      await (db.rpc as any)("admin_sync_content_assignments", {
        p_kind: "supplement",
        p_scope: "student",
        p_id: parsed.student_id,
        p_ids: parsed.kit_ids,
        p_start: parsed.start_date || null,
        p_end: parsed.end_date || null,
        p_notes: parsed.notes ?? null,
        p_actor: assignedById,
        p_expected: parsed.expected_fingerprint,
      }),
      "sync supplement assignments",
    );
    return true;
  }
}
