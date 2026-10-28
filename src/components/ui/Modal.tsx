"use client";

import { useDialogFocus } from "./useDialogFocus";
import { cn } from "@/lib/utils";
import { HTMLAttributes, ButtonHTMLAttributes, useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  ...props
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useDialogFocus(isOpen, onClose, modalRef);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={props["aria-label"] || "Dialog"}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl animate-fade-in",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between mb-4", className)}
      {...props}
    />
  );
}

export function ModalTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold text-text", className)}
      {...props}
    />
  );
}

export function ModalClose({
  onClick,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      className={cn(
        "p-2 hover:bg-surface-secondary rounded-lg transition-colors text-text-secondary hover:text-text",
        className,
      )}
      {...props}
    >
      <X size={20} />
    </button>
  );
}

export function ModalBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

export function ModalFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3", className)}
      {...props}
    />
  );
}
