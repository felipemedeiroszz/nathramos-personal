import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";
const { exerciseMediaUrl, exerciseMediaKind, exerciseMediaPage } = loadTs(
  "src/lib/exercise-media.ts",
);
test("exercise autoplay URL delegates muted inline playback and loops only when requested", () => {
  const { youtubeExerciseEmbedUrl } = loadTs("src/lib/exercise-media.ts");
  const automatic = new URL(
    youtubeExerciseEmbedUrl("qRNjUb1molI", "pt-BR", true),
  );
  assert.equal(automatic.searchParams.get("autoplay"), "1");
  assert.equal(automatic.searchParams.get("mute"), "1");
  assert.equal(automatic.searchParams.get("playsinline"), "1");
  assert.equal(automatic.searchParams.get("playlist"), "qRNjUb1molI");
  assert.equal(
    new URL(
      youtubeExerciseEmbedUrl("qRNjUb1molI", "pt-BR", false),
    ).searchParams.get("autoplay"),
    null,
  );
  assert.equal(youtubeExerciseEmbedUrl("bad-id", "pt-BR", true), null);
  const { exerciseMediaSource } = loadTs("src/lib/exercise-media.ts");
  assert.equal(
    exerciseMediaSource({
      gif_url: "https://cdn.example.test/cover.gif",
      video_url: "https://youtube.com/shorts/qRNjUb1molI",
    }),
    "https://youtube.com/shorts/qRNjUb1molI",
  );
});
test("YouTube Shorts, watch, mobile and share links resolve only on trusted YouTube hosts", () => {
  const { youtubeVideoId, exerciseMediaFields, exerciseMediaSource } = loadTs(
    "src/lib/exercise-media.ts",
  );
  for (const url of [
    "https://youtube.com/shorts/qRNjUb1molI?si=redNNTlr8tKtzbB1",
    "https://youtu.be/qRNjUb1molI?feature=shared",
    "https://m.youtube.com/watch?v=qRNjUb1molI",
    "https://www.youtube.com/embed/qRNjUb1molI",
  ]) {
    assert.equal(youtubeVideoId(url), "qRNjUb1molI");
    assert.equal(exerciseMediaKind(url), "youtube");
    assert(!exerciseMediaPage(url));
    assert.deepEqual(exerciseMediaFields(url, null), {
      gif_url: null,
      video_url: "https://www.youtube.com/watch?v=qRNjUb1molI",
    });
  }
  for (const url of [
    "https://youtube.com.evil.test/shorts/qRNjUb1molI",
    "https://evil.test/?v=qRNjUb1molI",
    "javascript:alert(1)",
    "https://youtube.com/shorts/bad",
  ]) {
    assert.equal(youtubeVideoId(url), null);
  }
  assert.equal(
    exerciseMediaSource({
      gif_url: null,
      video_url: "https://youtube.com/shorts/qRNjUb1molI",
    }),
    "https://youtube.com/shorts/qRNjUb1molI",
  );
});
test("YouTube pasted into the image field saves as video and renders a safe embedded player", () => {
  const { upsertExerciseSchema } = loadTs("src/schemas/workouts.ts");
  const saved = upsertExerciseSchema.parse({
    name_pt: "Teste",
    name_en: "Test",
    primary_muscle: "chest",
    gif_url: "https://youtube.com/shorts/qRNjUb1molI?si=redNNTlr8tKtzbB1",
  });
  assert.equal(saved.gif_url, null);
  assert.equal(saved.video_url, "https://www.youtube.com/watch?v=qRNjUb1molI");
  const { ExerciseMedia } = loadTs("src/components/shared/ExerciseMedia.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ExerciseMedia, {
      src: saved.video_url,
      alt: "Exercise video",
    }),
  );
  assert(html.includes("https://www.youtube.com/embed/qRNjUb1molI?"));
  assert(html.includes("<iframe"));
  assert(!html.includes("<img"));
  assert(html.includes("strict-origin-when-cross-origin"));
  assert(html.includes("Abrir no YouTube"));
  assert(!html.includes("redNNTlr8tKtzbB1"));
});
test("exercise URLs trim whitespace, preserve signed queries and reject non-web protocols", () => {
  assert.equal(
    exerciseMediaUrl("  https://cdn.example.test/file.gif?token=abc%2F123  "),
    "https://cdn.example.test/file.gif?token=abc%2F123",
  );
  assert.equal(
    exerciseMediaUrl("//cdn.example.test/image.png"),
    "https://cdn.example.test/image.png",
  );
  for (const value of [
    "javascript:alert(1)",
    "file:///C:/photo.png",
    "data:image/svg+xml,x",
    "not a url",
    "https://user:pass@example.test/file.gif",
  ])
    assert.equal(exerciseMediaUrl(value), null);
  assert.equal(
    exerciseMediaKind("https://cdn.example.test/clip.MP4?signature=abc"),
    "video",
  );
  assert.equal(
    exerciseMediaKind("https://cdn.example.test/image.gif?file=.mp4"),
    "image",
  );
  assert(exerciseMediaPage("https://giphy.com/gifs/some-public-page"));
  assert(!exerciseMediaPage("https://media.giphy.com/media/example/giphy.gif"));
});
test("preview and saved exercise media render GIF as an image and MP4 as a video", () => {
  const { ExerciseMedia } = loadTs("src/components/shared/ExerciseMedia.tsx");
  const gif = renderToStaticMarkup(
    React.createElement(ExerciseMedia, {
      src: "https://cdn.example.test/demo.gif",
      alt: "Demo",
    }),
  );
  assert(gif.includes("<img "));
  assert(gif.includes('referrerPolicy="no-referrer"'));
  assert(!gif.includes("<video"));
  const video = renderToStaticMarkup(
    React.createElement(ExerciseMedia, {
      src: "https://cdn.example.test/demo.mp4?token=1",
      alt: "Demo",
    }),
  );
  assert(video.includes("<video "));
  assert(video.includes('controls=""'));
  assert(!video.includes("<img "));
});
test("save schema normalizes direct media URLs and rejects webpage links", () => {
  const { upsertExerciseSchema } = loadTs("src/schemas/workouts.ts");
  const base = {
    name_pt: "Teste",
    name_en: "Test",
    source: "custom",
    primary_muscle: "chest",
  };
  assert.equal(
    upsertExerciseSchema.parse({
      ...base,
      gif_url: " https://cdn.example.test/demo.gif ",
    }).gif_url,
    "https://cdn.example.test/demo.gif",
  );
  assert(
    upsertExerciseSchema.safeParse({
      ...base,
      gif_url: "https://cdn.example.test/demo.mp4",
    }).success,
  );
  assert(
    !upsertExerciseSchema.safeParse({
      ...base,
      gif_url: "https://tenor.com/view/example-gif-12345",
    }).success,
  );
  assert(
    !upsertExerciseSchema.safeParse({ ...base, gif_url: "javascript:alert(1)" })
      .success,
  );
});
