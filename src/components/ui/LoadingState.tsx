import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  message?: string;
}

export function LoadingState({ message = "Carregando...", className, ...props }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
      {...props}
    >
      <div className="w-12 h-12 rounded-full border-4 border-surface-secondary border-t-primary animate-spin mb-4" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}
