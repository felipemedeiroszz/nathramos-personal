import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
import { testDatabase } from "./database.mjs";
const A = "00000000-0000-4000-8000-000000000081",
  B = "00000000-0000-4000-8000-000000000082",
  ADMIN = "81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e";
let db, book, plan;
before(async () => {
  db = await testDatabase();
  await db.query(
    "insert into auth.users(id,email) values($1,'content-a@example.test'),($2,'content-b@example.test')",
    [A, B],
  );
  plan = (await db.query("select id from plans order by order_index limit 1"))
    .rows[0].id;
  await db.query(
    "insert into subscriptions(user_id,plan_id,status,unit_amount_cents,current_period_end) values($1,$3,'active',100,now()+interval '30 days'),($2,$3,'active',100,now()+interval '30 days')",
    [A, B, plan],
  );
  book = (
    await db.query(
      "insert into ebooks(title_pt,title_en,slug,is_published,is_free,external_url) values('Livro pago','Paid book','paid-content-test',true,false,'https://example.test/private-ebook') returning id",
    )
  ).rows[0].id;
});
after(async () => {
  await db?.close();
});
async function actor(id, action) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
    return action(tx);
  });
}
test("e-book pago bloqueia não comprador no banco, libera compra/estorno parcial e revoga estorno total", async () => {
  assert.equal(
    (
      await actor(A, (tx) =>
        tx.query("select id,external_url from ebooks where id=$1", [book]),
      )
    ).rows.length,
    0,
  );
  await db.query(
    "insert into ebook_purchases(user_id,ebook_id,status,amount_cents) values($1,$2,'paid',100)",
    [A, book],
  );
  assert.equal(
    (
      await actor(A, (tx) =>
        tx.query("select id from ebooks where id=$1", [book]),
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await actor(B, (tx) =>
        tx.query("select id from ebooks where id=$1", [book]),
      )
    ).rows.length,
    0,
  );
  await db.query(
    "update ebook_purchases set status='partially_refunded' where user_id=$1 and ebook_id=$2",
    [A, book],
  );
  assert.equal(
    (
      await actor(A, (tx) =>
        tx.query("select id from ebooks where id=$1", [book]),
      )
    ).rows.length,
    1,
  );
  await db.query(
    "update ebook_purchases set status='refunded' where user_id=$1 and ebook_id=$2",
    [A, book],
  );
  assert.equal(
    (
      await actor(A, (tx) =>
        tx.query("select id from ebooks where id=$1", [book]),
      )
    ).rows.length,
    0,
  );
});
test("benefício de plano autoriza acesso; publicação futura, exclusão e vencimento bloqueiam", async () => {
  await db.query("update ebooks set min_plan_id=$2 where id=$1", [book, plan]);
  assert.equal(
    (
      await actor(B, (tx) =>
        tx.query("select id from ebooks where id=$1", [book]),
      )
    ).rows.length,
    1,
  );
  await db.query(
    "update ebooks set publish_at=now()+interval '1 day' where id=$1",
    [book],
  );
  assert.equal(
    (
      await actor(B, (tx) =>
        tx.query("select id from ebooks where id=$1", [book]),
      )
    ).rows.length,
    0,
  );
  await db.query(
    "update ebooks set publish_at=null,is_deleted=true where id=$1",
    [book],
  );
  assert.equal(
    (
      await actor(B, (tx) =>
        tx.query("select id from ebooks where id=$1", [book]),
      )
    ).rows.length,
    0,
  );
  await db.query("update ebooks set is_deleted=false where id=$1", [book]);
  await db.query("update subscriptions set status='blocked' where user_id=$1", [
    B,
  ]);
  assert.equal(
    (
      await actor(B, (tx) =>
        tx.query("select id from ebooks where id=$1", [book]),
      )
    ).rows.length,
    0,
  );
});
test("finalização de exame é idempotente e não aceita intent de outro aluno", async () => {
  const intent = (
    await db.query(
      "insert into exam_upload_intents(user_id,object_path,file_name,file_size,mime_type) values($1::uuid,$1::uuid::text||'/file.pdf','file.pdf',10485760,'application/pdf') returning id",
      [A],
    )
  ).rows[0].id;
  const data = { title: "Exame de teste", exam_date: "2026-11-03" };
  await assert.rejects(
    db.query("select finalize_exam_upload($1,$2,$3)", [B, intent, data]),
    /indisponível/,
  );
  const first = (
    await db.query("select finalize_exam_upload($1,$2,$3) id", [
      A,
      intent,
      data,
    ])
  ).rows[0].id;
  const again = (
    await db.query("select finalize_exam_upload($1,$2,$3) id", [
      A,
      intent,
      data,
    ])
  ).rows[0].id;
  assert.equal(first, again);
  assert.equal(
    (await db.query("select file_size_bytes from exams where id=$1", [first]))
      .rows[0].file_size_bytes,
    10485760,
  );
  await assert.rejects(
    actor(A, (tx) =>
      tx.query("select finalize_exam_upload($1,$2,$3)", [A, intent, data]),
    ),
    /permission denied/,
  );
  await assert.rejects(
    actor(A, (tx) => tx.query("select student_ebook_access($1,$2)", [book, B])),
    /permission denied/,
  );
});
function rowsQuery(rows) {
  const q = {
    select() {
      return q;
    },
    eq() {
      return q;
    },
    or() {
      return q;
    },
    order() {
      return q;
    },
    range() {
      return q;
    },
    maybeSingle: async () => ({ data: rows[0], error: null }),
    then(resolve) {
      return Promise.resolve({ data: rows, error: null }).then(resolve);
    },
  };
  return q;
}
test("catálogo real nunca devolve URL, caminho privado ou outras colunas ao cliente", async () => {
  const rows = [
    {
      id: book,
      title_pt: "Pago",
      is_free: false,
      external_url: "https://example.test/secret",
      file_bucket_path: "admin/private.pdf",
      private_metadata: "hidden",
    },
  ];
  const { EbookService } = loadTs("src/services/EbookService.ts", {
    "../lib/supabase/server": {
      createServiceClientSSR: async () => ({ from: () => rowsQuery(rows) }),
      createClientSSR: async () => ({ from: () => rowsQuery([]) }),
    },
    "./AuditLogService": {},
    "@/lib/auth/platform": { AccessError: class extends Error {} },
    "server-only": {},
  });
  const data = await EbookService.studentLibrary();
  assert.equal(data[0].accessible, false);
  assert.equal(data[0].has_content, true);
  for (const key of ["external_url", "file_bucket_path", "private_metadata"])
    assert.equal(key in data[0], false);
});
test("entrega real recusa não comprador antes de ler caminho e usa URL assinada curta para autorizado", async () => {
  let allowed = false,
    reads = 0,
    signed;
  class AccessError extends Error {}
  const db = {
    rpc: async () => ({ data: allowed, error: null }),
    from() {
      reads++;
      return rowsQuery([{ id: book, file_bucket_path: "private/book.pdf" }]);
    },
    storage: {
      from: () => ({
        createSignedUrl: async (path, seconds) => {
          signed = { path, seconds };
          return {
            data: { signedUrl: "https://example.test/signed" },
            error: null,
          };
        },
      }),
    },
  };
  const { EbookService } = loadTs("src/services/EbookService.ts", {
    "../lib/supabase/server": { createServiceClientSSR: async () => db },
    "./AuditLogService": {},
    "@/lib/auth/platform": { AccessError },
    "server-only": {},
  });
  await assert.rejects(EbookService.authorizedContent(book, A), AccessError);
  assert.equal(reads, 0);
  allowed = true;
  assert.equal(
    await EbookService.authorizedContent(book, A),
    "https://example.test/signed",
  );
  assert.equal(signed.seconds, 60);
});

test("aluno não pode contornar uploads assinados gravando diretamente no bucket", async () => {
  await assert.rejects(
    actor(A, (tx) =>
      tx.query(
        "insert into storage.objects(bucket_id,name,owner) values('exam-files',$1,$2)",
        [A + "/bypass.pdf", A],
      ),
    ),
    /row-level security|permission denied/,
  );
});

test("exames bloqueiam exclusão direta do proprietário e preservam exclusão pelo servidor e outros buckets", async () => {
  // Supabase enables Storage RLS and grants these privileges outside migrations.
  // Reproduce that setup so permission-denied errors cannot mask a policy gap.
  await db.exec("alter table storage.objects enable row level security; grant select,insert,update,delete on storage.objects to authenticated,service_role");
  const examPath = A + "/delete-integrity.pdf";
  const photoPath = A + "/delete-integrity.jpg";
  await db.query(
    "insert into storage.objects(bucket_id,name,owner) values('exam-files',$1,$3),('diet-photos',$2,$3)",
    [examPath, photoPath, A],
  );
  const denied = await actor(A, tx => tx.query(
    "delete from storage.objects where bucket_id='exam-files' and name=$1 returning id", [examPath],
  ));
  assert.equal(denied.rows.length, 0);
  assert.equal((await db.query("select id from storage.objects where bucket_id='exam-files' and name=$1", [examPath])).rows.length, 1);
  const photo = await actor(A, tx => tx.query(
    "delete from storage.objects where bucket_id='diet-photos' and name=$1 returning id", [photoPath],
  ));
  assert.equal(photo.rows.length, 1);
  const removed = await db.transaction(async tx => {
    await tx.exec("set local role service_role");
    return tx.query("delete from storage.objects where bucket_id='exam-files' and name=$1 returning id", [examPath]);
  });
  assert.equal(removed.rows.length, 1);
});
