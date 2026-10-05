"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, useRef, useState } from "react";

export interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children, className, ...props }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black/90 rounded whitespace-nowrap z-50",
            className
          )}
          {...props}
        >
          {content}
        </div>
      )}
    </div>
  );
}
