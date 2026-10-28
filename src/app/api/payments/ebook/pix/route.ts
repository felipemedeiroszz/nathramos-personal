import { NextRequest } from "next/server"
import { ebookPixSchema } from "@/schemas/payments"
import { handleApiError,jsonResponse,errorResponse,requireApiUser } from "@/lib/api/response"
import { createAsaasPix } from "@/lib/payments/checkout"
export const dynamic="force-dynamic"
export const runtime="nodejs"
export async function POST(req: NextRequest) {
 try {
  const {userId}=await requireApiUser()
  const parsed=ebookPixSchema.safeParse(await req.json())
  if(!parsed.success) return errorResponse("Dados inválidos.",400)
  return jsonResponse(await createAsaasPix(userId,"ebook",parsed.data.ebook_id))
 } catch(error) {return handleApiError(error)}
}
