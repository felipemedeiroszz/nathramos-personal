"use server"

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import type {
  ProfileRow, PlanRow, SubscriptionRow, PaymentRow, ExerciseRow,
  WorkoutProgramRow, NotificationRow, CanAccessResult, WebhookEventRow,
} from "./types"

export interface DatabasePublicSchema {
  profiles: { Row: ProfileRow; Insert: Omit<ProfileRow, "id" | "created_at" | "updated_at">; Update: Partial<ProfileRow> }
  plans: { Row: PlanRow; Insert: Omit<PlanRow, "id" | "created_at" | "updated_at">; Update: Partial<PlanRow> }
  subscriptions: { Row: SubscriptionRow; Insert: Omit<SubscriptionRow, "id" | "created_at" | "updated_at">; Update: Partial<SubscriptionRow> }
  payments: { Row: PaymentRow; Insert: Omit<PaymentRow, "id" | "created_at" | "updated_at" | "net_amount_cents">; Update: Partial<PaymentRow> }
  webhook_events: { Row: WebhookEventRow; Insert: Omit<WebhookEventRow, "id" | "created_at">; Update: Partial<WebhookEventRow> }
  exercises: { Row: ExerciseRow; Insert: Omit<ExerciseRow, "id" | "created_at" | "updated_at">; Update: Partial<ExerciseRow> }
  workout_programs: { Row: WorkoutProgramRow; Insert: Omit<WorkoutProgramRow, "id" | "created_at" | "updated_at">; Update: Partial<WorkoutProgramRow> }
  notifications: { Row: NotificationRow; Insert: Omit<NotificationRow, "id" | "created_at">; Update: Partial<NotificationRow> }
  can_access_platform: { Args: { p_user_id: string }; Returns: CanAccessResult[] }
}

export interface DatabaseSchema {
  public: DatabasePublicSchema
}

const getEnv = (key: string, required = false) => {
  const value = process.env[key]
  if (required && (!value || value.length === 0)) {
    throw new Error(`[supabase/server] Missing required env: ${key}`)
  }
  return value ?? ""
}

export async function createClientSSR() {
  const cookieStore = await cookies();
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL", true)
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", true)
  return createServerClient<DatabaseSchema>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions)
          }
        } catch {
          /*
            The `setAll` method is called from a Server Component.
            This can be ignored if you have middleware refreshing user sessions.
          */
        }
      },
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

export async function createServiceClientSSR() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL", true)
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", true)
  return createServerClient<DatabaseSchema>(url, serviceKey, {
    cookies: {
      getAll() { return [] },
      setAll() { /* service role does not use cookies */ },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
