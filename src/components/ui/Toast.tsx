"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, useEffect, useState } from "react";

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  children,
  className,
  duration = 3000,
  onClose,
  ...props
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg animate-fade-in",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ToastTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("font-semibold text-text", className)} {...props} />
  );
}

export function ToastDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm text-text-secondary", className)} {...props} />
  );
}
