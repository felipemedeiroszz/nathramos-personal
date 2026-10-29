"use client";
import { useLocale } from "next-intl";
import { Skeleton } from "@/components/ui/Skeleton";
export default function Loading() {
  const en = useLocale() === "en-US";
  return (
    <div
      role="status"
      aria-label={en ? "Loading your space" : "Carregando seu espaço"}
      className="space-y-6"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-80 rounded-[20px]" />
        <Skeleton className="h-80 rounded-[20px]" />
      </div>
      <span className="sr-only">
        {en ? "Loading your routine" : "Carregando sua rotina"}
      </span>
    </div>
  );
}
