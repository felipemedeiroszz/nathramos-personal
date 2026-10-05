"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
  className?: string;
}

export function FAQItem({
  question,
  answer,
  defaultOpen = false,
  className,
}: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-surface-secondary/50"
        aria-expanded={isOpen}
      >
        <h3 className="font-semibold text-text pr-4">{question}</h3>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-text-secondary transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        >
          <ChevronDown size={18} strokeWidth={2} />
        </div>
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="p-5 pt-0 text-text-secondary">
            <p>{answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
