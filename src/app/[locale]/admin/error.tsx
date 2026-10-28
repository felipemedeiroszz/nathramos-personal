"use client";
import { Button } from "@/components/ui/Button";
export default function AdminError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-xl border border-border p-6 space-y-4"
    >
      <h2 className="text-xl font-bold">Não foi possível carregar o painel</h2>
      <p>
        Os dados estão indisponíveis. Tente novamente antes de tomar decisões ou
        repetir uma alteração.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </section>
  );
}
