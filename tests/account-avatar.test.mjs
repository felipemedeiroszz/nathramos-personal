import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { loadTs } from "./load-ts.mjs";
const actor = "00000000-0000-4000-8000-000000000001";
function fixture() {
  let authenticated = true,
    active = true,
    profileFailure = false,
    privileged = 0;
  const uploads = [],
    updates = [],
    removed = [],
    filters = [];
  const db = {
    from(table) {
      assert.equal(table, "profiles");
      const query = {
        select: () => query,
        eq: (key, value) => {
          filters.push([key, value]);
          return query;
        },
        maybeSingle: async () => ({
          data: active ? { id: actor } : null,
          error: null,
        }),
        update: (changes) => {
          updates.push(changes);
          return query;
        },
        single: async () => ({
          data: profileFailure ? null : { id: actor },
          error: profileFailure ? { code: "42501" } : null,
        }),
      };
      return query;
    },
    storage: {
      from(bucket) {
        return {
          upload: async (path, bytes, options) => {
            uploads.push({ bucket, path, bytes, options });
            return { error: null };
          },
          getPublicUrl: (path) => ({
            data: { publicUrl: "https://storage.example/avatars/" + path },
          }),
          remove: async (paths) => {
            removed.push(...paths);
            return { error: null };
          },
        };
      },
    },
  };
  const actions = loadTs("src/app/actions/account.ts", {
    "server-only": {},
    "next/cache": { revalidatePath() {} },
    "next/navigation": {
      redirect() {
        throw Error("redirect");
      },
    },
    "next/headers": { headers: async () => new Headers() },
    "@/lib/auth/access": {
      requireAuthenticated: async () => {
        if (!authenticated) throw Error("unauthorized");
        return actor;
      },
    },
    "@/lib/supabase/server": {
      createServiceClientSSR: async () => {
        privileged++;
        return db;
      },
      createClientSSR: async () => {
        throw Error("Session Storage must not be used for avatars");
      },
    },
  });
  return {
    actions,
    uploads,
    updates,
    removed,
    filters,
    privileged: () => privileged,
    setAuth: (value) => (authenticated = value),
    setActive: (value) => (active = value),
    setFailure: (value) => (profileFailure = value),
  };
}
async function image() {
  const bytes = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: "#b77d8e" },
  })
    .withMetadata()
    .jpeg()
    .toBuffer();
  const form = new FormData();
  form.set("file", new File([bytes], "portrait.jpg", { type: "image/jpeg" }));
  form.set("userId", "victim");
  return form;
}
test("avatar usa Storage do servidor, normaliza bytes e atualiza somente o perfil autenticado", async () => {
  const f = fixture();
  const result = await f.actions.uploadPhotoAction(null, await image());
  assert.equal(result.success, true);
  assert.equal(f.uploads.length, 1);
  const saved = f.uploads[0];
  assert.ok(saved.path.startsWith(actor + "/"));
  assert.ok(saved.path.endsWith(".webp"));
  assert.equal(saved.options.upsert, false);
  assert.equal(saved.options.contentType, "image/webp");
  const metadata = await sharp(saved.bytes).metadata();
  assert.equal(metadata.width, 512);
  assert.equal(metadata.exif, undefined);
  assert.deepEqual(f.updates, [{ avatar_url: result.photoUrl }]);
  assert.ok(f.filters.some(([key, value]) => key === "id" && value === actor));
  assert.ok(!f.filters.some(([, value]) => value === "victim"));
});
test("anônimo e perfil excluído não enviam arquivo; imagem forjada é rejeitada", async () => {
  const f = fixture();
  f.setAuth(false);
  await assert.rejects(
    f.actions.uploadPhotoAction(null, await image()),
    /unauthorized/,
  );
  assert.equal(f.privileged(), 0);
  f.setAuth(true);
  f.setActive(false);
  assert.equal(
    (await f.actions.uploadPhotoAction(null, await image())).success,
    false,
  );
  assert.equal(f.uploads.length, 0);
  f.setActive(true);
  const form = new FormData();
  form.set(
    "file",
    new File(["not an image"], "fake.png", { type: "image/png" }),
  );
  assert.equal((await f.actions.uploadPhotoAction(null, form)).success, false);
  assert.equal(f.uploads.length, 0);
});
test("falha ao atualizar perfil remove arquivo recém-enviado e não comunica sucesso", async () => {
  const f = fixture();
  f.setFailure(true);
  const result = await f.actions.uploadPhotoAction(null, await image());
  assert.equal(result.success, false);
  assert.deepEqual(f.removed, [f.uploads[0].path]);
});
test("remoção do avatar também usa perfil autenticado e acesso de servidor", async () => {
  const f = fixture();
  assert.equal((await f.actions.removePhotoAction()).success, true);
  assert.deepEqual(f.updates, [{ avatar_url: null }]);
  assert.ok(f.filters.some(([key, value]) => key === "id" && value === actor));
});
