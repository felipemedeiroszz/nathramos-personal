import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
import { renderStudentDetail } from "./student-detail-fixture.mjs";
const { availableStudentTabs, selectedStudentTab, studentTabHref } = loadTs(
  "src/lib/admin/student-detail-tabs.ts",
);
test("abas respeitam permissões e financeiro persiste com filtros na URL", () => {
  assert.equal(availableStudentTabs(true).length, 8);
  assert.equal(availableStudentTabs(false).length, 6);
  assert.equal(selectedStudentTab({}, true), "profile");
  assert.equal(selectedStudentTab({ financeStatus: "paid" }, true), "billing");
  assert.equal(selectedStudentTab({ tab: "billing" }, false), "profile");
  assert.equal(selectedStudentTab({ tab: "management" }, false), "profile");
  const url = new URL(
    studentTabHref("/student", "billing", {
      financeStatus: "paid",
      financePage: "2",
    }),
    "http://localhost",
  );
  assert.equal(url.searchParams.get("tab"), "billing");
  assert.equal(url.searchParams.get("financePage"), "2");
});
test("página real separa dados pessoais, financeiro e administração sem carregar painéis juntos", async () => {
  const profile = await renderStudentDetail();
  assert.ok(profile.includes("Dados pessoais"));
  assert.ok(!profile.includes('data-fixture="manual-payments"'));
  assert.ok(!profile.includes('data-fixture="account-access"'));
  const billing = await renderStudentDetail({ tab: "billing" });
  assert.ok(billing.includes('data-fixture="manual-payments"'));
  assert.ok(billing.includes('data-fixture="payment-history"'));
  assert.ok(!billing.includes('data-fixture="account-access"'));
  const management = await renderStudentDetail({ tab: "management" });
  assert.ok(management.includes('data-fixture="account-access"'));
  assert.ok(!management.includes('data-fixture="manual-payments"'));
});
test("coach não recebe conteúdo financeiro ou de administração por URL direta", async () => {
  for (const tab of ["billing", "management"]) {
    const html = await renderStudentDetail({ tab }, "coach");
    assert.ok(!html.includes('data-fixture="manual-payments"'));
    assert.ok(!html.includes('data-fixture="password-reset"'));
    assert.ok(!html.includes('data-fixture="account-access"'));
    assert.ok(!html.includes(">Financeiro</a>"));
  }
});
