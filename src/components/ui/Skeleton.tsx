import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-secondary", className)}
      {...props}
    />
  );
}
