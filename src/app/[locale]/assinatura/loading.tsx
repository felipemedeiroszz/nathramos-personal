export default function BillingLoading() {
  return (
    <main
      className="mx-auto max-w-6xl px-6 py-28 space-y-5"
      aria-busy="true"
      aria-label="Carregando pagamentos / Loading payments"
    >
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-surface-secondary" />
      <div className="h-56 animate-pulse rounded-2xl bg-surface-secondary" />
      <div className="h-72 animate-pulse rounded-2xl bg-surface-secondary" />
    </main>
  );
}
