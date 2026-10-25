import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export type CalloutVariant = "info" | "neutral" | "success" | "danger";

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CalloutVariant;
  title?: string;
  /** Substitui o ícone padrão da variante. */
  icon?: React.ReactNode;
}

/**
 * Mensagem de feedback/aviso em linha.
 * Utiliza exclusivamente a paleta oficial: dourado (positivo), neutro e
 * alto contraste em branco para estados críticos — sem cores fora da identidade.
 */
const VARIANT_STYLES: Record<CalloutVariant, string> = {
  success: "border-primary/30 bg-primary/10",
  info: "border-border bg-surface-secondary",
  neutral: "border-border bg-surface-secondary",
  danger: "border-text/25 bg-text/[0.06]",
};

const ICON_STYLES: Record<CalloutVariant, string> = {
  success: "text-primary",
  info: "text-text-secondary",
  neutral: "text-text-secondary",
  danger: "text-text",
};

export function Callout({
  variant = "info",
  title,
  icon,
  className,
  children,
  ...props
}: CalloutProps) {
  const defaultIcon =
    variant === "success" ? (
      <CheckCircle2 size={18} />
    ) : variant === "danger" ? (
      <AlertTriangle size={18} />
    ) : (
      <Info size={18} />
    );

  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-fade-in",
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      <span className={cn("mt-0.5 shrink-0", ICON_STYLES[variant])}>
        {icon ?? defaultIcon}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold text-text">{title}</p>}
        {children && (
          <div className={cn(variant === "success" ? "text-text" : "text-text-secondary")}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
