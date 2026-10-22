import { createServiceClientSSR } from "../lib/supabase/server"
import type {
  DifficultyT,
  WorkoutStatusT,
} from "../lib/supabase/types"
import type {
  WorkoutKitRow,
  WorkoutKitItemRow,
  WorkoutKitItemWithSource,
  StudentWorkoutKitRow,
} from "../types"
import { AuditLogService } from "./AuditLogService"
import { NotificationService } from "./NotificationService"
import {
  upsertWorkoutKitSchema,
  upsertWorkoutKitItemSchema,
  assignStudentWorkoutSchema,
  type UpsertWorkoutKitInput,
  type UpsertWorkoutKitItemInput,
  type AssignStudentWorkoutInput,
} from "../schemas/workouts"

export class WorkoutKitService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  static async listKits(filters?: {
    category_id?: string
    is_published?: boolean
    is_featured?: boolean
    difficulty?: DifficultyT
    search?: string
    limit?: number
  }): Promise<WorkoutKitRow[]> {
    try {
      const supabase = await this.getSupabase()
      const limit = filters?.limit ?? 100
      let q: any = supabase
        .from("workout_kits")
        .select("*")
        .eq("is_deleted", false)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit)

      if (filters?.category_id) q = q.eq("category_id", filters.category_id)
      if (typeof filters?.is_published !== "undefined") q = q.eq("is_published", filters.is_published)
      if (typeof filters?.is_featured !== "undefined") q = q.eq("is_featured", filters.is_featured)
      if (filters?.difficulty) q = q.eq("difficulty", filters.difficulty)
      if (filters?.search) {
        const s = `%${filters.search}%`
        q = q.or(`name_pt.ilike.${s},name_en.ilike.${s},short_desc_pt.ilike.${s},short_desc_en.ilike.${s}`)
      }

      const { data, error } = await q
      if (error) return []
      return (data as WorkoutKitRow[]) ?? []
    } catch {
      return []
    }
  }

  static async getKit(id: string): Promise<WorkoutKitRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("workout_kits")
        .select("*")
        .eq("id", id)
        .eq("is_deleted", false)
        .maybeSingle()
      if (error) return null
      return (data as WorkoutKitRow | null) ?? null
    } catch {
      return null
    }
  }

  static async upsertKit(
    input: UpsertWorkoutKitInput,
    createdById?: string
  ): Promise<WorkoutKitRow | null> {
    try {
      const parsed = upsertWorkoutKitSchema.parse(input)
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...parsed }
      if (!parsed.id && createdById) payload.created_by_id = createdById
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase.from("workout_kits").update(payload as never).eq("id", parsed.id)
      } else {
        q = supabase.from("workout_kits").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId: createdById,
        action: parsed.id ? "workout_kit.update" : "workout_kit.create",
        entity_type: "workout_kits",
        entity_id: data.id,
        details: { name_pt: parsed.name_pt, slug: parsed.slug },
      })

      return data as WorkoutKitRow
    } catch {
      return null
    }
  }

  static async deleteKit(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("workout_kits")
        .update({ is_deleted: true } as never)
        .eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "workout_kit.delete",
        entity_type: "workout_kits",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  static async listKitItemsForKits(kitIds: string[]): Promise<WorkoutKitItemWithSource[]> {
    if (!kitIds.length) return []
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("workout_kit_items")
        .select("*, program:workout_programs(*), exercise:exercises(*)")
        .in("kit_id", kitIds)
        .order("order_index", { ascending: true })
      if (error) return []
      return (data as WorkoutKitItemWithSource[]) ?? []
    } catch {
      return []
    }
  }

  static async upsertKitItem(input: UpsertWorkoutKitItemInput): Promise<WorkoutKitItemRow | null> {
    try {
      const parsed = upsertWorkoutKitItemSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, any> = {
        kit_id: parsed.kit_id,
        program_id: parsed.program_id ?? null,
        exercise_id: parsed.exercise_id ?? null,
        category_label: parsed.category_label ?? null,
        day_of_week: parsed.day_of_week ?? null,
        order_index: parsed.order_index,
        notes_pt: parsed.notes_pt ?? null,
        notes_en: parsed.notes_en ?? null,
      }

      let q: any
      if (parsed.id) {
        q = supabase.from("workout_kit_items").update(payload as never).eq("id", parsed.id)
      } else {
        q = supabase.from("workout_kit_items").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null
      return data as WorkoutKitItemRow
    } catch {
      return null
    }
  }

  static async removeKitItem(itemId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("workout_kit_items")
        .delete()
        .eq("id", itemId)
      if (error) return false
      return true
    } catch {
      return false
    }
  }

  static async reorderKitItems(kitId: string, items: { id: string; order_index: number }[]): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      for (const it of items) {
        await supabase
          .from("workout_kit_items")
          .update({ order_index: it.order_index } as never)
          .eq("id", it.id)
          .eq("kit_id", kitId)
      }
      return true
    } catch {
      return false
    }
  }

  static async assignToStudent(
    input: AssignStudentWorkoutInput,
    assignedById: string
  ): Promise<StudentWorkoutKitRow> {
    const parsed = assignStudentWorkoutSchema.parse(input)
    const supabase = await this.getSupabase()

    const rpc = await supabase
      .rpc("can_assign_workout_kit" as any, {
        p_student_id: parsed.student_id,
        p_extra_assignments: 1,
      } as any)
      .maybeSingle()

    const allowed = (rpc.data as any)?.allowed === true

    if (!allowed) {
      const reason = (rpc.data as any)?.reason ?? "not_allowed"
      const max = (rpc.data as any)?.max_allowed ?? 0
      const cur = (rpc.data as any)?.current_active ?? 0
      throw new Error(`Limite de treinos ativos excedido: ${cur+1}/${max}.` + ` Motivo: ${reason}`)
    }

    const insertPayload: Record<string, any> = {
      student_id: parsed.student_id,
      kit_id: parsed.kit_id ?? null,
      program_id: parsed.program_id ?? null,
      assigned_by_id: assignedById,
      start_date: parsed.start_date,
      end_date: parsed.end_date ?? null,
      status: "active" as WorkoutStatusT,
      notes: parsed.notes ?? null,
      assigned_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("student_workout_kits")
      .insert(insertPayload as never)
      .select()
      .single()

    if (error || !data) {
      throw new Error("Falha ao atribuir treino ao aluno.")
    }

    const inserted = data as StudentWorkoutKitRow

    void AuditLogService.log({
      adminId: assignedById,
      action: "workout_kit.assign",
      entity_type: "student_workout_kits",
      entity_id: inserted.id,
      details: {
        student_id: parsed.student_id,
        kit_id: parsed.kit_id ?? null,
        program_id: parsed.program_id ?? null,
      },
    })

    void NotificationService.sendInApp(parsed.student_id, {
      type: "workout",
      title_pt: "Novo treino atribuído",
      title_en: "New workout assigned",
      body_pt: "Personal Nath atribuiu um novo treino para você.",
      body_en: "Coach Nath assigned you a new workout.",
      url: "/treino",
    })

    return inserted
  }

  static async unassign(swkId: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("student_workout_kits")
        .update({ status: "archived" } as never)
        .eq("id", swkId)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "workout_kit.unassign",
        entity_type: "student_workout_kits",
        entity_id: swkId,
      })
      return true
    } catch {
      return false
    }
  }

  static async listStudentAssignments(
    studentId: string,
    status?: WorkoutStatusT
  ): Promise<StudentWorkoutKitRow[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("student_workout_kits")
        .select(`
          *,
          kit:workout_kits(*),
          program:workout_programs(*)
        `)
        .eq("student_id", studentId)
        .order("assigned_at", { ascending: false })
      if (status) q = q.eq("status", status)
      const { data, error } = await q
      if (error) return []
      return (data as StudentWorkoutKitRow[]) ?? []
    } catch {
      return []
    }
  }
}
