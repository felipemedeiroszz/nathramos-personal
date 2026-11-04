"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Clock3,
  FileText,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  ResolvedContentBlock,
  ResolvedContentPage,
} from "@/lib/content/contentPages";
import { contentHref } from "@/lib/content/links";
import "@/components/public/content-pages.css";

interface ContentPageViewProps {
  page: ResolvedContentPage;
  variant?: "blocks" | "faq";
  locale: string;
  /** Same rendering as the published page, embedded inside the editor. */
  embedded?: boolean;
}

function PageButton({
  label,
  url,
  locale,
}: {
  label: string;
  url: string;
  locale: string;
}) {
  const href = contentHref(url, locale);
  if (!label || !href) return null;
  return (
    <Link
      className="content-link-button"
      href={href}
      {...(/^https?:\/\//i.test(href)
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {label}
      <ArrowUpRight size={17} />
    </Link>
  );
}

function BlockBody({
  block,
  locale,
}: {
  block: ResolvedContentBlock;
  locale: string;
}) {
  return (
    <>
      {block.imageUrl && (
        <div className="content-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.imageUrl} alt={block.title} loading="lazy" />
        </div>
      )}
      <div className="content-prose">
        {block.text
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p, index) => (
            <p key={index}>{p}</p>
          ))}
      </div>
      <PageButton
        label={block.buttonLabel}
        url={block.buttonUrl}
        locale={locale}
      />
    </>
  );
}

function FaqContent({
  page,
  locale,
  prefix,
}: {
  page: ResolvedContentPage;
  locale: string;
  prefix: string;
}) {
  const en = locale === "en-US";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const categories = Array.from(
    new Set(page.blocks.map((block) => block.subtitle).filter(Boolean)),
  );
  const filtered = page.blocks.filter(
    (block) =>
      (!category || block.subtitle === category) &&
      normalize(`${block.title} ${block.text} ${block.subtitle}`).includes(
        normalize(query.trim()),
      ),
  );
  const groups = Array.from(new Set(filtered.map((block) => block.subtitle)));
  return (
    <>
      <div className="content-search-wrap">
        <div className="content-search">
          <Search size={21} aria-hidden />
          <label className="sr-only" htmlFor={`${prefix}-search`}>
            {en ? "Search questions" : "Buscar dúvidas"}
          </label>
          <input
            id={`${prefix}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              en ? "What would you like to know?" : "Qual é a sua dúvida?"
            }
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={en ? "Clear search" : "Limpar busca"}
            >
              <X size={17} />
            </button>
          )}
        </div>
        <p>
          {en
            ? "Search by topic, keyword or question."
            : "Busque por assunto, palavra ou pergunta."}
        </p>
      </div>
      <div className="content-faq-layout">
        <nav
          className="content-categories"
          aria-label={en ? "Question topics" : "Assuntos das dúvidas"}
        >
          <span className="content-small-label">
            {en ? "Explore by topic" : "Explore por assunto"}
          </span>
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => setCategory(null)}
          >
            {en ? "All questions" : "Todas as dúvidas"}
            <span>{page.blocks.length}</span>
          </button>
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
              <span>
                {page.blocks.filter((block) => block.subtitle === item).length}
              </span>
            </button>
          ))}
        </nav>
        <div className="content-faq-results">
          <div className="content-results-label" role="status">
            {query || category
              ? `${filtered.length} ${en ? (filtered.length === 1 ? "question found" : "questions found") : filtered.length === 1 ? "dúvida encontrada" : "dúvidas encontradas"}`
              : en
                ? "Everything you need to know"
                : "Tudo o que você precisa saber"}
          </div>
          {filtered.length === 0 ? (
            <div className="content-no-results">
              <Search size={28} />
              <h2>{en ? "No questions found" : "Nenhuma dúvida encontrada"}</h2>
              <p>
                {en
                  ? "Try another word or explore all topics."
                  : "Tente outra palavra ou explore todos os assuntos."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                }}
              >
                {en ? "View all questions" : "Ver todas as dúvidas"}
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group || "general"} className="content-faq-group">
                {group && <h2>{group}</h2>}
                {filtered
                  .filter((block) => block.subtitle === group)
                  .map((block) => (
                    <details className="content-question" key={block.id}>
                      <summary>
                        <span>
                          {block.title || (en ? "Question" : "Pergunta")}
                        </span>
                        <span className="content-question-toggle">
                          <ChevronDown size={18} />
                        </span>
                      </summary>
                      <div className="content-answer">
                        <BlockBody block={block} locale={locale} />
                      </div>
                    </details>
                  ))}
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export function ContentPageView({
  page,
  variant = "blocks",
  locale,
  embedded = false,
}: ContentPageViewProps) {
  const en = locale === "en-US",
    faq = variant === "faq";
  const prefix = useId().replace(/:/g, "");
  const minutes = Math.max(
    1,
    Math.ceil(
      page.blocks
        .map((block) => block.text)
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length / 220,
    ),
  );
  const Wrapper = embedded ? "div" : "main";
  return (
    <Wrapper
      className={`content-page ${embedded ? "content-page-embedded" : ""}`}
    >
      <div className="content-page-wrap">
        {!embedded && (
          <nav
            className="content-breadcrumb"
            aria-label={en ? "Breadcrumb" : "Navegação estrutural"}
          >
            <Link href={`/${locale}`}>{en ? "Home" : "Início"}</Link>
            <span>/</span>
            <span>
              {faq
                ? en
                  ? "Help center"
                  : "Central de dúvidas"
                : en
                  ? "Information"
                  : "Informações"}
            </span>
          </nav>
        )}
        <header className={`content-hero ${faq ? "content-hero-faq" : ""}`}>
          <div>
            <div className="content-eyebrow">
              <span />
              {faq
                ? en
                  ? "Clarity for your next step"
                  : "Clareza para o seu próximo passo"
                : en
                  ? "Transparency at every step"
                  : "Transparência em cada etapa"}
            </div>
            <h1>{page.title}</h1>
            <p className="content-subtitle">
              {page.subtitle ||
                (en
                  ? "Read at your own pace. Find the information you need, organized in one place."
                  : "Leia no seu ritmo. Encontre as informações que precisa, organizadas em um só lugar.")}
            </p>
            <div className="content-meta">
              {faq ? (
                <>
                  <BookOpen size={14} />
                  <span>
                    {page.blocks.length}{" "}
                    {en
                      ? "questions, clear answers"
                      : "dúvidas, respostas diretas"}
                  </span>
                </>
              ) : (
                <>
                  <Clock3 size={14} />
                  <span>
                    {minutes} {en ? "min read" : "min de leitura"}
                  </span>
                  <span className="content-meta-dot">·</span>
                  <span>
                    {page.blocks.length} {en ? "sections" : "seções"}
                  </span>
                </>
              )}
            </div>
            <PageButton
              label={page.ctaLabel}
              url={page.ctaUrl}
              locale={locale}
            />
          </div>
          <div className="content-hero-symbol" aria-hidden>
            {faq ? <BookOpen /> : <ShieldCheck />}
            <span>NR / {faq ? "HELP" : "INFO"}</span>
          </div>
        </header>
        {page.imageUrl && (
          <div className="content-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.imageUrl} alt={page.title} />
          </div>
        )}
        {faq ? (
          <FaqContent page={page} locale={locale} prefix={prefix} />
        ) : (
          <div className="content-document-layout">
            <aside className="content-document-index">
              <nav aria-label={en ? "On this page" : "Nesta página"}>
                <span className="content-small-label">
                  <FileText size={14} />
                  {en ? "On this page" : "Nesta página"}
                </span>
                {page.blocks.map((block, index) => (
                  <a key={block.id} href={`#${prefix}-section-${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {block.title || `${en ? "Section" : "Seção"} ${index + 1}`}
                  </a>
                ))}
              </nav>
              <p>
                {en
                  ? "Information always within reach."
                  : "Informação sempre ao seu alcance."}
              </p>
            </aside>
            <article className="content-document">
              {page.blocks.map((block, index) => (
                <section
                  key={block.id}
                  id={`${prefix}-section-${index}`}
                  tabIndex={-1}
                >
                  <span className="content-section-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    {block.title && <h2>{block.title}</h2>}
                    {block.subtitle && (
                      <p className="content-section-subtitle">
                        {block.subtitle}
                      </p>
                    )}
                    <BlockBody block={block} locale={locale} />
                  </div>
                </section>
              ))}
            </article>
          </div>
        )}
        <div className="content-bottom-note">
          <ShieldCheck size={20} />
          <div>
            <strong>
              {en
                ? "A clear, informed journey."
                : "Uma jornada clara e bem informada."}
            </strong>
            <p>
              {en
                ? "Explore the information about your experience on the platform."
                : "Conheça as informações sobre sua experiência na plataforma."}
            </p>
          </div>
          <Link href={`/${locale}/${faq ? "privacidade" : "faq"}`}>
            {faq
              ? en
                ? "Privacy"
                : "Privacidade"
              : en
                ? "Questions & answers"
                : "Tirar dúvidas"}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </Wrapper>
  );
}
