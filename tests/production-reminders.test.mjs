import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
test("falha na rotina de um aluno não interrompe o aluno seguinte", async () => {
  const visited = [];
  const { NotificationDispatcher } = loadTs(
    "src/services/NotificationDispatcher.ts",
    {
      "./StudentRoutineService": {
        checked: (r) => r.data,
        readPages: async () => ({ data: [{ id: "a" }, { id: "b" }] }),
        StudentRoutineService: {
          get: async (id) => {
            visited.push(id);
            if (id === "a") throw Error("fixture");
            return {
              date: "2026-11-03",
              timezone: "America/Sao_Paulo",
              diet: [],
              supplements: [],
              workouts: [],
              waterGoal: null,
            };
          },
        },
      },
      "./PlatformSettingsService": {
        getMaintenanceStatus: async () => ({ active: false }),
      },
      "../lib/supabase/server": {
        createServiceClientSSR: async () => ({
          from() {
            const q = {
              select: () => q,
              eq: () => q,
              gte: () => q,
              then: (r) => Promise.resolve({ data: [], error: null }).then(r),
            };
            return q;
          },
        }),
      },
      "./NotificationService": {
        NotificationService: {},
        ALWAYS_PUSH_TYPES: [],
      },
      "@/lib/auth/access": {
        canAccessPlatform: async () => ({ allowed: true }),
      },
    },
  );
  const result = await NotificationDispatcher.generateRoutineReminders();
  assert.deepEqual(visited, ["a", "b"]);
  assert.equal(result.failed, 1);
  assert.equal(result.users, 2);
});
test("cron entrega notificações e limpa uploads mesmo quando a geração falha", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "local-fixture";
  const stages = [];
  try {
    const { GET } = loadTs("src/app/api/cron/notifications/route.ts", {
      "next/server": {
        NextResponse: {
          json: (body, options) => ({ body, status: options?.status || 200 }),
        },
      },
      "@/services/NotificationDispatcher": {
        NotificationDispatcher: {
          generateRoutineReminders: async () => {
            stages.push("generate");
            throw Error("fixture");
          },
          processDueNotifications: async () => {
            stages.push("deliver");
            return { processed: 1, failed: 0 };
          },
        },
      },
      "@/services/ExamUploadService": {
        ExamUploadService: {
          cleanExpired: async () => {
            stages.push("clean");
            return { removed: 0 };
          },
        },
      },
    });
    assert.equal(
      (await GET(new Request("http://localhost/api/cron/notifications")))
        .status,
      401,
    );
    const result = await GET(
      new Request("http://localhost/api/cron/notifications", {
        headers: { authorization: "Bearer local-fixture" },
      }),
    );
    assert.deepEqual(stages, ["generate", "deliver", "clean"]);
    assert.equal(result.status, 500);
    assert.equal(result.body.deliveries.processed, 1);
    assert.equal(
      (
        await GET(
          new Request("http://localhost/api/cron/notifications?task=invalid", {
            headers: { authorization: "Bearer local-fixture" },
          }),
        )
      ).status,
      400,
    );
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
test("exportação XLSX continua válida após atualizar dependências transitivas", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Aluno");
  sheet.addRow(["Aluno", "Valor"]);
  sheet.addRow(["Teste", 123]);
  sheet.addConditionalFormatting({
    ref: "B2",
    rules: [
      {
        type: "dataBar",
        minLength: 0,
        maxLength: 100,
        cfvo: [{ type: "min" }, { type: "max" }],
        color: { argb: "FFFFCC00" },
      },
    ],
  });
  const buffer = await book.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);
  assert.equal(loaded.getWorksheet("Aluno").getCell("B2").value, 123);
});
