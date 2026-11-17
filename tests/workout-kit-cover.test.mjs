import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { loadTs } from "./load-ts.mjs";
function fixture(failure = false) {
  let uploaded;
  let calls = 0;
  const storage = {
    upload: async (path, bytes, options) => {
      calls++;
      uploaded = { path, bytes, options };
      return { error: failure ? { message: "Storage failure" } : null };
    },
    getPublicUrl: (path) => ({
      data: { publicUrl: "https://storage.example.test/" + path },
    }),
  };
  const { uploadWorkoutKitCover } = loadTs(
    "src/services/WorkoutKitCoverUploadService.ts",
    {
      "server-only": {},
      "@/lib/supabase/server": {
        createServiceClientSSR: async () => ({
          storage: { from: () => storage },
        }),
      },
    },
  );
  return {
    uploadWorkoutKitCover,
    get uploaded() {
      return uploaded;
    },
    get calls() {
      return calls;
    },
  };
}
test("cover uploads decode, resize and strip metadata before publishing under the current user", async () => {
  const f = fixture();
  const original = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "red" },
  })
    .withMetadata()
    .png()
    .toBuffer();
  const url = await f.uploadWorkoutKitCover(
    "current-user",
    new File([original], "../../cover.png", { type: "image/png" }),
  );
  assert.match(f.uploaded.path, /^current-user\/[0-9a-f-]+\.webp$/);
  assert(url.endsWith(f.uploaded.path));
  const metadata = await sharp(f.uploaded.bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 800);
  assert.equal(metadata.exif, undefined);
  assert.equal(f.uploaded.options.upsert, false);
});
test("fake image content and mismatched image types never reach storage", async () => {
  const f = fixture();
  await assert.rejects(
    () =>
      f.uploadWorkoutKitCover(
        "u",
        new File(["not a real image"], "image.png", { type: "image/png" }),
      ),
    /Arquivo inválido/,
  );
  const jpeg = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(
    () =>
      f.uploadWorkoutKitCover(
        "u",
        new File([jpeg], "image.png", { type: "image/png" }),
      ),
    /Arquivo inválido/,
  );
  assert.equal(f.calls, 0);
});
test("oversized files and storage failures do not produce a successful URL", async () => {
  const f = fixture();
  await assert.rejects(() =>
    f.uploadWorkoutKitCover(
      "u",
      new File([Buffer.alloc(5 * 1024 * 1024 + 1)], "big.png", {
        type: "image/png",
      }),
    ),
  );
  assert.equal(f.calls, 0);
  const denied = fixture(true),
    png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
  await assert.rejects(
    () =>
      denied.uploadWorkoutKitCover(
        "u",
        new File([png], "cover.png", { type: "image/png" }),
      ),
    /Não foi possível enviar/,
  );
});
test("upload action requires staff authorization before processing a file", async () => {
  let accessed = false;
  const { uploadWorkoutKitCoverAction } = loadTs(
    "src/app/actions/workout-covers.ts",
    {
      "@/lib/auth/access": {
        requireRole: async (roles) => {
          assert.deepEqual(roles, ["admin", "coach"]);
          throw Error("Denied");
        },
      },
      "@/services/WorkoutKitCoverUploadService": {
        uploadWorkoutKitCover: async () => {
          accessed = true;
          return "bad";
        },
      },
    },
  );
  const form = new FormData();
  form.set("file", new File(["x"], "x.png", { type: "image/png" }));
  assert.equal((await uploadWorkoutKitCoverAction(form)).success, false);
  assert.equal(accessed, false);
});
