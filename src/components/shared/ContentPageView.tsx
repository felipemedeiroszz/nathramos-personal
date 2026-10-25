import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FAQItem } from "@/components/shared/FAQItem";
import type { ResolvedContentPage } from "@/lib/content/contentPages";

interface ContentPageViewProps {
  page: ResolvedContentPage;
  /** "faq" agrupa os blocos por categoria e exibe em acordeão. */
  variant?: "blocks" | "faq";
  locale: string;
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
  if (!label || !url) return null;
  const href = url.startsWith("http") || url.startsWith("mailto:") ? url : `/${locale}${url.startsWith("/") ? "" : "/"}${url}`;
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");

  return (
    <Button asChild size="lg" className="w-fit">
      {isExternal ? (
        <a href={href} target="_blank" rel="noreferrer">
          {label}
          <ArrowRight size={18} className="ml-2" />
        </a>
      ) : (
        <Link href={href}>
          {label}
          <ArrowRight size={18} className="ml-2" />
        </Link>
      )}
    </Button>
  );
}

export function ContentPageView({
  page,
  variant = "blocks",
  locale,
}: ContentPageViewProps) {
  const paragraphs = (text: string) =>
    text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

  return (
    <main className="flex-1 w-full">
      <article className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
        <header className="mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-lg text-text-secondary max-w-2xl">{page.subtitle}</p>
          )}
          {page.imageUrl && (
            <div className="overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.imageUrl}
                alt={page.title}
                className="h-auto w-full object-cover"
              />
            </div>
          )}
          {page.ctaLabel && page.ctaUrl && (
            <PageButton label={page.ctaLabel} url={page.ctaUrl} locale={locale} />
          )}
        </header>

        {variant === "faq" ? (
          <FaqBlocks blocks={page.blocks} paragraphs={paragraphs} />
        ) : (
          <div className="space-y-12">
            {page.blocks.map((block) => (
              <section key={block.id} className="space-y-4">
                {block.imageUrl && (
                  <div className="overflow-hidden rounded-2xl border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={block.imageUrl}
                      alt={block.title}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                )}
                {block.title && (
                  <h2 className="text-xl font-semibold text-text pb-3 border-b border-border">
                    {block.title}
                  </h2>
                )}
                {block.subtitle && (
                  <p className="text-sm font-medium text-primary">{block.subtitle}</p>
                )}
                <div className="space-y-3">
                  {paragraphs(block.text).map((p, i) => (
                    <p key={i} className="text-text-secondary leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
                {block.buttonLabel && block.buttonUrl && (
                  <PageButton
                    label={block.buttonLabel}
                    url={block.buttonUrl}
                    locale={locale}
                  />
                )}
              </section>
            ))}
          </div>
        )}
      </article>
    </main>
  );
}

function FaqBlocks({
  blocks,
  paragraphs,
}: {
  blocks: ResolvedContentPage["blocks"];
  paragraphs: (text: string) => string[];
}) {
  const groups: { category: string; items: typeof blocks }[] = [];
  for (const block of blocks) {
    const category = block.subtitle || "";
    const existing = groups.find((g) => g.category === category);
    if (existing) existing.items.push(block);
    else groups.push({ category, items: [block] });
  }

  return (
    <div className="space-y-12">
      {groups.map((group, groupIndex) => (
        <div key={`${group.category}-${groupIndex}`}>
          {group.category && (
            <div className="flex items-center gap-3 mb-6">
              <Badge variant="outline">{group.category}</Badge>
            </div>
          )}
          <div className="space-y-3">
            {group.items.map((block, index) => (
              <FAQItem
                key={block.id}
                question={block.title}
                answer={paragraphs(block.text).join("\n\n")}
                defaultOpen={groupIndex === 0 && index === 0}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
