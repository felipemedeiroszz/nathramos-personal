import { PublicHeader } from "@/components/shared/PublicHeader";
import { PublicFooter } from "@/components/shared/PublicFooter";
import "./public.css";
import { PublicMotion } from "./PublicMotion";
export function PublicShell({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return (
    <div className="public-site flex min-h-dvh flex-col bg-background text-text">
      <PublicMotion locale={locale} />
      <a
        href="#public-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-xl focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        {locale === "en-US" ? "Skip to content" : "Ir para o conteúdo"}
      </a>
      <PublicHeader locale={locale} />
      <div
        id="public-content"
        tabIndex={-1}
        className="min-w-0 flex-1 outline-none"
      >
        {children}
      </div>
      <PublicFooter locale={locale} />
    </div>
  );
}
