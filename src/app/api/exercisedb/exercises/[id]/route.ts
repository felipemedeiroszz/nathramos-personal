import { NextRequest } from "next/server"
import { errorResponse, jsonResponse } from "@/lib/api/response"
import { getCurrentRole, getCurrentUserId } from "@/lib/auth/access"
import { getExercise, type ExerciseDbErrorCode } from "@/lib/exercisedb"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ERROR_STATUS: Record<ExerciseDbErrorCode, number> = {
  invalid_request: 400,
  not_found: 404,
  rate_limited: 429,
  timeout: 504,
  unavailable: 502,
  invalid_response: 502,
}

const ERROR_MESSAGE: Record<ExerciseDbErrorCode, string> = {
  invalid_request: "Identificador inválido.",
  not_found: "Exercício não encontrado na ExerciseDB.",
  rate_limited: "Limite de requisições da ExerciseDB atingido. Tente novamente em instantes.",
  timeout: "A ExerciseDB demorou para responder.",
  unavailable: "ExerciseDB indisponível no momento.",
  invalid_response: "Resposta inesperada da ExerciseDB.",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId()
  if (!userId) return errorResponse("Não autorizado.", 401, "UNAUTHENTICATED")

  const role = await getCurrentRole()
  if (role !== "admin" && role !== "coach") {
    return errorResponse("Acesso restrito.", 403, "FORBIDDEN")
  }

  const result = await getExercise(params.id)

  if (!result.ok) {
    return errorResponse(ERROR_MESSAGE[result.code], ERROR_STATUS[result.code], result.code)
  }

  return jsonResponse({ exercise: result.data })
}
