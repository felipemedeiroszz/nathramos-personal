import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-11 w-full rounded-lg border border-border/60 bg-surface/50 px-4 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 appearance-none cursor-pointer",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export { Select };
