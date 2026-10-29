import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
function setup() {
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
            return { data: { user: { id: "test" } }, error: null };
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
