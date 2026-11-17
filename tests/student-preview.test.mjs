import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
import { NextRequest, NextResponse } from "next/server.js";
process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-only-support-encryption";
const tokens = loadTs("src/lib/auth/student-preview-token.ts");
const context = {
  adminId: "admin",
  studentId: "student",
  locale: "pt-BR",
  expires: Date.now() + 60000,
  token: "private-student-token",
};
test("support context is encrypted and authenticated", () => {
  const encoded = tokens.sealPreview(context);
  assert(!encoded.includes(context.token));
  assert.deepEqual(tokens.openPreview(encoded), context);
  const altered = Buffer.from(encoded, "base64url");
  altered[30] ^= 1;
  assert.equal(tokens.openPreview(altered.toString("base64url")), null);
  assert.equal(tokens.openPreview("invalid"), null);
});
function preview({
  role = "admin",
  deleted = false,
  actor = "admin",
  expires = context.expires,
  targetRole = "student",
} = {}) {
  const value = tokens.sealPreview({ ...context, expires });
  return loadTs("src/lib/auth/student-preview.ts", {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: () => ({ value }) }) },
    "@/lib/supabase/server": {
      createDefaultClientSSR: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: actor } } }) },
      }),
      createServiceClientSSR: async () => ({
        from: () => ({
          select: () => ({
            eq: (_key, id) => ({
              maybeSingle: async () => ({
                data: {
                  role: id === "admin" ? role : targetRole,
                  is_deleted: deleted,
                },
              }),
            }),
          }),
        }),
      }),
    },
  });
}
test("only an active administrator can view an active student", async () => {
  assert.equal((await preview().verifiedPreview()).studentId, "student");
  for (const options of [
    { role: "coach" },
    { role: "student" },
    { deleted: true },
    { actor: "someone-else" },
    { expires: Date.now() - 1 },
    { targetRole: "admin" },
  ])
    assert.equal(await preview(options).verifiedPreview(), null);
});
const { middleware } = loadTs("src/middleware.ts", {
  "@/lib/supabase/middleware": {
    updateSession: async () => NextResponse.next(),
  },
  "next-intl/middleware": () => (request) =>
    NextResponse.next({ request: { headers: request.headers } }),
});
function request(path, options = {}) {
  return new NextRequest("http://localhost:3001" + path, options);
}
test("middleware rejects student mutations while allowing administrator controls", async () => {
  const cookie = "nr-support-preview=encrypted";
  const response = await middleware(
    request("/api/community", {
      method: "POST",
      headers: { cookie, referer: "http://localhost:3001/pt-BR/comunidade" },
    }),
  );
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /suporte/);
  const admin = await middleware(
    request("/api/admin/something", {
      method: "POST",
      headers: { cookie, referer: "http://localhost:3001/pt-BR/admin/alunos" },
    }),
  );
  assert.equal(admin.status, 200);
  const exit = await middleware(
    request("/api/admin/student-preview/exit", { headers: { cookie } }),
  );
  assert.equal(exit.status, 200);
});
test("preview request headers are controlled by middleware, not the caller", async () => {
  const spoof = await middleware(
    request("/pt-BR/dashboard", { headers: { "x-student-preview": "1" } }),
  );
  assert.equal(
    spoof.headers.get("x-middleware-request-x-student-preview"),
    null,
  );
  const selected = await middleware(
    request("/pt-BR/dashboard", {
      headers: { cookie: "nr-support-preview=encrypted" },
    }),
  );
  assert.equal(
    selected.headers.get("x-middleware-request-x-student-preview"),
    "1",
  );
  const admin = await middleware(
    request("/pt-BR/admin/alunos", {
      headers: {
        cookie: "nr-support-preview=encrypted",
        "x-student-preview": "1",
      },
    }),
  );
  assert.equal(
    admin.headers.get("x-middleware-request-x-student-preview"),
    null,
  );
});
test("exit only clears support cookies and returns to the correct student", async () => {
  const { GET } = loadTs("src/app/api/admin/student-preview/exit/route.ts");
  const response = await GET(
    request("/api/admin/student-preview/exit", {
      headers: { cookie: `nr-support-preview=${tokens.sealPreview(context)}` },
    }),
  );
  assert.equal(
    response.headers.get("location"),
    "http://localhost:3001/pt-BR/admin/alunos/student",
  );
  const names = response.cookies.getAll().map((c) => c.name);
  assert.deepEqual(names.sort(), ["nr-support-mode", "nr-support-preview"]);
});

test("start checks origin and role before creating any student session", async () => {
  let generated = 0;
  const id = "c4bee153-7fb2-4a6f-9dbf-b13153870ccd";
  function route(role = "admin", audit = true) {
    return loadTs("src/app/api/admin/student-preview/start/route.ts", {
      "@/lib/supabase/server": {
        createDefaultClientSSR: async () => ({
          auth: { getUser: async () => ({ data: { user: { id: "admin" } } }) },
        }),
        createServiceClientSSR: async () => ({
          from: () => ({
            select: () => ({
              eq: (_key, value) => ({
                maybeSingle: async () => ({
                  data: {
                    role: value === "admin" ? role : "student",
                    is_deleted: false,
                  },
                }),
              }),
            }),
          }),
          auth: {
            admin: {
              getUserById: async () => ({
                data: { user: { id, email: "student@example.test" } },
              }),
              generateLink: async () => {
                generated++;
                return { data: { properties: { hashed_token: "hash" } } };
              },
            },
          },
        }),
      },
      "@/services/AuditLogService": {
        AuditLogService: { log: async () => audit },
      },
      "@supabase/supabase-js": {
        createClient: () => ({
          auth: {
            verifyOtp: async () => ({
              data: {
                user: { id },
                session: {
                  access_token: "secret-student-access-token",
                  expires_at: Math.floor(Date.now() / 1000) + 3600,
                },
              },
            }),
          },
        }),
      },
    });
  }
  function post(origin = "http://localhost:3001") {
    const body = new FormData();
    body.set("studentId", id);
    body.set("locale", "pt-BR");
    return request("/api/admin/student-preview/start", {
      method: "POST",
      headers: { origin },
      body,
    });
  }
  assert.equal((await route().POST(post("https://evil.test"))).status, 403);
  assert.equal((await route("coach").POST(post())).status, 403);
  assert.equal((await route("student").POST(post())).status, 403);
  assert.equal((await route("admin", false).POST(post())).status, 503);
  assert.equal(generated, 0);
  const response = await route().POST(post());
  assert.equal(response.status, 303);
  assert.equal(generated, 1);
  assert.equal(
    response.headers.get("location"),
    "http://localhost:3001/pt-BR/dashboard",
  );
  assert(
    !response.headers.get("set-cookie").includes("secret-student-access-token"),
  );
  const cookie = response.cookies.get("nr-support-preview");
  assert.equal(cookie.httpOnly, true);
  assert.equal(tokens.openPreview(cookie.value).studentId, id);
  assert(
    response.cookies.getAll().every((c) => c.name.startsWith("nr-support-")),
  );
});
