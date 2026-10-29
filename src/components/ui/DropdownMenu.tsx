"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, useRef, useState } from "react";

export interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  trigger: React.ReactNode;
}

export interface DropdownMenuItemProps extends HTMLAttributes<HTMLButtonElement> {}

export function DropdownMenu({
  trigger,
  children,
  className,
  ...props
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            data-ui="dropdown"
            className={cn(
              "absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-surface shadow-lg z-20 overflow-hidden",
              className,
            )}
            {...props}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export function DropdownMenuContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("py-1", className)} {...props}>
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  className,
  children,
  onClick,
  ...props
}: DropdownMenuItemProps) {
  return (
    <button
      onClick={(e) => {
        onClick?.(e);
      }}
      className={cn(
        "w-full flex items-center px-4 py-2 text-sm text-text hover:bg-surface-secondary transition-colors focus-visible:outline-none focus-visible:bg-surface-secondary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px bg-border my-1", className)} {...props} />;
}
