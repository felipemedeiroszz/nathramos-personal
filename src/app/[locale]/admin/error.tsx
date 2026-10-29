"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { DatabaseCheck } from "@/lib/admin/diagnostics";
const guidance: Record<string, string> = {
  schema:
    "Verifique se as migrações correspondentes foram aplicadas no mesmo Supabase da aplicação. Se já foram, confira o cache da API.",
  permission:
    "A função ou tabela existe, mas o servidor não tem permissão. Confira a chave de serviço e os GRANTs das migrações.",
  credentials:
    "Confira a SUPABASE_SERVICE_ROLE_KEY nas variáveis do ambiente publicado. Não compartilhe o valor da chave.",
  connection:
    "A conexão com o banco ou a consulta falhou. Confira a disponibilidade do Supabase e os logs do servidor.",
  query:
    "A consulta encontrou uma falha. Use o código abaixo para localizar a causa nos logs do servidor.",
};
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [checking, setChecking] = useState(false),
    [report, setReport] = useState<{
      ok: boolean;
      checks: DatabaseCheck[];
    } | null>(null),
    [message, setMessage] = useState("");
  async function diagnose() {
    setChecking(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/diagnostics", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Não foi possível consultar o diagnóstico.",
        );
      setReport(result);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Não foi possível consultar o diagnóstico.",
      );
    } finally {
      setChecking(false);
    }
  }
  return (
    <section
      role="alert"
      className="mx-auto max-w-3xl rounded-2xl border border-rose-400/15 bg-surface p-6 space-y-4 sm:p-8"
    >
      <h2 className="text-xl font-semibold tracking-tight">
        Não foi possível carregar o painel
      </h2>
      <p className="text-sm leading-relaxed text-text-secondary">
        Os dados estão indisponíveis. Tente novamente antes de tomar decisões ou
        repetir uma alteração.
      </p>
      {error.digest && (
        <p className="text-sm text-text-secondary">
          Código para localizar o erro nos logs do servidor:{" "}
          <code className="select-all break-all">{error.digest}</code>
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Button
          variant="outline"
          disabled={checking}
          onClick={() => void diagnose()}
        >
          {checking ? "Verificando…" : "Verificar diagnóstico"}
        </Button>
      </div>
      {message && <p className="text-sm">{message}</p>}
      {report && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <h3 className="font-semibold">
            {report.ok
              ? "Consultas de verificação concluídas"
              : "Foram encontradas falhas no ambiente"}
          </h3>
          {report.ok && (
            <p className="text-sm">
              As verificações básicas passaram. Use o código do erro e os logs
              da Vercel para investigar a consulta específica que falhou.
            </p>
          )}
          <ul className="space-y-3">
            {report.checks.map((c) => (
              <li key={c.id} className="text-sm">
                <strong>
                  {c.ok ? "OK" : "Falha"} · {c.label}
                </strong>
                {!c.ok && (
                  <>
                    <p className="text-text-secondary">
                      Código: {c.code} · {guidance[c.kind || "query"]}
                    </p>
                    {c.migration && (
                      <p className="break-all text-text-secondary">
                        Recurso definido/atualizado em:{" "}
                        <code>{c.migration}</code>. Confira também as migrações
                        anteriores.
                      </p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
