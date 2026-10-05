import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

export function Progress({ value = 0, max = 100, className, ...props }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-surface-secondary",
        className
      )}
      {...props}
    >
      <div
        className="h-full w-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
