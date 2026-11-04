import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
const { examFileSchema, hasExamSignature } = loadTs("src/lib/exams/upload.ts");
test("limite real de 20 MB e assinaturas de arquivo são conferidos", () => {
  assert.equal(
    examFileSchema.safeParse({
      name: "exame.pdf",
      size: 20 * 1024 * 1024,
      type: "application/pdf",
    }).success,
    true,
  );
  assert.equal(
    examFileSchema.safeParse({
      name: "exame.pdf",
      size: 20 * 1024 * 1024 + 1,
      type: "application/pdf",
    }).success,
    false,
  );
  assert.equal(
    examFileSchema.safeParse({
      name: "exame.svg",
      size: 100,
      type: "image/svg+xml",
    }).success,
    false,
  );
  assert.equal(
    hasExamSignature(new TextEncoder().encode("%PDF-1.7"), "application/pdf"),
    true,
  );
  assert.equal(
    hasExamSignature(new TextEncoder().encode("<script>"), "application/pdf"),
    false,
  );
});
test("finalização confere dono, tamanho real e conteúdo antes de registrar exame", async () => {
  let intent = null,
    info = { size: 10485760, contentType: "application/pdf" },
    writes = 0;
  const q = {
    select() {
      return q;
    },
    eq() {
      return q;
    },
    maybeSingle: async () => ({ data: intent, error: null }),
  };
  const db = {
    from: () => q,
    rpc: async () => {
      writes++;
      return { data: "exam-id", error: null };
    },
    storage: {
      from: () => ({
        info: async () => ({ data: info, error: null }),
        createSignedUrl: async () => ({
          data: { signedUrl: "https://example.test/sign" },
          error: null,
        }),
      }),
    },
  };
  const { ExamUploadService } = loadTs("src/services/ExamUploadService.ts", {
    "server-only": {},
    "@/lib/supabase/server": { createServiceClientSSR: async () => db },
  });
  const metadata = { title: "Exame", exam_date: "2026-11-03" };
  await assert.rejects(
    ExamUploadService.complete("user", "id", metadata),
    /indisponível/,
  );
  intent = {
    file_size: 10485760,
    mime_type: "application/pdf",
    object_path: "user/id.pdf",
    expires_at: "2099-01-01",
  };
  info = { ...info, size: 123 };
  await assert.rejects(
    ExamUploadService.complete("user", "id", metadata),
    /não corresponde/,
  );
  assert.equal(writes, 0);
  info = { ...info, size: 10485760 };
  const saved = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("%PDF-1.7 fixture");
    assert.equal(
      await ExamUploadService.complete("user", "id", metadata),
      "exam-id",
    );
    assert.equal(writes, 1);
    globalThis.fetch = async () => new Response("<script>invalid</script>");
    await assert.rejects(
      ExamUploadService.complete("user", "id", metadata),
      /conteúdo/,
    );
    assert.equal(writes, 1);
  } finally {
    globalThis.fetch = saved;
  }
});

test("exame aceita categoria vazia do formulário sem enviar binário à ação", () => {
  const { studentExamUploadSchema } = loadTs("src/schemas/exams.ts");
  assert.equal(
    studentExamUploadSchema.parse({
      title: "Exame",
      exam_date: "2026-11-03",
      category_id: "",
    }).category_id,
    null,
  );
});

test("cadastro não interpreta consentimento textual false como verdadeiro", () => {
  const { signUpSchema } = loadTs("src/schemas/auth.ts");
  const base = {
    first_name: "Teste",
    last_name: "Aluno",
    phone: "",
    email: "test@example.test",
    password: "Teste12345",
    confirmPassword: "Teste12345",
    birth_date: "1990-01-01",
    gender: "O",
    height_cm: 170,
    weight_kg: 70,
    country: "Brasil",
    accepts_terms: "true",
    accepts_privacy: "true",
  };
  assert.equal(signUpSchema.safeParse(base).success, true);
  assert.equal(
    signUpSchema.safeParse({ ...base, accepts_terms: "false" }).success,
    false,
  );
  assert.equal(
    signUpSchema.safeParse({ ...base, accepts_privacy: "false" }).success,
    false,
  );
});
