import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
const { contentHref } = loadTs("src/lib/content/links.ts");
const { resolveContentPage, DEFAULT_CONTENT_PAGES } = loadTs(
  "src/lib/content/contentPages.ts",
);

test("links de conteúdo preservam idioma e rejeitam destinos executáveis", () => {
  assert.equal(contentHref("/pt-BR/planos", "pt-BR"), "/pt-BR/planos");
  assert.equal(
    contentHref("/en-US/planos#assinar", "pt-BR"),
    "/en-US/planos#assinar",
  );
  assert.equal(contentHref("/planos", "en-US"), "/en-US/planos");
  assert.equal(contentHref("planos", "pt-BR"), "/pt-BR/planos");
  assert.equal(
    contentHref("https://example.test", "pt-BR"),
    "https://example.test",
  );
  assert.equal(
    contentHref("mailto:help@example.test", "pt-BR"),
    "mailto:help@example.test",
  );
  assert.equal(contentHref("#section-1", "pt-BR"), "#section-1");
  for (const url of [
    "javascript:alert(1)",
    "//evil.test",
    "data:text/html,test",
    "java\nscript:alert(1)",
    "/\\evil.test",
    "",
  ])
    assert.equal(contentHref(url, "pt-BR"), null);
});

const row = {
  is_active: true,
  title_pt: "Minha página",
  title_en: "",
  subtitle_pt: "Descrição",
  subtitle_en: " ",
  image_url: "",
  cta_label_pt: "Assinar",
  cta_label_en: "",
  cta_url: "/pt-BR/planos",
  blocks: [
    {
      id: "one",
      title_pt: "Pergunta",
      title_en: "",
      subtitle_pt: "Categoria",
      subtitle_en: "",
      text_pt: "Primeiro\n\nSegundo",
      text_en: "",
      image_url: "",
      button_label_pt: "Ver",
      button_label_en: "",
      button_url: "/planos",
    },
  ],
};
test("idioma vazio usa alternativa e mantém parágrafos, imagens e botões", () => {
  const result = resolveContentPage(row, DEFAULT_CONTENT_PAGES.faq, "en-US");
  assert.equal(result.title, "Minha página");
  assert.equal(result.subtitle, "Descrição");
  assert.equal(result.blocks[0].title, "Pergunta");
  assert.equal(result.blocks[0].text, "Primeiro\n\nSegundo");
  assert.equal(result.blocks[0].buttonLabel, "Ver");
});
test("desativar conteúdo personalizado retorna ao padrão sem apagar o conteúdo salvo", () => {
  const original = JSON.stringify(row);
  const result = resolveContentPage(
    { ...row, is_active: false },
    DEFAULT_CONTENT_PAGES.faq,
    "pt-BR",
  );
  assert.equal(result.title, DEFAULT_CONTENT_PAGES.faq.titlePt);
  assert.equal(result.blocks.length, DEFAULT_CONTENT_PAGES.faq.blocks.length);
  assert.equal(JSON.stringify(row), original);
});
test("página personalizada pode ter zero blocos; registro inicial vazio usa padrão", () => {
  assert.equal(
    resolveContentPage(
      { ...row, blocks: [] },
      DEFAULT_CONTENT_PAGES.faq,
      "pt-BR",
    ).blocks.length,
    0,
  );
  assert.equal(
    resolveContentPage(
      { ...row, title_pt: null, title_en: null, blocks: [] },
      DEFAULT_CONTENT_PAGES.faq,
      "pt-BR",
    ).blocks.length,
    DEFAULT_CONTENT_PAGES.faq.blocks.length,
  );
});
