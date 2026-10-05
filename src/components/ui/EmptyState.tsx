import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary mb-4 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
