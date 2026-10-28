import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "./database.mjs";
import { loadTs } from "./load-ts.mjs";
const ADMIN = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e",
  A = "20000000-0000-4000-8000-000000000001",
  B = "20000000-0000-4000-8000-000000000002",
  C = "20000000-0000-4000-8000-000000000003";
let db;
before(async () => {
  db = await testDatabase();
  await db.query(
    "insert into auth.users(id,email) values($1,'a@test.test'),($2,'b@test.test'),($3,'c@test.test')",
    [A, B, C],
  );
  await db.query("update profiles set role='coach' where id=$1", [C]);
  await db.query(
    "update profiles set full_name=case when id=$1 then 'Alice' else 'Bruna' end,created_at='2024-11-01' where id in($1,$2)",
    [A, B],
  );
  await db.query("select admin_assign_coach($1,$2,$3)", [ADMIN, A, C]);
  await db.query(
    "insert into workout_sessions(user_id,scheduled_date,started_at,completed_at,duration_min) values($1,'2025-01-02','2025-01-02T12:00Z','2025-01-02T12:30Z',30),($1,'2024-12-31','2024-12-31T23:00Z','2025-01-01T12:00Z',15),($1,'2024-12-02','2024-12-02T12:00Z','2024-12-02T12:20Z',20),($2,'2025-01-02','2025-01-02T13:00Z','2025-01-02T13:45Z',45)",
    [A, B],
  );
  await db.query(
    "insert into payments(user_id,provider,status,amount_cents,currency,method,paid_at) values($1,'stripe','paid',30000,'BRL','credit_card','2025-01-02T12:00Z'),($2,'asaas','paid',40000,'BRL','pix','2025-01-02T12:00Z'),($1,'stripe','paid',90000,'USD','credit_card','2025-01-02T12:00Z'),($1,'stripe','paid',10000,'BRL','credit_card','2024-12-02T12:00Z')",
    [A, B],
  );
  await db.query(
    "insert into exams(user_id,title,exam_date) values($1,'A',current_date),($2,'B',current_date)",
    [A, B],
  );
});
after(async () => {
  if (db) await db.close();
});
async function report(
  actor = ADMIN,
  coach = null,
  currency = "BRL",
  page = 1,
  size = 25,
) {
  return (
    await db.query(
      "select admin_analytics_report($1,'2025-01-01','2025-01-31','week',$2,$3,null,null,'',$4,$5) as report",
      [actor, currency, coach, page, size],
    )
  ).rows[0].report;
}
test("analytics agrega períodos e moedas sem misturar coorte de sessões", async () => {
  const data = await report();
  assert.equal(data.summary.students, 2);
  assert.equal(data.summary.completed_sessions, 3);
  assert.equal(data.summary.previous_completed_sessions, 1);
  assert.equal(data.summary.started_sessions, 2);
  assert.equal(data.summary.cohort_completed, 2);
  assert.equal(data.summary.minutes, 90);
  assert.equal(data.financial.paid_cents, 70000);
  assert.equal(data.financial.previous_paid_cents, 10000);
  assert.equal(
    data.trend.reduce((sum, row) => sum + row.completed, 0),
    3,
  );
  assert.equal(
    data.trend.reduce((sum, row) => sum + row.revenue_cents, 0),
    70000,
  );
  const usd = await report(ADMIN, null, "USD");
  assert.equal(usd.financial.paid_cents, 90000);
});
test("coach recebe apenas sua carteira e nenhuma estrutura financeira", async () => {
  const data = await report(C);
  assert.equal(data.summary.students, 1);
  assert.equal(data.summary.completed_sessions, 2);
  assert.equal(data.summary.exams_pending, 1);
  assert.equal(data.students[0].id, A);
  assert.equal(data.financial, null);
  assert.ok(data.trend.every((row) => row.revenue_cents === null));
  assert.deepEqual(data.options.plans, []);
  assert.deepEqual(data.options.coaches, []);
  await assert.rejects(report(C, B), /Access denied/);
  await assert.rejects(report(A), /Access denied/);
  const filtered = await report(ADMIN, C);
  assert.equal(filtered.financial.paid_cents, 30000);
});
test("detalhes paginam sem truncar contadores e datas usam São Paulo", async () => {
  const first = await report(ADMIN, null, "BRL", 1, 1),
    last = await report(ADMIN, null, "BRL", 999, 1);
  assert.equal(first.details.total, 2);
  assert.equal(first.details.page, 1);
  assert.equal(last.details.page, 2);
  assert.notEqual(first.students[0].id, last.students[0].id);
  assert.equal(first.summary.students, 2);
  await db.query(
    "insert into payments(user_id,provider,status,amount_cents,currency,method,paid_at) values($1,'stripe','paid',999,'BRL','credit_card','2025-01-01T02:59Z')",
    [A],
  );
  const boundary = await report();
  assert.equal(boundary.financial.paid_cents, 70000);
  assert.equal(boundary.financial.previous_paid_cents, 10999);
});
test("RPC não é executável diretamente com sessão autenticada, mesmo forjando ator admin", async () => {
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [C]);
      return tx.query(
        "select admin_analytics_report($1,'2025-01-01','2025-01-31')",
        [ADMIN],
      );
    }),
    /permission denied/,
  );
});
test("filtros rejeitam datas impossíveis, intervalos excessivos e métricas sem denominador não viram zero", () => {
  const { analyticsFilters, ratio, changePercent } = loadTs(
    "src/lib/analytics/model.ts",
  );
  assert.throws(() =>
    analyticsFilters({ from: "2025-02-30", to: "2025-03-01" }),
  );
  assert.throws(() =>
    analyticsFilters({ from: "2020-01-01", to: "2025-01-01" }),
  );
  assert.throws(() =>
    analyticsFilters({ from: "2025-01-01", to: "2025-12-31", grain: "day" }),
  );
  assert.equal(ratio(0, 0), null);
  assert.equal(changePercent(100, 0), null);
  assert.equal(changePercent(150, 100), 50);
});
import { mkdir, writeFile } from "node:fs/promises";
import ExcelJS from "exceljs";

test("PDF e Excel são arquivos reais; planilha preserva valores, fórmulas e permissões", async () => {
  const { buildAnalyticsPdf, buildAnalyticsWorkbook } = loadTs(
    "src/lib/analytics/export.ts",
    { "server-only": {} },
  );
  const data = await report();
  data.students[0].name = '=HYPERLINK("https://example.test")';
  const [pdf, xlsx] = await Promise.all([
    buildAnalyticsPdf(data, "pt-BR"),
    buildAnalyticsWorkbook(data, "pt-BR"),
  ]);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 10000);
  assert.equal(xlsx.subarray(0, 2).toString(), "PK");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(xlsx);
  assert.equal(
    workbook.getWorksheet("Detalhamento dos alunos").getCell("A2").type,
    ExcelJS.ValueType.String,
  );
  assert.equal(
    workbook.getWorksheet("Evolução").getCell("D2").type,
    ExcelJS.ValueType.Number,
  );
  const summary = workbook.getWorksheet("Resumo");
  assert.equal(summary.getImages().length, 2);
  assert.ok(
    summary
      .getColumn(5)
      .values.some(
        (value) => value && typeof value === "object" && "formula" in value,
      ),
  );
  const coach = await report(C),
    coachFile = await buildAnalyticsWorkbook(coach, "en-US");
  const protectedWorkbook = new ExcelJS.Workbook();
  await protectedWorkbook.xlsx.load(coachFile);
  assert.equal(protectedWorkbook.worksheets.length, 4);
  assert.equal(protectedWorkbook.getWorksheet("Summary").getImages().length, 1);
  assert.ok(
    !protectedWorkbook.worksheets.some((sheet) =>
      /subscription|paid charges|top plans/i.test(sheet.name),
    ),
  );
  await mkdir("artifacts/analytics-ui", { recursive: true });
  await writeFile("artifacts/analytics-ui/report.pdf", pdf);
  await writeFile("artifacts/analytics-ui/report.xlsx", xlsx);
  await writeFile("artifacts/analytics-ui/coach.xlsx", coachFile);
  await writeFile("artifacts/analytics-ui/fixture.json", JSON.stringify(data));
  await writeFile(
    "artifacts/analytics-ui/coach-fixture.json",
    JSON.stringify(coach),
  );
});

test("serviço bloqueia aluno e filtros forjados de coach antes de abrir conexão privilegiada", async () => {
  class AccessError extends Error {
    constructor(message, status = 403) {
      super(message);
      this.status = status;
    }
  }
  let actor = { userId: A, role: "student", staff: false },
    called = 0;
  const { getAnalyticsReport } = loadTs("src/services/AnalyticsService.ts", {
    "server-only": {},
    "@/lib/auth/platform": {
      AccessError,
      requirePlatformUser: async () => actor,
    },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => {
        called++;
        throw new Error("Should not connect");
      },
    },
  });
  await assert.rejects(
    getAnalyticsReport({ from: "2025-01-01", to: "2025-01-31" }),
    (error) => error.status === 403,
  );
  actor = { userId: C, role: "coach", staff: true };
  await assert.rejects(
    getAnalyticsReport({ from: "2025-01-01", to: "2025-01-31", coach: B }),
    (error) => error.status === 403,
  );
  await assert.rejects(
    getAnalyticsReport({ from: "2025-01-01", to: "2025-01-31", plan: A }),
    (error) => error.status === 403,
  );
  assert.equal(called, 0);
});
test("endpoint de exportação autentica, limita detalhamento e envia downloads sem cache", async () => {
  class AccessError extends Error {
    constructor(message, status = 403) {
      super(message);
      this.status = status;
    }
  }
  let denied = true,
    tooMany = false,
    built = 0;
  const audits = [];
  const data = await report(C);
  const api = loadTs("src/app/api/admin/analytics/export/route.ts", {
    "next/server": {
      NextResponse: { json: (body, options) => Response.json(body, options) },
    },
    "@/lib/auth/platform": { AccessError },
    "@/services/AnalyticsService": {
      getAnalyticsReport: async (params, size) => {
        if (denied) throw new AccessError("Authentication required", 401);
        return {
          report: {
            ...data,
            details: { ...data.details, total: tooMany ? 6000 : 1 },
          },
          actor: { userId: C, role: "coach" },
        };
      },
    },
    "@/lib/analytics/export": {
      buildAnalyticsPdf: async (report) => {
        built++;
        assert.equal(report.financial, null);
        return Buffer.from("%PDF-fixture");
      },
      buildAnalyticsWorkbook: async () => {
        built++;
        return Buffer.from("PK-fixture");
      },
    },
    "@/services/AuditLogService": {
      AuditLogService: {
        log: async (entry) => {
          audits.push(entry);
          return true;
        },
      },
    },
  });
  const req = (format) => ({
    nextUrl: new URL(
      "http://localhost/api/admin/analytics/export?format=" +
        format +
        "&from=2025-01-01&to=2025-01-31",
    ),
  });
  assert.equal((await api.GET(req("pdf"))).status, 401);
  assert.equal(built, 0);
  denied = false;
  tooMany = true;
  assert.equal((await api.GET(req("xlsx"))).status, 422);
  assert.equal(built, 0);
  tooMany = false;
  const response = await api.GET(req("pdf"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.match(response.headers.get("Content-Disposition"), /attachment/);
  assert.equal(audits.length, 1);
  assert.equal((await api.GET(req("html"))).status, 400);
});
