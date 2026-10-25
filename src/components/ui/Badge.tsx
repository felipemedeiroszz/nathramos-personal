import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "soft" | "success" | "warning" | "error" | "neutral" | "outline";
}

/**
 * Selo/etiqueta de status.
 * Todas as variantes usam apenas a paleta oficial:
 * dourado (positivo), neutro e alto contraste branco (crítico).
 */
const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-colors",
          {
            "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.2)]": variant === "default",
            "border border-primary/30 bg-primary/10 text-primary": variant === "soft" || variant === "success",
            "border border-border bg-surface-secondary text-text-secondary": variant === "neutral" || variant === "warning",
            "border border-text/25 bg-text/[0.08] text-text": variant === "error",
            "border border-border/60 text-text hover:border-primary/60": variant === "outline",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
