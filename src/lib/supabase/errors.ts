export type DatabaseFailureKind =
  | "schema"
  | "permission"
  | "credentials"
  | "connection"
  | "query";
export function databaseFailureKind(
  error: { code?: string; status?: number } | null | undefined,
): DatabaseFailureKind {
  const code = error?.code || "";
  if (
    [
      "PGRST200",
      "PGRST201",
      "PGRST202",
      "PGRST203",
      "PGRST204",
      "PGRST205",
      "42P01",
      "42703",
      "42883",
    ].includes(code)
  )
    return "schema";
  if (code === "42501" || error?.status === 403) return "permission";
  if (
    ["PGRST301", "PGRST302", "PGRST303", "PGRST300"].includes(code) ||
    error?.status === 401
  )
    return "credentials";
  if (
    [
      "PGRST000",
      "PGRST001",
      "PGRST002",
      "PGRST003",
      "08000",
      "08006",
      "57014",
    ].includes(code) ||
    error?.status === 503 ||
    error?.status === 504
  )
    return "connection";
  return "query";
}
export class DatabaseOperationError extends Error {
  readonly code?: string;
  readonly kind: DatabaseFailureKind;
  constructor(
    readonly operation: string,
    error: { code?: string; status?: number } | null | undefined,
  ) {
    super(
      "Não foi possível consultar os dados. Verifique o diagnóstico de implantação.",
    );
    this.name = "DatabaseOperationError";
    this.code = error?.code;
    this.kind = databaseFailureKind(error);
    // Keep only safe context. Keys, tokens, query payloads and student data are not logged.
    console.error("[database] operation_failed", {
      operation,
      code: this.code,
      kind: this.kind,
    });
  }
}
