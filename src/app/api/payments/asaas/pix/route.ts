import { NextRequest } from "next/server"
import { createPixSchema } from "@/schemas/payments"
import { handleApiError,jsonResponse,errorResponse,requireApiUser } from "@/lib/api/response"
import { createAsaasPix } from "@/lib/payments/checkout"
export const dynamic="force-dynamic"
export const runtime="nodejs"
export async function POST(req: NextRequest) {
 try {
  const {userId}=await requireApiUser()
  const parsed=createPixSchema.safeParse(await req.json())
  if(!parsed.success) return errorResponse("Dados inválidos.",400)
  return jsonResponse(await createAsaasPix(userId,"plan",parsed.data.plan_id,parsed.data.cpf,parsed.data.phone))
 } catch(error) {return handleApiError(error)}
}
