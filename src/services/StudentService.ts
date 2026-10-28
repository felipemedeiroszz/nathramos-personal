import {
  requirePlatformUser,
  requireManagedStudent,
} from "@/lib/auth/platform";
import { createServiceClientSSR } from "../lib/supabase/server";

export interface StudentRow {
  id: string;
  email?: string | null;
  full_name: string;
  phone: string | null;
  country: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  is_deleted: boolean;
}

export interface StudentWithSubscription extends StudentRow {
  subscription?: {
    id: string;
    status: string;
    plan_id: string;
    plan_name?: string;
    current_period_end: string;
    provider: string | null;
  } | null;
}

export class StudentService {
  private static async getSupabase() {
    return createServiceClientSSR();
  }

  static async listStudents(filters?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
    locale?: string;
  }): Promise<{
    students: StudentWithSubscription[];
    total: number;
    page: number;
  }> {
    const actor = await requirePlatformUser();
    if (!actor.staff) throw new Error("Acesso negado.");
    const db = await this.getSupabase();
    const { data, error } = await (db.rpc as any)("admin_student_directory", {
      p_actor: actor.userId,
      p_search: (filters?.search || "").trim().slice(0, 200),
      p_status: filters?.status || "",
      p_limit: Math.max(1, Math.min(100, Math.trunc(filters?.limit || 20))),
      p_offset: Math.max(0, Math.trunc(filters?.offset || 0)),
      p_locale: filters?.locale || "pt-BR",
    });
    if (error || !data) {
      console.error("[StudentService] directory", error);
      throw new Error("Não foi possível carregar os alunos.");
    }
    return data as {
      students: StudentWithSubscription[];
      total: number;
      page: number;
    };
  }

  static async getStudentById(
    id: string,
  ): Promise<StudentWithSubscription | null> {
    await requireManagedStudent(id);
    try {
      const supabase = await this.getSupabase();

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select(
          `
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
        `,
        )
        .eq("id", id)
        .eq("role", "student")
        .single();

      if (error || !profileData) return null;

      const profile = profileData as any;
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
      };
    } catch (error) {
      console.error("Erro ao buscar aluno:", error);
      return null;
    }
  }
}
