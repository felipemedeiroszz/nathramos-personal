import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";

export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Ocorreu um erro ao carregar os dados. Tente novamente.",
  action,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
      {...props}
    >
      <div className="w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center mb-4">
        <AlertCircle size={32} className="text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      <p className="text-sm text-text-secondary mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  );
}
