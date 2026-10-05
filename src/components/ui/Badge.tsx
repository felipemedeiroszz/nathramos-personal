import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "outline";
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-colors",
          {
            "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.2)]": variant === "default",
            "bg-green-600 text-white": variant === "success",
            "bg-yellow-600 text-white": variant === "warning",
            "bg-red-600 text-white": variant === "error",
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
