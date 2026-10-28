"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
export function AdminCurrencySelector({ currency }: { currency: string }) {
  const pathname = usePathname();
  const current = useSearchParams();
  return (
    <div className="space-y-2">
      <nav className="flex gap-2" aria-label="Moeda dos relatórios">
        {["BRL", "USD"].map((code) => {
          const query = new URLSearchParams(current.toString());
          query.set("currency", code);
          return (
            <Link
              key={code}
              href={`${pathname}?${query}`}
              aria-current={currency === code ? "page" : undefined}
              className={`rounded-lg border px-4 py-2 text-sm ${currency === code ? "border-primary text-primary" : "border-border"}`}
            >
              {code}
            </Link>
          );
        })}
      </nav>
      <p className="text-xs text-text-secondary">
        Receita bruta de pagamentos aprovados, sem conversão de moedas. MRR
        estimado em ciclos de 30 dias, sem cancelamentos agendados. Contagem de
        alunos considera toda a base.
      </p>
    </div>
  );
}
