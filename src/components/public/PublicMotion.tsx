"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

/** Progressive enhancement: content stays readable without JavaScript or motion. */
export function PublicMotion({ locale }: { locale: string }) {
  const pathname = usePathname();
  const progress = useRef<HTMLDivElement>(null);
  const topButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = progress.current?.closest(".public-site");
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const elements = Array.from(
      root.querySelectorAll<HTMLElement>(
        "main h1, main h2, main .public-eyebrow, main .public-feature, main [data-ui=card], main .public-trainer-portrait, main details, main [data-reveal]",
      ),
    ).filter(
      (element) =>
        !element.parentElement?.closest(
          ".public-feature, [data-ui=card], [data-reveal]",
        ),
    );
    let observer: IntersectionObserver | undefined;
    const setup = () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      if (preference.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver(
        (entries) => {
          const entering = entries.filter((entry) => entry.isIntersecting);
          entering.forEach((entry, index) => {
            observer?.unobserve(entry.target);
            const animation = entry.target.animate(
              [
                { opacity: 0, transform: "translateY(22px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              {
                duration: 720,
                delay: Math.min(index * 65, 260),
                easing: "cubic-bezier(.22,1,.36,1)",
              },
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
      );
      elements.forEach((element) => observer?.observe(element));
    };
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = document.documentElement.scrollHeight - innerHeight;
      progress.current?.style.setProperty(
        "--reading-progress",
        String(distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0),
      );
      root.toggleAttribute("data-scrolled", scrollY > 24);
      const visible = scrollY > innerHeight;
      if (topButton.current) {
        topButton.current.hidden = !visible;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    setup();
    update();
    preference.addEventListener("change", setup);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", setup);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.removeAttribute("data-scrolled");
    };
  }, [pathname]);

  return (
    <>
      <div
        ref={progress}
        className="public-reading-progress"
        aria-hidden="true"
      />
      <button
        ref={topButton}
        hidden
        type="button"
        className="public-back-top"
        aria-label={
          locale === "en-US" ? "Back to top" : "Voltar ao início da página"
        }
        onClick={() => {
          document
            .querySelector<HTMLElement>("#public-content")
            ?.focus({ preventScroll: true });
          window.scrollTo({
            top: 0,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
          });
        }}
      >
        <ArrowUp size={18} />
      </button>
    </>
  );
}
