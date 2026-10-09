import { createServiceClientSSR } from "../lib/supabase/server"

export interface StudentRow {
  id: string
  full_name: string
  phone: string | null
  country: string | null
  avatar_url: string | null
  role: string
  created_at: string
  is_deleted: boolean
}

export interface StudentWithSubscription extends StudentRow {
  subscription?: {
    id: string
    status: string
    plan_id: string
    plan_name?: string
    current_period_end: string
    provider: string | null
  } | null
}

export class StudentService {
  private static async getSupabase() {
    return createServiceClientSSR()
  }

  static async listStudents(filters?: {
    search?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ students: StudentWithSubscription[]; total: number }> {
    try {
      const supabase = await this.getSupabase()
      const limit = filters?.limit || 50
      const offset = filters?.offset || 0

      let query = supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          phone,
          country,
          avatar_url,
          role,
          created_at,
          is_deleted,
          subscriptions!left(
            id,
            status,
            plan_id,
            current_period_end,
            provider,
            plans!left(name_pt)
          )
        `, { count: "exact" })
        .eq("role", "student")
        .eq("is_deleted", false)

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(`full_name.ilike.${searchTerm}`)
      }

      if (filters?.status) {
        if (filters.status === "active") {
          query = query.in("subscriptions.status", ["trialing", "active", "past_due"])
        } else if (filters.status === "blocked") {
          query = query.eq("subscriptions.status", "blocked")
        } else if (filters.status === "canceled") {
          query = query.eq("subscriptions.status", "canceled")
        }
      }

      query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

      const { data: profilesData, count, error } = await query

      if (error) {
        console.error("Erro ao buscar alunos:", error)
        return { students: [], total: 0 }
      }

      const students: StudentWithSubscription[] = (profilesData as any[]).map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        country: profile.country,
        avatar_url: profile.avatar_url,
        role: profile.role,
        created_at: profile.created_at,
        is_deleted: profile.is_deleted,
        subscription: profile.subscriptions?.[0]
          ? {
              id: profile.subscriptions[0].id,
              status: profile.subscriptions[0].status,
              plan_id: profile.subscriptions[0].plan_id,
              plan_name: profile.subscriptions[0].plans?.name_pt,
              current_period_end: profile.subscriptions[0].current_period_end,
              provider: profile.subscriptions[0].provider,
            }
          : null,
      }))

      return { students, total: count || 0 }
    } catch (error) {
      console.error("Erro ao buscar alunos:", error)
      return { students: [], total: 0 }
    }
  }

  static async getStudentById(id: string): Promise<StudentWithSubscription | null> {
    try {
      const supabase = await this.getSupabase()

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          phone,
          country,
          avatar_url,
          role,
          created_at,
          is_deleted,
          subscriptions!left(
            id,
            status,
            plan_id,
            current_period_end,
            provider,
            plans!left(name_pt)
          )
        `)
        .eq("id", id)
        .eq("role", "student")
        .single()

      if (error || !profileData) return null

      const profile = profileData as any
      return {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        country: profile.country,
        avatar_url: profile.avatar_url,
        role: profile.role,
        created_at: profile.created_at,
        is_deleted: profile.is_deleted,
        subscription: profile.subscriptions?.[0]
          ? {
              id: profile.subscriptions[0].id,
              status: profile.subscriptions[0].status,
              plan_id: profile.subscriptions[0].plan_id,
              plan_name: profile.subscriptions[0].plans?.name_pt,
              current_period_end: profile.subscriptions[0].current_period_end,
              provider: profile.subscriptions[0].provider,
            }
          : null,
      }
    } catch (error) {
      console.error("Erro ao buscar aluno:", error)
      return null
    }
  }
}
