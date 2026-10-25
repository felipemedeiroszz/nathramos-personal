import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  /** Ícone vetorial (Lucide) exibido em um selo ao lado do título. */
  icon?: React.ReactNode;
  /** Ações alinhadas à direita (botões, filtros, etc.). */
  actions?: React.ReactNode;
  /** Rótulo de contexto acima do título (ex.: "Área do aluno"). */
  eyebrow?: string;
}

/**
 * Cabeçalho padrão das páginas internas.
 * Garante hierarquia consistente: contexto, título, descrição e ações.
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  eyebrow,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 pb-5 border-b border-border sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-secondary text-primary">
            {icon}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-text md:text-3xl">{title}</h1>
          {description && (
            <p className="text-sm text-text-secondary md:text-base">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
