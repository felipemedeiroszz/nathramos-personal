"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps extends HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  ...props
}: PaginationProps) {
  const pages = [];
  const showPages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
  let endPage = Math.min(totalPages, startPage + showPages - 1);

  if (endPage - startPage + 1 < showPages) {
    startPage = Math.max(1, endPage - showPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-surface text-text hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} />
      </button>

      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-surface text-text hover:bg-surface-secondary transition-colors"
          >
            1
          </button>
          {startPage > 2 && <span className="text-text-secondary">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={cn(
            "h-9 w-9 flex items-center justify-center rounded-lg border transition-colors",
            currentPage === page
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-text hover:bg-surface-secondary"
          )}
        >
          {page}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="text-text-secondary">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-surface text-text hover:bg-surface-secondary transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-surface text-text hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
