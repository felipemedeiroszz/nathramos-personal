import { NextRequest } from "next/server"
import { errorResponse, jsonResponse } from "@/lib/api/response"
import { getCurrentRole, getCurrentUserId } from "@/lib/auth/access"
import { listExercises, type ExerciseDbErrorCode } from "@/lib/exercisedb"

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
  invalid_request: "Parâmetros inválidos.",
  not_found: "Recurso não encontrado na ExerciseDB.",
  rate_limited: "Limite de requisições da ExerciseDB atingido. Tente novamente em instantes.",
  timeout: "A ExerciseDB demorou para responder.",
  unavailable: "ExerciseDB indisponível no momento.",
  invalid_response: "Resposta inesperada da ExerciseDB.",
}

function parseLimit(raw: string | null): number | undefined {
  if (!raw) return undefined
  const value = Number(raw)
  if (!Number.isFinite(value)) return undefined
  return Math.trunc(value)
}

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) return errorResponse("Não autorizado.", 401, "UNAUTHENTICATED")

  const role = await getCurrentRole()
  if (role !== "admin" && role !== "coach") {
    return errorResponse("Acesso restrito.", 403, "FORBIDDEN")
  }

  const searchParams = req.nextUrl.searchParams

  const result = await listExercises({
    name: searchParams.get("q") ?? undefined,
    bodyParts: searchParams.get("bodyPart") ?? undefined,
    targetMuscles: searchParams.get("muscle") ?? undefined,
    equipments: searchParams.get("equipment") ?? undefined,
    limit: parseLimit(searchParams.get("limit")),
    after: searchParams.get("after") ?? undefined,
    before: searchParams.get("before") ?? undefined,
  })

  if (!result.ok) {
    return errorResponse(ERROR_MESSAGE[result.code], ERROR_STATUS[result.code], result.code)
  }

  return jsonResponse(result.data)
}
