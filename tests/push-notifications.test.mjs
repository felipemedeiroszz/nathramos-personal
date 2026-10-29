import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { loadTs } from "./load-ts.mjs";
function worker() {
  const handlers = {},
    shown = [],
    opened = [],
    messages = [],
    deleted = [];
  const self = {
    location: { origin: "https://example.com" },
    addEventListener: (name, fn) => (handlers[name] = fn),
    skipWaiting: async () => {},
    registration: {
      showNotification: async (title, options) =>
        shown.push({ title, options }),
    },
    clients: {
      claim: async () => {},
      matchAll: async () => [],
      openWindow: async (url) => opened.push(url),
    },
  };
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self,
    URL,
    console,
    caches: {
      keys: async () => ["nathramos-static-v1", "other-app"],
      delete: async (key) => deleted.push(key),
    },
  });
  async function event(name, data = {}) {
    let pending;
    handlers[name]({ ...data, waitUntil: (p) => (pending = p) });
    await pending;
  }
  return { self, handlers, shown, opened, deleted, event };
}
test("push without a tag and invalid JSON still display an alert", async () => {
  const w = worker();
  await w.event("push", {
    data: { json: () => ({ title: "Treino", body: "Hora de treinar" }) },
  });
  assert.equal(w.shown.length, 1);
  assert.equal(w.shown[0].options.renotify, undefined);
  await w.event("push", {
    data: {
      json: () => {
        throw Error();
      },
      text: () => "Novo aviso",
    },
  });
  assert.equal(w.shown[1].options.body, "Novo aviso");
});
test("push click stays on the site and has a localized default route", async () => {
  const w = worker();
  await w.event("notificationclick", {
    notification: {
      close() {},
      data: { url: "https://external.example/phishing" },
    },
  });
  assert.equal(w.opened[0], "https://example.com/pt-BR/notificacoes");
});
test("worker does not cache private pages or APIs; old caches are removed only for this app", async () => {
  const w = worker();
  for (const url of [
    "/pt-BR/dashboard",
    "/pt-BR/admin",
    "/api/payments/history",
    "/pt-BR/login?_rsc=1",
  ]) {
    let intercepted = false;
    w.handlers.fetch({
      request: { method: "GET", url: "https://example.com" + url },
      respondWith() {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false);
  }
  await w.event("activate");
  assert.deepEqual(w.deleted, ["nathramos-static-v1"]);
});
function browserEnvironment() {
  const prior = {};
  for (const key of ["window", "navigator", "Notification", "localStorage"])
    prior[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  const previousKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-key";
  let saves = 0,
    removes = 0,
    unsubscribes = 0,
    fail = false;
  const store = new Map();
  const subscription = {
    endpoint: "https://push.example/endpoint",
    toJSON: () => ({ keys: { auth: "auth", p256dh: "key" } }),
    unsubscribe: async () => {
      unsubscribes++;
      return true;
    },
  };
  const registration = {
    active: {},
    pushManager: { getSubscription: async () => subscription },
  };
  const values = {
    window: {
      isSecureContext: true,
      PushManager: {},
      Notification: {},
      matchMedia: () => ({ matches: false }),
    },
    Notification: {
      permission: "granted",
      requestPermission: async () => "granted",
    },
    navigator: {
      userAgent: "Android",
      platform: "Linux",
      maxTouchPoints: 1,
      serviceWorker: {
        register: async () => registration,
        getRegistration: async () => registration,
      },
    },
    localStorage: {
      getItem: (key) => store.get(key),
      setItem: (key, v) => store.set(key, v),
      removeItem: (key) => store.delete(key),
    },
  };
  for (const [key, value] of Object.entries(values))
    Object.defineProperty(globalThis, key, { value, configurable: true });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.endsWith("/unsubscribe")) {
      removes++;
      return { ok: !fail };
    }
    saves++;
    return { ok: true };
  };
  const client = loadTs("src/lib/push/client.ts");
  return {
    client,
    values,
    fail: () => (fail = true),
    stats: () => ({ saves, removes, unsubscribes }),
    restore() {
      globalThis.fetch = previousFetch;
      if (previousKey === undefined)
        delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = previousKey;
      for (const [key, descriptor] of Object.entries(prior)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}
test("subscription sync deduplicates calls; disabling persists until explicitly enabled", async () => {
  const env = browserEnvironment();
  try {
    assert.deepEqual(
      await Promise.all([
        env.client.syncPushSubscription(),
        env.client.syncPushSubscription(),
      ]),
      [true, true],
    );
    assert.equal(env.stats().saves, 1);
    assert.equal(await env.client.disablePush(), true);
    assert.equal(await env.client.syncPushSubscription(), false);
    assert.equal(env.stats().saves, 1);
    assert.equal(await env.client.enablePush(), true);
    assert.equal(env.stats().saves, 2);
  } finally {
    env.restore();
  }
});
test("failed unsubscribe is reported and does not unsubscribe locally", async () => {
  const env = browserEnvironment();
  try {
    env.fail();
    assert.equal(await env.client.disablePush(), false);
    assert.equal(env.stats().unsubscribes, 0);
  } finally {
    env.restore();
  }
});
test("mobile availability distinguishes insecure origins and iOS installation", () => {
  const env = browserEnvironment();
  try {
    env.values.window.isSecureContext = false;
    assert.equal(env.client.pushAvailability(), "insecure");
    env.values.window.isSecureContext = true;
    env.values.navigator.userAgent = "iPhone";
    assert.equal(env.client.pushAvailability(), "install");
  } finally {
    env.restore();
  }
});
