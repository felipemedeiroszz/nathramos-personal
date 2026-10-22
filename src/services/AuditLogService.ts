import { createServiceClientSSR } from "@/lib/supabase/server"

export type AuditLogRow = {
  id: number
  user_id: string | null
  admin_id: string | null
  action: string | null
  entity_type: string | null
  entity_id: string | null
  details: unknown
  ip_address: string | null
  user_agent: string | null
  created_at: string
  actor_name: string | null
}

export type AuditLogFilters = {
  entity_type?: string
  action?: string
  admin_id?: string
  q?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/** Mapeia a ação semântica para a operação legada exigida pela tabela. */
function deriveOperation(action: string): "INSERT" | "UPDATE" | "DELETE" {
  const a = action.toLowerCase()
  if (a.includes("delete") || a.includes("remove")) return "DELETE"
  if (a.includes("create") || a.includes("insert") || a.includes("add")) return "INSERT"
  return "UPDATE"
}

function applyFilters(query: any, filters: AuditLogFilters) {
  if (filters.entity_type) query = query.eq("entity_type", filters.entity_type)
  if (filters.action) query = query.eq("action", filters.action)
  if (filters.admin_id) query = query.eq("admin_id", filters.admin_id)
  if (filters.from) query = query.gte("created_at", filters.from)
  if (filters.to) query = query.lte("created_at", filters.to)
  const term = filters.q?.replace(/[%,()]/g, " ").trim()
  if (term) {
    query = query.or(
      `action.ilike.%${term}%,entity_type.ilike.%${term}%,entity_id.ilike.%${term}%`
    )
  }
  return query
}

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
        // Colunas legadas (NOT NULL) exigidas pela tabela
        table_name: params.entity_type ?? "system",
        operation: deriveOperation(params.action),
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

  async list(filters: AuditLogFilters = {}): Promise<AuditLogRow[]> {
    try {
      const supabase = await createServiceClientSSR()
      const limit = filters.limit ?? 100
      const offset = filters.offset ?? 0

      let query = supabase
        .from("audit_logs")
        .select(
          "id, user_id, admin_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at"
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      query = applyFilters(query, filters)

      const { data, error } = await query
      if (error) {
        return []
      }
      return await AuditLogService.attachActors((data as any[]) ?? [])
    } catch {
      return []
    }
  },

  async count(filters: AuditLogFilters = {}): Promise<number> {
    try {
      const supabase = await createServiceClientSSR()
      let query = supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })

      query = applyFilters(query, filters)

      const { count } = await query
      return count ?? 0
    } catch {
      return 0
    }
  },

  /** Valores distintos de uma coluna (para os filtros). */
  async distinctValues(column: "entity_type" | "action"): Promise<string[]> {
    try {
      const supabase = await createServiceClientSSR()
      const { data, error } = await supabase
        .from("audit_logs")
        .select(column)
        .not(column, "is", null)
        .limit(2000)

      if (error) {
        return []
      }
      const set = new Set<string>()
      for (const row of (data as any[]) ?? []) {
        const value = row?.[column]
        if (typeof value === "string" && value) set.add(value)
      }
      return Array.from(set).sort()
    } catch {
      return []
    }
  },

  /** Anexa o nome do responsável (admin ou usuário) a cada registro. */
  async attachActors(rows: any[]): Promise<AuditLogRow[]> {
    const mapped: AuditLogRow[] = rows.map((r) => ({
      id: r.id,
      user_id: r.user_id ?? null,
      admin_id: r.admin_id ?? null,
      action: r.action ?? null,
      entity_type: r.entity_type ?? null,
      entity_id: r.entity_id ?? null,
      details: r.details ?? null,
      ip_address: r.ip_address ?? null,
      user_agent: r.user_agent ?? null,
      created_at: r.created_at,
      actor_name: null,
    }))

    const ids = Array.from(
      new Set(
        mapped
          .flatMap((r) => [r.user_id, r.admin_id])
          .filter((v): v is string => Boolean(v))
      )
    )
    if (ids.length === 0) return mapped

    try {
      const supabase = await createServiceClientSSR()
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids)

      const nameById = new Map<string, string>()
      for (const p of (data as any[]) ?? []) {
        if (p?.id) nameById.set(p.id, p.full_name)
      }

      return mapped.map((r) => ({
        ...r,
        actor_name:
          (r.admin_id ? nameById.get(r.admin_id) : undefined) ??
          (r.user_id ? nameById.get(r.user_id) : undefined) ??
          null,
      }))
    } catch {
      return mapped
    }
  },
}
