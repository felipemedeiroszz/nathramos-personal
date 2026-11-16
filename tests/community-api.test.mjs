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
    "server-only": {},
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
  let activeStory = false;
  let downloads = 0;
  const { GET } = loadTs("src/app/api/community/image/route.ts", {
    "@/services/CommunityService": {
      communityActor: async () => ({ userId: "viewer" }),
    },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        from(table) {
          const query = {
            select: (columns) => {
              if (table === "community_posts") {
                assert.equal(
                  columns,
                  "id,author:profiles!community_posts_author_id_fkey!inner(is_deleted)",
                );
              }
              return query;
            },
            eq: () => query,
            contains: () => query,
            gt: () => query,
            is: () => query,
            maybeSingle: async () => ({ data: { owner_id: owner } }),
            limit: async () => ({
              data: (table === "community_stories" ? activeStory : published)
                ? [{ id: "post" }]
                : [],
            }),
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
  published = false;
  activeStory = true;
  assert.equal((await GET(req)).status, 200);
  activeStory = false;
  assert.equal((await GET(req)).status, 404);
  owner = "viewer";
  published = false;
  assert.equal((await GET(req)).status, 200);
});

test("posts importados com UUID do PostgreSQL abrem e aceitam interações", () => {
  const {
    communityRecordIdSchema,
    communityFilterSchema,
    communityActionSchema,
  } = loadTs("src/lib/community.ts");
  const post = "c5a6fa8b-f1d7-db79-c4fe-a0457c66c146";
  assert.equal(communityRecordIdSchema.parse(post), post);
  assert.equal(communityFilterSchema.parse({ post }).post, post);
  assert.equal(
    communityFilterSchema.safeParse({ post: "invalid-id" }).success,
    false,
  );
  for (const action of [
    { action: "react", post_id: post, kind: "like" },
    { action: "delete_post", post_id: post },
    {
      action: "comment",
      post_id: post,
      parent_id: null,
      body: "Muito bom!",
      request_id: "24df502f-85fb-4ed5-93a1-f28369d43729",
    },
    { action: "edit", id: post, version: 1, body: "Atualizado", images: [] },
  ])
    assert.equal(communityActionSchema.safeParse(action).success, true);
});

test("API de stories valida tamanho antes de gravar e persiste escala permitida", async () => {
  const calls = [];
  const { POST } = loadTs("src/app/api/community/stories/route.ts", {
    "server-only": {},
    "@/services/CommunityService": {
      communityActor: async () => ({ userId: "student" }),
    },
    "@/lib/auth/platform": { AccessError },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        rpc: async (name, args) => {
          calls.push(args);
          return { data: "story", error: null };
        },
      }),
    },
  });
  const request = (scale) => {
    const req = new Request("http://localhost/api/community/stories", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "create",
        request_id: crypto.randomUUID(),
        caption: "💪",
        image_path: null,
        theme: "gold",
        text_position: "center",
        text_scale: scale,
      }),
    });
    req.nextUrl = new URL(req.url);
    return req;
  };
  assert.equal((await POST(request(0.1))).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await POST(request(1.6))).status, 200);
  assert.equal(calls[0].p_input.text_scale, 1.6);
});

test("foto de story usa autorização direta e recusa stories expirados antes do Storage", async () => {
  const path =
    "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.webp";
  const id = "00000000-0000-4000-8000-000000000003";
  let active = true,
    downloads = 0;
  const tables = [],
    filters = [];
  const { GET } = loadTs("src/app/api/community/image/route.ts", {
    "@/services/CommunityService": {
      communityActor: async () => ({ userId: "viewer" }),
    },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => ({
        from(table) {
          tables.push(table);
          const query = {
            select: () => query,
            eq: (key, value) => {
              filters.push([key, value]);
              return query;
            },
            is: () => query,
            gt: (key) => {
              assert.equal(key, "expires_at");
              return query;
            },
            limit: async () => ({ data: active ? [{ id }] : [] }),
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
  const req = {
    nextUrl: new URL(
      "http://localhost/api/community/image?story=" +
        id +
        "&path=" +
        encodeURIComponent(path),
    ),
  };
  assert.equal((await GET(req)).status, 200);
  assert.deepEqual(tables, ["community_stories"]);
  assert.ok(
    filters.some(([key, value]) => key === "image_path" && value === path),
  );
  assert.ok(filters.some(([key, value]) => key === "id" && value === id));
  active = false;
  assert.equal((await GET(req)).status, 404);
  assert.equal(downloads, 1);
});
