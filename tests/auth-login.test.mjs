import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
function setup(error = null) {
  const calls = [];
  const q = {
    select() {
      return q;
    },
    eq() {
      return q;
    },
    limit() {
      return q;
    },
    async maybeSingle() {
      return { data: { role: "student" }, error: null };
    },
  };
  const auth = loadTs("src/app/actions/auth.ts", {
    "@/lib/supabase/server": {
      createClientSSR: async () => ({
        auth: {
          signInWithPassword: async (values) => {
            calls.push(values);
            return { data: { user: error ? null : { id: "test" } }, error };
          },
        },
      }),
      createServiceClientSSR: async () => ({ from: () => q }),
    },
    "next/headers": {
      headers: () => new Headers({ "accept-language": "en-US" }),
    },
    "@/services/PlatformSettingsService": { isSignupOpen: async () => true },
  });
  return { auth, calls };
}
for (const remember of [undefined, "true", "on", "false"])
  test(`login accepts HTML checkbox value ${remember}`, async () => {
    const { auth, calls } = setup();
    const form = new FormData();
    form.set("email", "preview@example.com");
    form.set("password", "Preview12345");
    form.set("locale", "pt-BR");
    if (remember !== undefined) form.set("remember", remember);
    const result = await auth.loginAction(form);
    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    assert.equal(result.redirectTo, "/pt-BR/dashboard");
  });
test("login locale follows the selected interface and only accepts known locales", async () => {
  const { auth } = setup();
  const form = new FormData();
  form.set("email", "preview@example.com");
  form.set("password", "Preview12345");
  form.set("locale", "en-US");
  assert.equal((await auth.loginAction(form)).redirectTo, "/en-US/dashboard");
  form.set("locale", "untrusted");
  assert.equal((await auth.loginAction(form)).redirectTo, "/en-US/dashboard");
});

test("login informa a suspensão reportada pelo Supabase Auth", async () => {
  const { auth } = setup({ code: "user_banned" });
  const form = new FormData();
  form.set("email", "preview@example.com");
  form.set("password", "Preview12345");
  form.set("locale", "pt-BR");
  const result = await auth.loginAction(form);
  assert.equal(result.success, false);
  assert.equal(result.message, "Esta conta está suspensa.");
});

test("troca de e-mail exige a senha atual e solicita confirmação ao Auth", async (t) => {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.example.test";
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
  });
  const requests = [];
  const user = { id: "student", email: "old@example.test" };
  const auth = {
    getUser: async () => ({ data: { user } }),
    signInWithPassword: async ({ password }) => password === "correct-password"
      ? { data: { user } }
      : { error: new Error("invalid credentials") },
    updateUser: async (...args) => { requests.push(args); return {}; },
  };
  const { changeEmailAction } = loadTs("src/app/actions/account.ts", {
    "server-only": {},
    "@/lib/auth/access": { requireAuthenticated: async () => user.id },
    "@/lib/supabase/server": { createClientSSR: async () => ({ auth }) },
    "next/cache": {},
    "next/navigation": {},
    "next/headers": {},
  });
  const form = new FormData();
  form.set("email", "NEW@example.test");
  form.set("locale", "en-US");
  form.set("current_password", "wrong-password");
  assert.equal((await changeEmailAction(null, form)).success, false);
  assert.deepEqual(requests, []);
  form.set("current_password", "correct-password");
  assert.equal((await changeEmailAction(null, form)).success, true);
  assert.equal(requests[0][0].email, "new@example.test");
  const redirect = new URL(requests[0][1].emailRedirectTo);
  assert.equal(redirect.origin, "https://staging.example.test");
  assert.equal(redirect.pathname, "/en-US/auth/callback");
  assert.equal(redirect.searchParams.get("next"), "/en-US/account");
});
