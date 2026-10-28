import { Skeleton } from "@/components/ui/Skeleton";
export default function Loading() {
  return (
    <div role="status" aria-label="Carregando painel" className="space-y-5">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
      <span className="sr-only">Carregando dados</span>
    </div>
  );
}
