"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanBanner } from "@/lib/supabase/types";

interface PlanBannersProps {
  banners: PlanBanner[];
  locale: string;
  prevLabel: string;
  nextLabel: string;
}

export function PlanBanners({
  banners,
  locale,
  prevLabel,
  nextLabel,
}: PlanBannersProps) {
  const count = banners.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = setInterval(() => setIndex((p) => (p + 1) % count), 6000);
    return () => clearInterval(timer);
  }, [paused, count]);

  if (count === 0) return null;

  const isPt = locale === "pt-BR";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border/40 shadow-[0_0_60px_hsl(var(--primary)/0.08)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((banner, i) => {
          const title = isPt ? banner.title_pt : banner.title_en;
          const subtitle = isPt ? banner.subtitle_pt : banner.subtitle_en;
          const ctaLabel = isPt ? banner.cta_label_pt : banner.cta_label_en;
          const badge = isPt ? banner.badge_pt : banner.badge_en;
          const hasContent = Boolean(title || subtitle || ctaLabel || badge);

          return (
            <div
              key={banner.id ?? i}
              className="relative w-full shrink-0 aspect-[16/9] sm:aspect-[16/6] md:aspect-[16/5]"
            >
              <Image
                src={banner.image_url}
                alt={title || ""}
                fill
                sizes="(max-width: 768px) 100vw, 1152px"
                className="object-cover"
              />
              {hasContent && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end gap-2 sm:gap-3 p-5 sm:p-8 md:p-12 max-w-2xl">
                    {badge && (
                      <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {badge}
                      </span>
                    )}
                    {title && (
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-white">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="text-sm sm:text-base md:text-lg text-white/80">
                        {subtitle}
                      </p>
                    )}
                    {ctaLabel && banner.cta_href && (
                      <div className="pt-1 sm:pt-2">
                        <Link
                          href={banner.cta_href}
                          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_35px_hsl(var(--primary)/0.55)] sm:h-12 sm:px-6 sm:text-base"
                        >
                          {ctaLabel}
                          <ChevronRight size={18} />
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={prevLabel}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={nextLabel}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
          >
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner.id ?? i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-primary" : "w-2 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default PlanBanners;
