import type { PageHeaderProps } from "@/components/ui/PageHeader";
export function StudentPageHeader({
  title,
  description,
  icon,
  actions,
  eyebrow,
  locale = "pt-BR",
  className,
  ...props
}: PageHeaderProps & { locale?: string }) {
  return (
    <header className={`student-page-header ${className || ""}`} {...props}>
      <div className="min-w-0">
        <p className="student-eyebrow">
          {eyebrow ||
            (locale === "en-US"
              ? "YOUR JOURNEY, YOUR PACE"
              : "SUA JORNADA, SEU RITMO")}
        </p>
        <h1>
          {title}
          <span className="text-yellow-300">.</span>
        </h1>
        {description && (
          <p className="student-page-description">{description}</p>
        )}
      </div>
      {actions ? (
        <div className="flex flex-wrap gap-2">{actions}</div>
      ) : (
        icon && (
          <div
            aria-hidden="true"
            className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 sm:flex"
          >
            {icon}
          </div>
        )
      )}
    </header>
  );
}
