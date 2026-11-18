import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
const {
  dailyRuleSchema,
  defaultRule,
  matchesRule,
  rulesForDate,
  selectDailyAssignments,
  nextPending,
  dateKeySchema,
} = loadTs("src/lib/student/schedule.ts");
const { workoutWeek, selectWorkoutDays } = loadTs("src/lib/student/routine.ts");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("dias selecionados, data específica e treino/descanso são condições reais", () => {
  const monday = dailyRuleSchema.parse({
    weekdays: [1],
    condition: "training",
  });
  assert.equal(matchesRule(monday, "2026-11-02", "training"), true);
  assert.equal(matchesRule(monday, "2026-11-03", "training"), false);
  assert.equal(matchesRule(monday, "2026-11-02", "rest"), false);
  const rest = dailyRuleSchema.parse({ condition: "rest" });
  assert.equal(matchesRule(rest, "2026-11-02", "unassigned"), false);
  assert.equal(matchesRule(rest, "2026-11-02", "rest"), true);
  assert.equal(
    matchesRule({ ...rest, on_date: "2026-11-04" }, "2026-11-02", "rest"),
    false,
  );
  assert.equal(
    matchesRule({ ...monday, on_date: "2026-11-03" }, "2026-11-03", "training"),
    true,
  );
});
test("versões futuras não alteram regras anteriores; alternativa não soma duas dietas", () => {
  const a = {
      id: id(1),
      start_date: "2026-11-01",
      assigned_at: "2026-11-01T12:00:00Z",
    },
    b = {
      id: id(2),
      start_date: "2026-11-01",
      assigned_at: "2026-11-02T12:00:00Z",
    };
  assert.deepEqual(
    selectDailyAssignments(
      [a, b],
      "diet",
      new Map(),
      "2026-11-03",
      "training",
    ).map((a) => a.id),
    [b.id],
  );
  const rows = [
    {
      kind: "diet",
      assignment_id: a.id,
      effective_from: "2026-11-04",
      rule: dailyRuleSchema.parse({
        alternative_group: "dieta-principal",
        priority: 10,
      }),
    },
  ];
  assert.deepEqual(
    selectDailyAssignments(
      [a, b],
      "diet",
      rulesForDate(rows, "2026-11-03"),
      "2026-11-03",
      "training",
    ).map((a) => a.id),
    [b.id],
  );
  assert.deepEqual(
    selectDailyAssignments(
      [a, b],
      "diet",
      rulesForDate(rows, "2026-11-04"),
      "2026-11-04",
      "training",
    ).map((a) => a.id),
    [a.id],
  );
  const additive = new Map([
    [`diet:${a.id}`, dailyRuleSchema.parse({ alternative_group: null })],
  ]);
  assert.equal(
    selectDailyAssignments([a, b], "diet", additive, "2026-11-03", "training")
      .length,
    2,
  );
  assert.equal(
    selectDailyAssignments(
      [a, b],
      "supplement",
      new Map(),
      "2026-11-03",
      "training",
    ).length,
    2,
  );
});
test("pendências vencidas permanecem em destaque; horários são ordenados entre kits", () => {
  const items = [
    { key: "b", slot: "18:00", done: false },
    { key: "a", slot: "08:00", done: false },
    { key: "c", slot: "dose-1", done: false },
  ];
  assert.equal(nextPending(items).key, "a");
  assert.equal(
    nextPending(items.map((i) => ({ ...i, done: i.key === "a" }))).key,
    "b",
  );
  assert.equal(
    nextPending(items.map((i) => ({ ...i, done: true }))),
    undefined,
  );
});
test("repetição de ciclo e uso da semana 1 dependem de configuração", () => {
  assert.equal(workoutWeek("2026-11-01", "2026-11-29", 4, false), 5);
  assert.equal(workoutWeek("2026-11-01", "2026-11-29", 4, true), 1);
  const days = [{ week_number: 1, day_of_week: 1 }];
  assert.deepEqual(selectWorkoutDays(days, 2, 1, false), []);
  assert.deepEqual(selectWorkoutDays(days, 2, 1, true), days);
});
test("datas impossíveis, horários duplicados e quantidade inválida são rejeitados", () => {
  assert.equal(dateKeySchema.safeParse("2026-02-30").success, false);
  assert.equal(dateKeySchema.safeParse("2026-11-02").success, true);
  assert.equal(
    dailyRuleSchema.safeParse({ items: { [id(1)]: { quantity: 0 } } }).success,
    false,
  );
  assert.equal(
    dailyRuleSchema.safeParse({
      items: { [id(1)]: { slots: ["08:00", "08:00"] } },
    }).success,
    false,
  );
  assert.equal(dailyRuleSchema.safeParse({ weekdays: [] }).success, false);
});
function mockDb(tables) {
  const calls = [];
  return {
    calls,
    from(table) {
      let rows = [...(tables[table] || [])],
        single = false;
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          rows = rows.filter((r) => r[k] === v);
          return q;
        },
        gte(k, v) {
          rows = rows.filter((r) => r[k] >= v);
          return q;
        },
        lte(k, v) {
          rows = rows.filter((r) => r[k] <= v);
          return q;
        },
        in(k, vs) {
          rows = rows.filter((r) => vs.includes(r[k]));
          return q;
        },
        or() {
          return q;
        },
        order() {
          return q;
        },
        limit(n) {
          rows = rows.slice(0, n);
          return q;
        },
        range(a, b) {
          rows = rows.slice(a, b + 1);
          return q;
        },
        single() {
          single = true;
          return q;
        },
        maybeSingle() {
          single = true;
          return q;
        },
        then(ok) {
          return Promise.resolve({
            data: single ? rows[0] || null : rows,
            error: null,
          }).then(ok);
        },
      };
      return q;
    },
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: null, error: null };
    },
  };
}
function loadRoutine(tables, state = "training") {
  const db = mockDb(tables);
  const { StudentRoutineService } = loadTs(
    "src/services/StudentRoutineService.ts",
    {
      "server-only": {},
      "@/lib/supabase/server": { createServiceClientSSR: async () => db },
      "./WorkoutService": {
        WorkoutService: {
          getDaySchedule: async () => ({ state, notes: "", plans: [] }),
        },
      },
    },
  );
  return { db, service: StudentRoutineService };
}
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function routineTables() {
  return {
    profiles: [
      {
        id: id(9),
        first_name: "Aluno",
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
      },
    ],
    student_diet_kits: [
      {
        id: id(1),
        student_id: id(9),
        kit_id: id(3),
        status: "active",
        start_date: "2020-01-01",
        end_date: null,
        notes: "Orientação individual",
        kit: { name_pt: "Dieta", name_en: "Diet" },
      },
    ],
    diet_kit_items: [
      {
        id: id(4),
        kit_id: id(3),
        food_id: id(5),
        quantity: 100,
        unit: "g",
        time_of_day: "08:00",
        meal_type: "breakfast",
        notes_pt: "Nota do alimento",
        food: {
          is_active: true,
          name_pt: "Aveia",
          name_en: "Oats",
          serving_size: 100,
          serving_unit: "g",
          calories_kcal: 200,
          protein_g: 10,
          carbs_g: 20,
          fats_g: 5,
        },
      },
    ],
    student_supplement_kits: [],
    student_daily_rules: [],
  };
}
test("rotina aplica observação individual, dose, horário e nutrição antes de materializar o dia", async () => {
  const tables = routineTables();
  tables.student_daily_rules = [
    {
      kind: "diet",
      assignment_id: id(1),
      student_id: id(9),
      effective_from: "2020-01-01",
      rule: dailyRuleSchema.parse({
        items: {
          [id(4)]: { quantity: 150, slots: ["09:00"], notes: "Com água" },
        },
      }),
    },
  ];
  const { service, db } = loadRoutine(tables);
  const data = await service.get(id(9));
  assert.equal(data.diet[0].quantity, 150);
  assert.equal(data.diet[0].slot, "09:00");
  assert.equal(data.plannedNutrition.calories_kcal, 300);
  assert.equal(data.diet[0].notes, "Orientação individual\n\nCom água");
  assert.equal(db.calls[0].name, "store_student_day");
  assert.equal(db.calls[0].args.p_date, today());
  assert.equal(db.calls[0].args.p_payload.diet[0].done, undefined);
});
test("prévia futura não grava histórico, registro verifica programação de hoje", async () => {
  const tables = routineTables();
  tables.student_daily_rules = [
    {
      kind: "diet",
      assignment_id: id(1),
      student_id: id(9),
      effective_from: "2020-01-01",
      rule: dailyRuleSchema.parse({ condition: "rest" }),
    },
  ];
  const { service, db } = loadRoutine(tables, "training");
  const data = await service.get(id(9), "2099-11-02");
  assert.equal(data.prescriptionStatus, "preview");
  assert.equal(data.diet.length, 0);
  assert.equal(db.calls.length, 0);
  await assert.rejects(
    service.setItem(id(9), {
      kind: "diet",
      assignmentId: id(1),
      itemId: id(4),
      slot: "08:00",
      done: true,
    }),
    /não está mais atribuído/,
  );
  assert.equal(
    db.calls.some((c) => c.name === "set_student_routine"),
    false,
  );
});
test("histórico usa prescrição salva, mesmo depois de remover o vínculo e mudar o alimento", async () => {
  const tables = routineTables();
  tables.student_diet_kits = [];
  tables.student_day_prescriptions = [
    {
      user_id: id(9),
      prescribed_date: "2020-01-02",
      payload: {
        diet: [
          {
            key: "old",
            kind: "diet",
            assignmentId: id(1),
            itemId: id(4),
            name: "Aveia antiga",
            quantity: 125,
            unit: "g",
            slot: "08:00",
            nutrition: {
              calories_kcal: 250,
              protein_g: 0,
              carbs_g: 0,
              fats_g: 0,
            },
          },
        ],
        supplements: [],
        workoutState: "rest",
        workouts: [],
      },
    },
  ];
  tables.student_routine_logs = [
    {
      user_id: id(9),
      kind: "diet",
      assignment_id: id(1),
      item_id: id(4),
      slot: "08:00",
      logged_date: "2020-01-02",
      calories_kcal: 250,
    },
  ];
  const { service, db } = loadRoutine(tables);
  const data = await service.get(id(9), "2020-01-02");
  assert.equal(data.prescriptionStatus, "recorded");
  assert.equal(data.diet[0].name, "Aveia antiga");
  assert.equal(data.diet[0].done, true);
  assert.equal(data.plannedNutrition.calories_kcal, 250);
  assert.equal(data.workoutState, "rest");
  assert.equal(db.calls.length, 0);
  const missing = await service.get(id(9), "2020-01-03");
  assert.equal(missing.prescriptionStatus, "unavailable");
  assert.equal(missing.diet.length, 0);
});

test("exceção em data específica não apaga a rotina dos dias seguintes", () => {
  const recurring = {
    kind: "diet",
    assignment_id: id(1),
    effective_from: "2026-11-01",
    rule: dailyRuleSchema.parse({ notes: "Rotina semanal" }),
  };
  const exception = {
    kind: "diet",
    assignment_id: id(1),
    effective_from: "2026-11-03",
    rule: dailyRuleSchema.parse({ on_date: "2026-11-04", notes: "Exceção" }),
  };
  assert.equal(
    rulesForDate([recurring, exception], "2026-11-03").get(`diet:${id(1)}`)
      .notes,
    "Rotina semanal",
  );
  assert.equal(
    rulesForDate([recurring, exception], "2026-11-04").get(`diet:${id(1)}`)
      .notes,
    "Exceção",
  );
  assert.equal(
    rulesForDate([recurring, exception], "2026-11-05").get(`diet:${id(1)}`)
      .notes,
    "Rotina semanal",
  );
});
function workoutService(tables) {
  const db = mockDb(tables);
  const { WorkoutService } = loadTs("src/services/WorkoutService.ts", {
    "@/lib/auth/platform": {},
    "./AuditLogService": {},
    "./StudentRoutineService": {
      checked: (r) => {
        if (r.error) throw r.error;
        return r.data;
      },
    },
    "../lib/supabase/server": { createServiceClientSSR: async () => db },
  });
  return WorkoutService;
}
test("consulta real de treino respeita descanso, fim do ciclo, semanas vazias e autorização de repetição", async () => {
  const a = {
    id: id(1),
    student_id: id(9),
    program_id: id(2),
    status: "active",
    start_date: "2026-11-02",
    end_date: null,
    assigned_at: "2026-11-02T12:00:00Z",
  };
  const program = { id: id(2), status: "active", total_weeks: 2 };
  const day = { id: id(3), program_id: id(2), week_number: 1, day_of_week: 1 };
  const tables = {
    student_workout_kits: [a],
    workout_programs: [program],
    workout_days: [day],
    student_daily_rules: [],
  };
  const service = workoutService(tables);
  assert.equal(
    (await service.getDaySchedule(id(9), "2026-11-02")).state,
    "training",
  );
  assert.equal(
    (await service.getDaySchedule(id(9), "2026-11-03")).state,
    "unassigned",
  );
  assert.equal((await service.getTodayPlans(id(9), "2026-11-09")).length, 0);
  assert.equal((await service.getTodayPlans(id(9), "2026-11-16")).length, 0);
  tables.student_daily_rules.push({
    student_id: id(9),
    kind: "workout",
    assignment_id: a.id,
    effective_from: "2026-11-02",
    rule: dailyRuleSchema.parse({
      rest_weekdays: [2],
      repeat_cycle: true,
      fallback_week_one: true,
    }),
  });
  assert.equal(
    (await service.getDaySchedule(id(9), "2026-11-03")).state,
    "rest",
  );
  assert.equal((await service.getTodayPlans(id(9), "2026-11-09")).length, 1);
  assert.equal((await service.getTodayPlans(id(9), "2026-11-16")).length, 1);
});

test("plano escrito chega à rotina, respeita a atribuição e preserva orientações no histórico", async () => {
  const tables = routineTables();
  tables.diet_kit_items = [];
  tables.student_diet_kits[0].kit.description_pt =
    "Café da manhã\n* Ovos: 100 g\n\nOrientações\nTexto individual";
  tables.student_daily_rules = [
    {
      kind: "diet",
      assignment_id: id(1),
      student_id: id(9),
      effective_from: "2020-01-01",
      rule: dailyRuleSchema.parse({ notes: "Orientação da programação" }),
    },
  ];
  const { service, db } = loadRoutine(tables);
  const data = await service.get(id(9));
  assert.equal(data.diet.length, 0);
  assert.equal(data.dietGuidance.length, 1);
  assert.match(data.dietGuidance[0].text, /Ovos: 100 g/);
  assert.match(data.dietGuidance[0].text, /Orientação da programação/);
  assert.equal(data.waterGoal, null);
  assert.deepEqual(db.calls[0].args.p_payload.dietGuidance, data.dietGuidance);
  tables.student_day_prescriptions = [
    {
      user_id: id(9),
      prescribed_date: "2020-01-02",
      payload: {
        diet: [],
        supplements: [],
        workouts: [],
        dietGuidance: data.dietGuidance,
      },
    },
  ];
  tables.student_diet_kits = [];
  const historical = await loadRoutine(tables).service.get(id(9), "2020-01-02");
  assert.deepEqual(historical.dietGuidance, data.dietGuidance);
  const fresh = routineTables();
  fresh.diet_kit_items = [];
  fresh.student_diet_kits[0].start_date = "2099-01-01";
  fresh.student_diet_kits[0].kit.description_pt =
    "Não pode aparecer antes do início";
  assert.deepEqual(
    (await loadRoutine(fresh).service.get(id(9))).dietGuidance,
    [],
  );
});
