import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";
import { testDatabase } from "./database.mjs";
function panel(scenario) {
  let checkedCalls = 0;
  const db = {
    from(table) {
      const filters = {};
      const q = {
        select: () => q,
        eq: (key, value) => {
          filters[key] = value;
          return q;
        },
        order: () => q,
        limit: () => q,
        then(resolve, reject) {
          const error =
            table === "payments" && scenario === "enum"
              ? { code: "22P02" }
              : table === "admin_manual_operations" && scenario === "table"
                ? { code: "PGRST205" }
                : scenario === "permission"
                  ? { code: "42501" }
                  : null;
          return Promise.resolve({ data: error ? null : [], error }).then(
            resolve,
            reject,
          );
        },
      };
      return q;
    },
  };
  const { StudentManualBillingPanel } = loadTs(
    "src/components/admin/student/StudentManualBillingPanel.tsx",
    {
      "@/lib/auth/access": { requireRole: async () => ({ role: "admin" }) },
      "@/lib/supabase/server": { createServiceClientSSR: async () => db },
      "@/services/StudentRoutineService": {
        checked: (r) => {
          checkedCalls++;
          if (r.error) throw Error(r.error.code);
          return r.data;
        },
      },
      "./ManualBillingForm": {
        ManualBillingForm: () =>
          React.createElement("form", { "data-manual-form": "true" }),
      },
      "next/link": ({ children, ...props }) =>
        React.createElement("a", props, children),
    },
  );
  return {
    render: async () =>
      renderToStaticMarkup(
        await StudentManualBillingPanel({
          studentId: "student",
          locale: "pt-BR",
        }),
      ),
    checked: () => checkedCalls,
  };
}
test("ausência do enum ou tabela mostra orientação e não renderiza formulário de pagamentos", async () => {
  for (const scenario of ["enum", "table"]) {
    const fixture = panel(scenario);
    const html = await fixture.render();
    assert.ok(html.includes("000044_manual_payment_types.sql"));
    assert.ok(html.includes("000045_manual_student_billing.sql"));
    assert.ok(!html.includes("data-manual-form"));
    assert.equal(fixture.checked(), 0);
  }
});
test("banco pronto mostra formulário e erros de permissão não viram histórico vazio", async () => {
  assert.ok((await panel("ready").render()).includes("data-manual-form"));
  await assert.rejects(panel("permission").render(), /42501/);
});
test("diagnóstico reconhece enums ausentes como migração 000044", async () => {
  const { checkAdminDatabase } = loadTs("src/lib/admin/diagnostics.ts", {
    "server-only": {},
  });
  const db = {
    from(table) {
      const filters = {};
      const q = {
        select: () => q,
        eq: (key, value) => {
          filters[key] = value;
          return q;
        },
        limit: async () =>
          table === "payments" &&
          (filters.provider === "manual" || filters.method === "cash")
            ? { status: 400, error: { code: "22P02" } }
            : { data: [{ id: "admin" }] },
      };
      return q;
    },
    rpc: async () => ({ data: {} }),
  };
  const result = await checkAdminDatabase(db, "admin");
  const failed = result.checks.filter((c) => !c.ok);
  assert.equal(failed.length, 2);
  for (const check of failed) {
    assert.equal(check.kind, "schema");
    assert.equal(check.migration, "000044_manual_payment_types.sql");
  }
});
test("migrações 000044 e 000045 corrigem o cenário de banco anterior aos tipos manuais", async () => {
  const db = await testDatabase({ through: "000043_pix_prepaid_access.sql" });
  try {
    await assert.rejects(
      db.query("select 'manual'::payment_provider_t"),
      (e) => e.code === "22P02",
    );
    await db.exec(
      await readFile(
        "supabase/migrations/000044_manual_payment_types.sql",
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/000045_manual_student_billing.sql",
        "utf8",
      ),
    );
    assert.equal(
      (
        await db.query(
          "select 'manual'::payment_provider_t provider,'cash'::payment_method_t method",
        )
      ).rows[0].provider,
      "manual",
    );
    assert.equal(
      (await db.query("select count(*)::int n from admin_manual_operations"))
        .rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
