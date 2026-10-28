"use client";
export default function BillingError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-28 space-y-4">
      <h1 className="text-2xl font-bold">
        Não foi possível carregar os pagamentos / Unable to load payments
      </h1>
      <p>
        Confira sua conexão e tente novamente. Seu histórico e seus pagamentos
        foram preservados.
      </p>
      <button
        className="rounded-xl bg-primary px-5 py-3 text-primary-foreground"
        onClick={reset}
      >
        Tentar novamente / Retry
      </button>
    </main>
  );
}
