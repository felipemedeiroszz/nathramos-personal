"use client";

import { useDialogFocus } from "./useDialogFocus";
import { cn } from "@/lib/utils";
import { HTMLAttributes, useEffect, useRef } from "react";

export interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
}

export function Dialog({
  isOpen,
  onClose,
  children,
  className,
  ...props
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        data-ui="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={props["aria-label"] || "Dialog"}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl animate-fade-in",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function DialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 mb-4", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-text",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-text-secondary", className)} {...props} />
  );
}

export function DialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3 mt-4", className)}
      {...props}
    />
  );
}
