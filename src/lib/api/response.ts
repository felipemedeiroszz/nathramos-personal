import { NextResponse } from "next/server"
import { createClientSSR } from "@/lib/supabase/server"

export interface ApiError {
  error: string
  code?: string
  details?: Record<string, unknown>
}

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function errorResponse(message: string, status = 400, code?: string, details?: Record<string, unknown>) {
  const body: ApiError = { error: message }
  if (code) body.code = code
  if (details) body.details = details
  return NextResponse.json(body, { status })
}

export async function requireApiUser(): Promise<{ userId: string; supabase: Awaited<ReturnType<typeof createClientSSR>> }> {
  const supabase = await createClientSSR()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new ApiAuthError("Usuário não autenticado.")
  }
  return { userId: user.id, supabase }
}

export class ApiAuthError extends Error {
  constructor(message = "Não autorizado.") {
    super(message)
    this.name = "ApiAuthError"
  }
}

export class ApiValidationError extends Error {
  public issues?: unknown
  constructor(message = "Dados inválidos.", issues?: unknown) {
    super(message)
    this.name = "ApiValidationError"
    this.issues = issues
  }
}

export class ApiNotFoundError extends Error {
  constructor(message = "Recurso não encontrado.") {
    super(message)
    this.name = "ApiNotFoundError"
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiAuthError) {
    return errorResponse(error.message, 401, "UNAUTHENTICATED")
  }
  if (error instanceof ApiValidationError) {
    return errorResponse(error.message, 400, "VALIDATION_ERROR", { issues: (error as ApiValidationError).issues })
  }
  if (error instanceof ApiNotFoundError) {
    return errorResponse(error.message, 404, "NOT_FOUND")
  }
  console.error("[api] unhandled error:", error)
  return errorResponse("Erro interno no servidor.", 500, "INTERNAL_ERROR")
}
