import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import sharp from "sharp";
import { loadTs } from "./load-ts.mjs";
import { testDatabase } from "./database.mjs";

function find(node, predicate) {
  if (!node || typeof node !== "object") return;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const found = find(child, predicate);
    if (found) return found;
  }
}

for (const [path, name] of [
  ["diet/DietFoodUpsertModal", "DietFoodUpsertModal"],
  ["content/ExamUpsertModal", "ExamUpsertModal"],
  ["content/SupplementUpsertModal", "SupplementUpsertModal"],
  ["content/EbookUpsertModal", "EbookUpsertModal"],
]) {
  test(`${name}: falha preserva formulário e não confirma salvamento; nova tentativa confirma`, async () => {
    let task, saved = 0, fail = true;
    const updates = [];
    const { [name]: Component } = loadTs(`src/components/admin/${path}.tsx`, {
      react: { ...React, useEffect() {}, useState(initial) {
        const slot = updates.length;
        updates.push([]);
        return [initial, value => updates[slot].push(value)];
      } },
      "next-intl": { useLocale: () => "pt-BR", useTranslations: () => value => value },
      "@/hooks/useAsyncTransition": { useAsyncTransition: () => [false, callback => (task = callback())] },
      "@/components/admin/content/ProductImageField": { ProductImageField: () => null },
    });
    const tree = Component({ isOpen: true, onClose() {}, onSaved: () => saved++, onSubmit: async () => {
      if (fail) throw new Error("Banco indisponível");
    } });
    const form = find(tree, el => el.type === "form");
    const event = { preventDefault() {}, currentTarget: { querySelector: () => null } };
    form.props.onSubmit(event);
    await task;
    assert.equal(saved, 0);
    assert.equal(updates[0].at(-1), "Banco indisponível");
    assert.equal(updates[1].length, 0, "campos não são apagados");
    fail = false;
    form.props.onSubmit(event);
    await task;
    assert.equal(saved, 1);
    form.props.onSubmit({ ...event, currentTarget: { querySelector: () => ({}) } });
    assert.equal(saved, 1, "não salva enquanto imagem está sendo enviada");
  });
}

test("datas civis mantêm o dia e data padrão respeita o fuso local", () => {
  const { formatCivilDate, localDateKey } = loadTs("src/lib/dates/civil.ts");
  const previous = process.env.TZ;
  try {
    for (const zone of ["America/Sao_Paulo", "Pacific/Auckland", "UTC"]) {
      process.env.TZ = zone;
      assert.equal(formatCivilDate("2026-11-03", "pt-BR"), "03/11/2026");
      assert.equal(formatCivilDate("2026-11-03", "en-US"), "11/3/2026");
    }
    process.env.TZ = "America/Sao_Paulo";
    assert.equal(localDateKey(new Date("2026-11-04T01:30:00Z")), "2026-11-03");
    assert.equal(formatCivilDate("inválido", "pt-BR"), "inválido");
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test("imagem acima de 1 MB é assinada sem binário na ação e validada pelo conteúdo real", async () => {
  const user = "00000000-0000-4000-8000-000000000081";
  let bytes = Buffer.concat([await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer(), Buffer.alloc(2 * 1024 * 1024)]);
  let type = "image/png", removed = 0, path, signed = 0;
  const storage = {
    async createSignedUploadUrl(value, options) { path = value; signed++; assert.equal(options.upsert, false); return { data: { token: "fixture" } }; },
    async info() { return { data: { size: bytes.length, contentType: type } }; },
    async download() { return { data: new Blob([bytes]) }; },
    async remove() { removed++; return {}; },
    getPublicUrl(value) { return { data: { publicUrl: `https://example.test/${value}` } }; },
  };
  const { ProductImageUploadService: service } = loadTs("src/services/ProductImageUploadService.ts", {
    "server-only": {}, "@/lib/supabase/server": { createServiceClientSSR: async () => ({ storage: { from: () => storage } }) },
  });
  await assert.rejects(service.prepare(user, { size: 5242881, type }));
  assert.equal(signed, 0);
  const prepared = await service.prepare(user, { size: bytes.length, type });
  assert.equal(prepared.token, "fixture");
  assert.equal(await service.complete(user, path), `https://example.test/${path}`);
  await assert.rejects(service.complete("another-user", path));
  bytes = Buffer.from("not an image");
  await assert.rejects(service.complete(user, path), /Arquivo inválido/);
  assert.equal(removed, 1);
});

test("Storage: aluno não altera imagens públicas, admin mantém a gestão", async () => {
  const db = await testDatabase();
  const user = "00000000-0000-4000-8000-000000000081";
  const admin = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
  try {
    await db.query("insert into auth.users(id,email) values($1,'image-test@example.test')", [user]);
    await db.exec("alter table storage.objects enable row level security; grant select,insert,update,delete on storage.objects to authenticated");
    async function actor(id, sql) { return db.transaction(async tx => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
      return tx.query(sql);
    }); }
    await assert.rejects(actor(user, "insert into storage.objects(bucket_id,name) values('product-images','forbidden.png')"), /row-level security/);
    await actor(admin, "insert into storage.objects(bucket_id,name) values('product-images','allowed.png')");
    assert.equal((await actor(user, "update storage.objects set name='replaced.png' where bucket_id='product-images' returning id")).rows.length, 0);
    assert.equal((await actor(user, "delete from storage.objects where bucket_id='product-images' returning id")).rows.length, 0);
    assert.equal((await actor(user, "select id from storage.objects where bucket_id='product-images'")).rows.length, 1);
    assert.equal((await actor(admin, "delete from storage.objects where bucket_id='product-images' returning id")).rows.length, 1);
  } finally { await db.close(); }
});
