import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadTs } from "./load-ts.mjs";
class AccessError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}
test("API de desafios exige sessão, origem correta e corpo limitado", async () => {
  let authenticated = true;
  const writes = [];
  const { POST } = loadTs("src/app/api/challenges/route.ts", {
    "@/services/ChallengeService": {
      challengeActor: async () => {
        if (!authenticated) throw new AccessError("Entre na conta.", 401);
        return { userId: "student" };
      },
    },
    "@/lib/auth/platform": { AccessError },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        rpc: async (...args) => {
          writes.push(args);
          return { data: "created" };
        },
      }),
    },
  });
  const req = (body, origin = "http://localhost") => {
    const request = new Request("http://localhost/api/challenges", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body,
    });
    request.nextUrl = new URL(request.url);
    return request;
  };
  assert.equal((await POST(req("{}", "https://attacker.example"))).status, 403);
  assert.equal((await POST(req("x".repeat(1200001)))).status, 413);
  assert.equal(
    (
      await POST(
        req(
          JSON.stringify({
            action: "join",
            challenge_id: randomUUID(),
            accept_rules: false,
            version: 1,
          }),
        ),
      )
    ).status,
    400,
  );
  authenticated = false;
  assert.equal((await POST(req("{}"))).status, 401);
  assert.deepEqual(writes, []);
});
test("comprovante PDF valida assinatura, permanece privado e não é interpretado como imagem", async () => {
  const stored = [],
    reserved = [];
  const { uploadChallengeAsset } = loadTs("src/services/ChallengeService.ts", {
    "server-only": {},
    "@/services/CommunityService": {
      communityActor: async () => ({ userId: "student" }),
    },
    "@/lib/auth/platform": { AccessError },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        rpc: async (name, args) => {
          reserved.push({ name, args });
          return {};
        },
        storage: {
          from: (bucket) => ({
            upload: async (path, bytes, options) => {
              stored.push({ bucket, path, bytes, options });
              return {};
            },
          }),
        },
      }),
    },
  });
  const id = randomUUID();
  await uploadChallengeAsset(
    "student",
    id,
    "proof",
    new File(["%PDF-1.7\nfixture\n%%EOF"], "proof.pdf", {
      type: "application/pdf",
    }),
  );
  assert.equal(stored[0].bucket, "challenge-assets");
  assert.equal(stored[0].options.contentType, "application/pdf");
  assert.equal(stored[0].options.upsert, false);
  assert.equal(reserved[0].name, "challenge_reserve_upload");
  await assert.rejects(
    uploadChallengeAsset(
      "student",
      id,
      "proof",
      new File(["<script>fake</script>"], "fake.pdf", {
        type: "application/pdf",
      }),
    ),
    /inválido/,
  );
  await assert.rejects(
    uploadChallengeAsset(
      "student",
      id,
      "cover",
      new File(["%PDF-1.7\n%%EOF"], "cover.pdf", { type: "application/pdf" }),
    ),
    /JPG/,
  );
  assert.equal(stored.length, 1);
});
test("duplicação copia capas e prêmios individualmente para o novo desafio", async () => {
  const source = randomUUID(),
    target = randomUUID(),
    copied = [],
    attached = [];
  const { cloneChallengeAssets } = loadTs("src/services/ChallengeService.ts", {
    "server-only": {},
    "@/services/CommunityService": {},
    "@/lib/auth/platform": { AccessError },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        rpc: async (name, args) => {
          if (name === "challenge_read")
            return {
              data:
                args.p_filter.id === source
                  ? {
                      challenge: { cover_image: source + "/cover.webp" },
                      prizes: [
                        { placement: 1, image: source + "/first.webp" },
                        { placement: 2, image: source + "/second.webp" },
                      ],
                    }
                  : {
                      challenge: { cover_image: null },
                      prizes: [
                        { placement: 1, image: null },
                        { placement: 2, image: null },
                      ],
                    },
            };
          if (name === "challenge_attach_asset") attached.push(args);
          return {};
        },
        storage: {
          from: () => ({
            copy: async (from, to) => {
              copied.push({ from, to });
              return {};
            },
          }),
        },
      }),
    },
  });
  await cloneChallengeAssets("admin", source, target);
  assert.equal(copied.length, 3);
  assert.equal(attached.length, 3);
  assert.equal(new Set(copied.map((row) => row.to)).size, 3);
  assert.ok(copied.every((row) => row.to.startsWith(target + "/")));
  assert.deepEqual(
    attached.map((row) => row.p_placement),
    [null, 1, 2],
  );
});
