"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
}

export function Modal({ isOpen, onClose, children, className, ...props }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className={cn(
          "relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl animate-fade-in",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...props} />
  );
}

export function ModalTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold text-text", className)} {...props} />
  );
}

export function ModalClose({ onClick, className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 hover:bg-surface-secondary rounded-lg transition-colors text-text-secondary hover:text-text",
        className
      )}
      {...props}
    >
      <X size={20} />
    </button>
  );
}

export function ModalBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

export function ModalFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-end gap-3", className)} {...props} />
  );
}
