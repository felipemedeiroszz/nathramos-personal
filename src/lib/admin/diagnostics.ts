import "server-only";
import { databaseFailureKind } from "@/lib/supabase/errors";
export interface DatabaseCheck {
  id: string;
  label: string;
  migration?: string;
  ok: boolean;
  code?: string;
  kind?: string;
}
const migrations = {
  catalog: "000042_financial_canonical_reporting.sql",
  students: "000030_coach_scope.sql",
  reports: "000042_financial_canonical_reporting.sql",
  queue: "000031_admin_work_queue.sql",
  billing: "000041_payment_integrity.sql",
};
/** All probes are SELECTs or read-only RPCs; a missing object never becomes a fake zero. */
export async function checkAdminDatabase(db: any, actorId: string) {
  const date = new Date().toISOString().slice(0, 10);
  const checks: Array<{
    id: string;
    label: string;
    migration?: string;
    run: () => any;
  }> = [
    {
      id: "manual_payment_provider",
      label: "Tipo de pagamento manual",
      migration: "000044_manual_payment_types.sql",
      run: () =>
        db.from("payments").select("id").eq("provider", "manual").limit(0),
    },
    {
      id: "manual_payment_method",
      label: "Forma de pagamento em dinheiro",
      migration: "000044_manual_payment_types.sql",
      run: () => db.from("payments").select("id").eq("method", "cash").limit(0),
    },

    {
      id: "monthly_progress",
      label: "Evolução mensal: peso e quatro fotos",
      migration: "000063_monthly_progress.sql",
      run: () =>
        db
          .from("student_monthly_progress")
          .select("user_id,month,weight_kg,photos,version")
          .limit(0),
    },
    {
      id: "music_favorites",
      label: "Favoritas de músicas",
      migration: "000062_community_music_favorites.sql",
      run: () =>
        db.rpc("community_music_favorite", {
          p_actor: actorId,
          p_action: "read",
          p_track: {},
        }),
    },
    {
      id: "post_music",
      label: "Música nas publicações",
      migration: "000061_community_music.sql",
      run: () => db.from("community_posts").select("music_track_id").limit(0),
    },
    {
      id: "story_music",
      label: "Música nos stories",
      migration: "000061_community_music.sql",
      run: () => db.from("community_stories").select("music_track_id").limit(0),
    },
    {
      id: "story_text_size",
      label: "Tamanho do texto e emojis nos stories",
      migration: "000060_story_text_size.sql",
      run: () => db.from("community_stories").select("text_scale").limit(0),
    },
    {
      id: "story_text_drag",
      label: "Posição livre do texto nos stories",
      migration: "000059_story_text_drag.sql",
      run: () => db.from("community_stories").select("text_x,text_y").limit(0),
    },
    {
      id: "community_stories",
      label: "Stories de 24 horas",
      migration: "000058_community_stories.sql",
      run: () => db.rpc("community_story_read", { p_actor: actorId }),
    },
    {
      id: "community",
      label: "Comunidade interna",
      migration: "000055_community.sql",
      run: () =>
        db.rpc("community_read", {
          p_actor: actorId,
          p_filter: { admin: true, limit: 1 },
        }),
    },
    {
      id: "daily_prescriptions",
      label: "Prescrição e histórico diário",
      migration: "000050_daily_prescription.sql",
      run: () =>
        db
          .from("student_day_prescriptions")
          .select("user_id,prescribed_date,payload")
          .limit(0),
    },
    {
      id: "exam_uploads",
      label: "Envio direto de exames privados",
      migration: "000051_student_content_security.sql",
      run: () =>
        db.from("exam_upload_intents").select("id,file_size,exam_id").limit(0),
    },
    {
      id: "ebook_access",
      label: "Autorização de conteúdo pago",
      migration: "000051_student_content_security.sql",
      run: () =>
        db.rpc("student_ebook_access", {
          p_ebook: "00000000-0000-0000-0000-000000000000",
          p_user: actorId,
        }),
    },
    {
      id: "base",
      label: "Tabelas e perfil",
      run: () =>
        db
          .from("profiles")
          .select("id,role,is_deleted")
          .eq("id", actorId)
          .limit(1),
    },
    {
      id: "manual_billing",
      label: "Registros manuais de alunos e pagamentos",
      migration: "000045_manual_student_billing.sql",
      run: () =>
        db.from("admin_manual_operations").select("id,request,result").limit(0),
    },
    {
      id: "payments",
      label: "Colunas de integridade dos pagamentos",
      migration: migrations.billing,
      run: () =>
        db
          .from("payments")
          .select(
            "id,is_duplicate,canonical_payment_id,refunded_amount_cents,last_provider_sync_at",
          )
          .limit(0),
    },
    {
      id: "refunds",
      label: "Estornos e relacionamento com pagamentos",
      migration: migrations.billing,
      run: () =>
        db
          .from("payment_refunds")
          .select(
            "external_id,status,occurred_at,amount_cents,payment:payments!inner(currency,is_duplicate)",
          )
          .limit(0),
    },
    {
      id: "checkout",
      label: "Operações de checkout",
      migration: migrations.billing,
      run: () =>
        db
          .from("billing_checkout_operations")
          .select("id,state,expires_at")
          .limit(0),
    },
    {
      id: "catalog",
      label: "Catálogos paginados (alimentos/treinos/pagamentos)",
      migration: migrations.catalog,
      run: () =>
        db.rpc("admin_data_page", {
          p_actor: actorId,
          p_kind: "diet_foods",
          p_filters: {},
          p_page: 1,
          p_size: 1,
        }),
    },
    {
      id: "students",
      label: "Diretório de alunos",
      migration: migrations.students,
      run: () =>
        db.rpc("admin_student_directory", {
          p_actor: actorId,
          p_search: "",
          p_status: "",
          p_limit: 1,
          p_offset: 0,
          p_locale: "pt-BR",
        }),
    },
    {
      id: "reports",
      label: "Análises e relatórios",
      migration: migrations.reports,
      run: () =>
        db.rpc("admin_analytics_report", {
          p_actor: actorId,
          p_from: date,
          p_to: date,
          p_grain: "day",
          p_currency: "BRL",
          p_coach: null,
          p_plan: null,
          p_provider: null,
          p_search: "",
          p_page: 1,
          p_size: 1,
        }),
    },
    {
      id: "queue",
      label: "Pendências do administrador",
      migration: migrations.queue,
      run: () => db.rpc("admin_work_queue", { p_actor: actorId }),
    },
    {
      id: "subscription",
      label: "Seleção da assinatura atual",
      migration: migrations.billing,
      run: () => db.rpc("billing_current_subscription", { p_user: actorId }),
    },
  ];
  const result = await Promise.all(
    checks.map(
      async (check: (typeof checks)[number]): Promise<DatabaseCheck> => {
        try {
          const request = check.run();
          const response = await (typeof request.abortSignal === "function"
            ? request.abortSignal(AbortSignal.timeout(8000))
            : request);
          if (response.error)
            return {
              id: check.id,
              label: check.label,
              migration: check.migration,
              ok: false,
              code: String(response.error.code || "UNKNOWN"),
              kind:
                response.error.code === "22P02" &&
                ["manual_payment_provider", "manual_payment_method"].includes(
                  check.id,
                )
                  ? "schema"
                  : databaseFailureKind({
                      ...response.error,
                      status: response.status,
                    }),
            };
          if (check.id === "base" && !response.data?.length)
            return {
              id: check.id,
              label: check.label,
              ok: false,
              code: "SERVICE_ROLE_REQUIRED",
              kind: "credentials",
            };
          return {
            id: check.id,
            label: check.label,
            migration: check.migration,
            ok: true,
          };
        } catch {
          return {
            id: check.id,
            label: check.label,
            migration: check.migration,
            ok: false,
            code: "REQUEST_FAILED",
            kind: "connection",
          };
        }
      },
    ),
  );
  return {
    ok: result.every((c) => c.ok),
    checkedAt: new Date().toISOString(),
    checks: result,
  };
}
