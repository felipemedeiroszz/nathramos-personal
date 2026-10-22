import { createServiceClientSSR } from "../lib/supabase/server"
import type {
  ExamCategoryRow,
  ExamRow,
} from "../types"
import { AuditLogService } from "./AuditLogService"
import {
  reviewExamSchema,
  upsertExamCategorySchema,
  upsertExamSchema,
  type ReviewExamInput,
  type UpsertExamCategoryInput,
  type UpsertExamInput,
} from "../schemas/exams"

export const EXAM_FILES_BUCKET = "exam-files"

export class ExamService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  // ---------------------------------------------------------------------
  // EXAM CATEGORIES
  // ---------------------------------------------------------------------
  static async listCategories(): Promise<ExamCategoryRow[]> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("exam_categories")
        .select("*")
        .order("order_index", { ascending: true })
      if (error) return []
      return (data as ExamCategoryRow[]) ?? []
    } catch {
      return []
    }
  }

  static async upsertCategory(
    input: UpsertExamCategoryInput,
    adminId?: string
  ): Promise<ExamCategoryRow | null> {
    try {
      const parsed = upsertExamCategorySchema.parse(input)
      const supabase = await this.getSupabase()
      const payload: Record<string, any> = { ...parsed }
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase
          .from("exam_categories")
          .update(payload as never)
          .eq("id", parsed.id)
      } else {
        q = supabase.from("exam_categories").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId,
        action: parsed.id ? "exam_category.update" : "exam_category.create",
        entity_type: "exam_categories",
        entity_id: data.id,
        details: { name_pt: parsed.name_pt, name_en: parsed.name_en },
      })

      return data as ExamCategoryRow
    } catch {
      return null
    }
  }

  static async deleteCategory(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("exam_categories").delete().eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "exam_category.delete",
        entity_type: "exam_categories",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // EXAMS
  // ---------------------------------------------------------------------
  static async listExams(filters?: {
    user_id?: string
    category_id?: string
    search?: string
    limit?: number
    only_active?: boolean
  }): Promise<ExamRow[]> {
    try {
      const supabase = await this.getSupabase()
      const limit = filters?.limit ?? 100
      let q: any = supabase
        .from("exams")
        .select("*")
        .order("exam_date", { ascending: false })
        .limit(limit)

      if (filters?.only_active) q = q.eq("is_deleted", false)
      if (filters?.user_id) q = q.eq("user_id", filters.user_id)
      if (filters?.category_id) q = q.eq("category_id", filters.category_id)
      if (filters?.search) {
        const s = `%${filters.search}%`
        q = q.or(`title.ilike.${s},description.ilike.${s}`)
      }

      const { data, error } = await q
      if (error) return []
      return (data as ExamRow[]) ?? []
    } catch {
      return []
    }
  }

  static async getExam(id: string): Promise<ExamRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (error) return null
      return (data as ExamRow | null) ?? null
    } catch {
      return null
    }
  }

  static async upsertExam(
    input: UpsertExamInput,
    userId: string,
    adminId?: string
  ): Promise<ExamRow | null> {
    try {
      const parsed = upsertExamSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, any> = { ...parsed }
      payload.user_id = userId
      delete payload.id

      let q: any
      if (parsed.id) {
        q = supabase
          .from("exams")
          .update(payload as never)
          .eq("id", parsed.id)
      } else {
        q = supabase.from("exams").insert(payload as never)
      }

      const { data, error } = await q.select().single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId: adminId ?? userId,
        action: parsed.id ? "exam.update" : "exam.create",
        entity_type: "exams",
        entity_id: data.id,
        details: { title: parsed.title, exam_date: parsed.exam_date },
      })

      return data as ExamRow
    } catch {
      return null
    }
  }

  static async deleteExam(id: string, adminId?: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from("exams")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() } as never)
        .eq("id", id)
      if (error) return false
      void AuditLogService.log({
        adminId,
        action: "exam.delete",
        entity_type: "exams",
        entity_id: id,
      })
      return true
    } catch {
      return false
    }
  }

  // ---------------------------------------------------------------------
  // REVIEW (parecer do professor)
  // ---------------------------------------------------------------------
  static async reviewExam(
    input: ReviewExamInput,
    reviewerId: string
  ): Promise<ExamRow | null> {
    try {
      const parsed = reviewExamSchema.parse(input)
      const supabase = await this.getSupabase()

      const feedback = parsed.coach_feedback?.trim() || null
      const payload: Record<string, any> = {
        coach_feedback: feedback,
        reviewed_by_id: feedback ? reviewerId : null,
        reviewed_at: feedback ? new Date().toISOString() : null,
      }

      const { data, error } = await supabase
        .from("exams")
        .update(payload as never)
        .eq("id", parsed.id)
        .select()
        .single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId: reviewerId,
        action: feedback ? "exam.review" : "exam.review.clear",
        entity_type: "exams",
        entity_id: parsed.id,
      })

      return data as ExamRow
    } catch {
      return null
    }
  }

  // ---------------------------------------------------------------------
  // ARQUIVOS
  // ---------------------------------------------------------------------
  static async getSignedUrl(
    path: string,
    expiresInSeconds = 3600
  ): Promise<string | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase.storage
        .from(EXAM_FILES_BUCKET)
        .createSignedUrl(path, expiresInSeconds)
      if (error || !data) return null
      return data.signedUrl
    } catch {
      return null
    }
  }

  static async uploadFile(
    path: string,
    file: File
  ): Promise<{ path: string } | null> {
    try {
      const supabase = await this.getSupabase()
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error } = await supabase.storage
        .from(EXAM_FILES_BUCKET)
        .upload(path, buffer, {
          contentType: file.type || "application/pdf",
          upsert: false,
        })
      if (error) return null
      return { path }
    } catch {
      return null
    }
  }

  static async removeFile(path: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.storage.from(EXAM_FILES_BUCKET).remove([path])
      return !error
    } catch {
      return false
    }
  }
}
