"use client";

import { useDialogFocus } from "./useDialogFocus";
import { cn } from "@/lib/utils";
import { HTMLAttributes, ButtonHTMLAttributes, useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface DrawerProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  position?: "right" | "left" | "top" | "bottom";
}

export function Drawer({
  isOpen,
  onClose,
  position = "right",
  children,
  className,
  ...props
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useDialogFocus(isOpen, onClose, drawerRef);

  if (!isOpen) return null;

  const positionClasses = {
    right: "right-0 h-full w-80 border-l",
    left: "left-0 h-full w-80 border-r",
    top: "top-0 w-full h-80 border-b",
    bottom: "bottom-0 w-full h-80 border-t",
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        data-ui="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={props["aria-label"] || "Dialog"}
        tabIndex={-1}
        className={cn(
          "absolute bg-surface shadow-xl animate-fade-in",
          positionClasses[position],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function DrawerHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-6 border-b border-border",
        className,
      )}
      {...props}
    />
  );
}

export function DrawerTitle({
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

export function DrawerClose({
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

export function DrawerContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 overflow-y-auto flex-1", className)} {...props} />
  );
}

export function DrawerFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 border-t border-border", className)} {...props} />
  );
}
