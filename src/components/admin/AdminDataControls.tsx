import Link from "next/link";
import type { PageParams } from "@/lib/admin/data-page";
export function AdminDataControls({
  params,
  total,
  page,
  size,
  locale,
  finance = false,
  exportUrl,
}: {
  params: PageParams;
  total: number;
  page: number;
  size: number;
  locale: string;
  finance?: boolean;
  exportUrl?: string;
}) {
  const en = locale === "en-US";
  const query = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => !!entry[1],
    ),
  );
  const href = (n: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(n));
    return "?" + next.toString();
  };
  return (
    <section className="space-y-3">
      <form className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          {en ? "Search all records" : "Buscar em todos os registros"}
          <input
            name="q"
            defaultValue={params.q}
            maxLength={200}
            className="block border border-border bg-surface rounded-lg p-2"
          />
        </label>
        {finance && (
          <>
            <label className="text-sm">
              {en ? "From" : "De"}
              <input
                type="date"
                name="from"
                defaultValue={params.from}
                className="block bg-surface border border-border rounded-lg p-2"
              />
            </label>
            <label className="text-sm">
              {en ? "Through" : "Até"}
              <input
                type="date"
                name="to"
                defaultValue={params.to}
                className="block bg-surface border border-border rounded-lg p-2"
              />
            </label>
            <label className="text-sm">
              {en ? "Currency" : "Moeda"}
              <select
                name="currency"
                defaultValue={params.currency || "BRL"}
                className="block bg-surface border border-border rounded-lg p-2"
              >
                <option>BRL</option>
                <option>USD</option>
              </select>
            </label>
            <label className="text-sm">
              {en ? "Provider" : "Provedor"}
              <select
                name="provider"
                defaultValue={params.provider || "all"}
                className="block bg-surface border border-border rounded-lg p-2"
              >
                <option value="all">{en ? "All" : "Todos"}</option>
                <option value="stripe">Stripe</option>
                <option value="asaas">Asaas</option>
              </select>
            </label>
            <label className="text-sm">
              Status
              <input
                name="status"
                defaultValue={params.status}
                placeholder="active / paid"
                className="block bg-surface border border-border rounded-lg p-2"
              />
            </label>
          </>
        )}
        <button
          type="submit"
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2"
        >
          {en ? "Apply" : "Aplicar"}
        </button>
      </form>
      <nav
        className="flex flex-wrap gap-4 text-sm"
        aria-label={en ? "Pagination" : "Paginação"}
      >
        <span>
          {total} {en ? "records" : "registros"} · {page}/
          {Math.max(1, Math.ceil(total / size))}
        </span>
        {page > 1 && (
          <Link className="underline" href={href(page - 1)}>
            {en ? "Previous" : "Anterior"}
          </Link>
        )}
        {page * size < total && (
          <Link className="underline" href={href(page + 1)}>
            {en ? "Next" : "Próxima"}
          </Link>
        )}
        {exportUrl && (
          <a className="underline" href={exportUrl + "?" + query.toString()}>
            {en ? "Export filtered CSV" : "Exportar CSV filtrado"}
          </a>
        )}
      </nav>
      <p className="text-xs text-text-secondary">
        {en
          ? "The list below contains this page. Use the search above to query all records."
          : "A lista abaixo contém esta página. Use a busca acima para consultar todos os registros."}
      </p>
    </section>
  );
}
