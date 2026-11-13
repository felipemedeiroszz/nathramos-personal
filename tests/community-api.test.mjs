import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { loadTs } from "./load-ts.mjs";

class AccessError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}
test("upload valida bytes reais, reduz dimensões, remove metadados e grava somente WebP privado", async () => {
  const saved = [];
  const reservations = [];
  const { uploadCommunityImage } = loadTs("src/services/CommunityService.ts", {
    "server-only": {},
    "@/lib/auth/platform": { AccessError },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        rpc: async (name, args) => {
          reservations.push({ name, args });
          return {};
        },
        storage: {
          from: (bucket) => ({
            upload: async (path, bytes, options) => {
              saved.push({ bucket, path, bytes, options });
              return {};
            },
          }),
        },
      }),
    },
  });
  const bytes = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#ff88aa" },
  })
    .withMetadata()
    .jpeg()
    .toBuffer();
  const path = await uploadCommunityImage(
    "student",
    new File([bytes], "photo.jpg", { type: "image/jpeg" }),
  );
  assert.equal(saved.length, 1);
  assert.equal(saved[0].bucket, "community-images");
  assert.equal(saved[0].options.upsert, false);
  assert.match(path, /^student\/[0-9a-f-]+\.webp$/);
  const metadata = await sharp(saved[0].bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 800);
  assert.equal(metadata.exif, undefined);
  assert.equal(reservations[1].name, "community_reserve_upload");
  await assert.rejects(
    uploadCommunityImage(
      "student",
      new File(["<script>"], "fake.jpg", { type: "image/jpeg" }),
    ),
    /inválida/,
  );
  await assert.rejects(
    uploadCommunityImage(
      "student",
      new File([bytes], "fake.svg", { type: "image/svg+xml" }),
    ),
    /4 MB/,
  );
  await assert.rejects(
    uploadCommunityImage(
      "student",
      new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.jpg", {
        type: "image/jpeg",
      }),
    ),
    /4 MB/,
  );
  assert.equal(saved.length, 1);
});
test("API recusa origem externa, corpo excessivo e usuário sem sessão antes de gravar", async () => {
  let authenticated = true;
  const writes = [];
  const { POST } = loadTs("src/app/api/community/route.ts", {
    "@/lib/auth/platform": { AccessError },
    "@/services/CommunityService": {
      communityActor: async () => {
        if (!authenticated) throw new AccessError("Entre na sua conta.", 401);
        return { userId: "student", role: "student" };
      },
    },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        rpc: async (...args) => {
          writes.push(args);
          return { data: "saved" };
        },
      }),
    },
  });
  const req = (body, origin = "http://localhost") => {
    const request = new Request("http://localhost/api/community", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body,
    });
    request.nextUrl = new URL(request.url);
    return request;
  };
  assert.equal((await POST(req("{}", "https://attacker.example"))).status, 403);
  assert.equal((await POST(req("x".repeat(40001)))).status, 413);
  assert.equal(
    (
      await POST(
        req(
          JSON.stringify({ action: "react", post_id: "invalid", kind: "like" }),
        ),
      )
    ).status,
    400,
  );
  authenticated = false;
  assert.equal((await POST(req("{}"))).status, 401);
  assert.deepEqual(writes, []);
});

test("leitura de imagens protege rascunhos e usa resposta privada sem cache", async () => {
  const path =
    "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.webp";
  let owner = "other";
  let published = false;
  let downloads = 0;
  const { GET } = loadTs("src/app/api/community/image/route.ts", {
    "@/services/CommunityService": {
      communityActor: async () => ({ userId: "viewer" }),
    },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        from(table) {
          const query = {
            select: () => query,
            eq: () => query,
            contains: () => query,
            is: () => query,
            maybeSingle: async () => ({ data: { owner_id: owner } }),
            limit: async () => ({ data: published ? [{ id: "post" }] : [] }),
          };
          return query;
        },
        storage: {
          from: () => ({
            download: async () => {
              downloads++;
              return { data: new Blob(["webp"]) };
            },
          }),
        },
      }),
    },
  });
  const req = new Request(
    "http://localhost/api/community/image?path=" + encodeURIComponent(path),
  );
  req.nextUrl = new URL(req.url);
  assert.equal((await GET(req)).status, 404);
  assert.equal(downloads, 0);
  published = true;
  const response = await GET(req);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("content-type"), "image/webp");
  owner = "viewer";
  published = false;
  assert.equal((await GET(req)).status, 200);
});
