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
              kind: databaseFailureKind({
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
