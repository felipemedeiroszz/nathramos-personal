import { createServiceClientSSR } from "../lib/supabase/server"
import type { PlanRow } from "../lib/supabase/types"
import { AuditLogService } from "./AuditLogService"
import { upsertPlanSchema, type UpsertPlanInput } from "../schemas/plans"

export class PlanService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  /** Recursos liberados para o plano único (acesso a tudo). */
  private static readonly FULL_ACCESS = {
    max_active_workouts: 9999,
    max_exam_files_month: 9999,
    video_meetings_month: 9999,
    include_meal_plan: true,
    include_supplements: true,
    include_hydration: true,
    include_sleep: true,
    include_exams: true,
    include_ebooks: true,
    chat_support: true,
    custom_exercises: true,
    coach_direct_access: true,
    has_referral_reward: true,
  }

  static async list(opts?: { includeInactive?: boolean }): Promise<PlanRow[]> {
    try {
      const supabase = await this.getSupabase()
      let q: any = supabase
        .from("plans")
        .select("*")
        .eq("is_deleted", false)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true })

      if (!opts?.includeInactive) {
        q = q.eq("is_active", true)
      }

      const { data, error } = await q
      if (error) return []
      return (data as PlanRow[]) ?? []
    } catch {
      return []
    }
  }

  /** Retorna o plano único (o primeiro plano não excluído). */
  static async getPrimary(): Promise<PlanRow | null> {
    const plans = await this.list({ includeInactive: true })
    return plans[0] ?? null
  }

  static async getById(id: string): Promise<PlanRow | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("id", id)
        .eq("is_deleted", false)
        .maybeSingle()
      if (error) return null
      return (data as PlanRow | null) ?? null
    } catch {
      return null
    }
  }

  static async upsert(
    input: UpsertPlanInput,
    adminId?: string
  ): Promise<PlanRow | null> {
    try {
      const parsed = upsertPlanSchema.parse(input)
      const supabase = await this.getSupabase()

      const payload: Record<string, any> = {
        name_pt: parsed.name_pt,
        name_en: parsed.name_en,
        description_pt: parsed.description_pt ?? "",
        description_en: parsed.description_en ?? "",
        slug: parsed.slug,
        price_cents: parsed.price_cents,
        currency: parsed.currency,
        billing_cycle_days: parsed.billing_cycle_days,
        trial_days: parsed.trial_days,
        grace_days: parsed.grace_days,
        stripe_price_id: parsed.stripe_price_id ?? null,
        stripe_product_id: parsed.stripe_product_id ?? null,
        asaas_plan_id: parsed.asaas_plan_id ?? null,
        max_active_workouts: parsed.max_active_workouts,
        max_exam_files_month: parsed.max_exam_files_month,
        include_meal_plan: parsed.include_meal_plan,
        include_supplements: parsed.include_supplements,
        include_hydration: parsed.include_hydration,
        include_sleep: parsed.include_sleep,
        include_exams: parsed.include_exams,
        include_ebooks: parsed.include_ebooks,
        chat_support: parsed.chat_support,
        custom_exercises: parsed.custom_exercises,
        coach_direct_access: parsed.coach_direct_access,
        has_referral_reward: parsed.has_referral_reward,
        video_meetings_month: parsed.video_meetings_month,
        referral_discount_pct: parsed.referral_discount_pct,
        highlight_hex: parsed.highlight_hex ?? null,
        badge_pt: parsed.badge_pt ?? null,
        badge_en: parsed.badge_en ?? null,
        is_active: parsed.is_active,
      }

      if (parsed.id) {
        const { data, error } = await supabase
          .from("plans")
          .update(payload as never)
          .eq("id", parsed.id)
          .select()
          .single()
        if (error || !data) return null

        void AuditLogService.log({
          adminId,
          action: "plan.update",
          entity_type: "plan",
          entity_id: (data as PlanRow).id,
          details: { name: parsed.name_pt, price_cents: parsed.price_cents },
        })
        return data as PlanRow
      }

      const { data: last } = await supabase
        .from("plans")
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle()
      payload.order_index = ((last as { order_index?: number } | null)?.order_index ?? -1) + 1

      const { data, error } = await supabase
        .from("plans")
        .insert(payload as never)
        .select()
        .single()
      if (error || !data) return null

      void AuditLogService.log({
        adminId,
        action: "plan.create",
        entity_type: "plan",
        entity_id: (data as PlanRow).id,
        details: { name: parsed.name_pt, price_cents: parsed.price_cents },
      })
      return data as PlanRow
    } catch {
      return null
    }
  }

  /**
   * Salva o plano único: cria caso ainda não exista e libera acesso total
   * a todos os recursos do sistema.
   */
  static async savePrimary(
    input: UpsertPlanInput,
    adminId?: string
  ): Promise<PlanRow | null> {
    const existing = await this.getPrimary()
    return this.upsert(
      {
        ...input,
        id: existing?.id,
        ...this.FULL_ACCESS,
        referral_discount_pct: existing?.referral_discount_pct ?? 0,
        // IDs de integração são configurados via .env e não são editados no painel
        stripe_price_id: existing?.stripe_price_id ?? null,
        stripe_product_id: existing?.stripe_product_id ?? null,
        asaas_plan_id: existing?.asaas_plan_id ?? null,
      },
      adminId
    )
  }
}

export default PlanService
