import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";

test("painel do aluno atualiza durante edição e diálogos; pausa explícita, offline e segundo plano são respeitados", () => {
  const saved = Object.fromEntries(
    ["window", "document", "navigator"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  const listeners = new Map();
  let tick,
    cleanup,
    refreshes = 0,
    dialog = false,
    editing = false,
    pause = false;
  const target = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  const doc = {
    ...target,
    hidden: false,
    querySelector: (selector) =>
      selector.includes("data-live-refresh-pause") ? pause : dialog,
    activeElement: { closest: () => editing },
  };
  const nav = { onLine: true };
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        ...target,
        dispatchEvent() {},
        setInterval(fn, ms) {
          assert.equal(ms, 15000);
          tick = fn;
          return 1;
        },
        clearInterval() {
          tick = null;
        },
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: doc,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: nav,
    });
    const { usePanelRefresh } = loadTs("src/hooks/usePanelRefresh.ts", {
      react: {
        useEffect: (fn) => {
          const result = fn();
          if (result) cleanup = result;
        },
        useTransition: () => [false, (fn) => fn()],
        useRef: (value) => ({ current: value }),
        useCallback: (fn) => fn,
      },
      "@/lib/live/refresh": {
        createRefreshScheduler: (env) => ({
          request: () => {
            if (!env.blocked()) env.refresh();
          },
          resume() {},
          destroy() {},
        }),
      },
      "next/navigation": {
        useRouter: () => ({ refresh: () => refreshes++ }),
        usePathname: () => "/pt-BR/dieta",
      },
    });
    usePanelRefresh();
    tick();
    assert.equal(refreshes, 1);
    doc.hidden = true;
    tick();
    assert.equal(refreshes, 1);
    doc.hidden = false;
    nav.onLine = false;
    tick();
    assert.equal(refreshes, 1);
    nav.onLine = true;
    editing = true;
    tick();
    assert.equal(refreshes, 2);
    editing = false;
    dialog = true;
    tick();
    assert.equal(refreshes, 3);
    pause = true;
    tick();
    assert.equal(refreshes, 3);
    pause = false;
    dialog = false;
    for (const name of ["focus", "online", "visibilitychange"])
      listeners.get(name)();
    assert.equal(refreshes, 6);
    cleanup();
    assert.equal(tick, null);
    assert.equal(listeners.size, 0);
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test("consultas da ficha distinguem falha de banco e ausência real de registros", async () => {
  let failure = true;
  const db = {
    from() {
      const q = new Proxy(
        {},
        {
          get(_, key) {
            if (key === "then")
              return (resolve) =>
                resolve(
                  failure
                    ? { data: null, error: new Error("database unavailable") }
                    : { data: [], error: null },
                );
            return () => q;
          },
        },
      );
      return q;
    },
  };
  const mocks = {
    "server-only": {},
    "../lib/supabase/server": { createServiceClientSSR: async () => db },
    "@/lib/supabase/server": { createServiceClientSSR: async () => db },
    "@/lib/auth/platform": {
      requirePlatformUser: async () => ({ role: "admin" }),
      staffStudentIds: async () => null,
    },
  };
  for (const [name, methods] of Object.entries({
    WorkoutKitService: ["listKits", "listStudentAssignments"],
    WorkoutService: ["listPrograms"],
    DietService: ["listKits", "listStudentKits"],
    SupplementService: ["listKits", "listStudentKits"],
  })) {
    const service = loadTs(`src/services/${name}.ts`, mocks)[name];
    for (const method of methods) {
      failure = true;
      await assert.rejects(
        () =>
          service[method](
            method.startsWith("listStudent") ? "student" : undefined,
          ),
        /database unavailable/,
      );
      failure = false;
      assert.deepEqual(
        await service[method](
          method.startsWith("listStudent") ? "student" : undefined,
        ),
        [],
      );
    }
  }
});
