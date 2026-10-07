import { createServiceClientSSR } from "@/lib/supabase/server"

export const AuditLogService = {
  async log(params: {
    userId?: string
    adminId?: string
    action: string
    entity_type?: string
    entity_id?: string | null
    details?: Record<string, unknown>
    ip_address?: string
    user_agent?: string
  }): Promise<boolean> {
    try {
      const supabase = await createServiceClientSSR()
      const ip = params.ip_address ?? null
      const ua = params.user_agent ?? null

      const { error } = await supabase.from("audit_logs").insert({
        user_id: params.userId ?? null,
        admin_id: params.adminId ?? null,
        action: params.action,
        entity_type: params.entity_type ?? null,
        entity_id: params.entity_id ?? null,
        details: (params.details ?? {}) as unknown as Record<string, unknown>,
        ip_address: ip,
        user_agent: ua,
        created_at: new Date().toISOString(),
      } as never)

      if (error) {
        return false
      }
      return true
    } catch {
      return false
    }
  },

  async list(filters: {
    entity_type?: string
    admin_id?: string
    action?: string
    from?: string
    to?: string
    limit?: number
  } = {}) {
    try {
      const supabase = await createServiceClientSSR()
      const limit = filters.limit ?? 100

      let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit)

      if (filters.entity_type) {
        query = query.eq("entity_type", filters.entity_type)
      }
      if (filters.admin_id) {
        query = query.eq("admin_id", filters.admin_id)
      }
      if (filters.action) {
        query = query.eq("action", filters.action)
      }
      if (filters.from) {
        query = query.gte("created_at", filters.from)
      }
      if (filters.to) {
        query = query.lte("created_at", filters.to)
      }

      const { data, error } = await query
      if (error) {
        return [] as any[]
      }
      return (data as any[]) ?? []
    } catch {
      return [] as any[]
    }
  },
}
