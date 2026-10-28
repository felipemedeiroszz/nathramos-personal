import { NextRequest } from "next/server";
import {
  requireApiUser,
  jsonResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api/response";
import { cancelPendingCheckout } from "@/lib/payments/pending";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireApiUser();
    const { operation_id } = await req.json();
    if (
      typeof operation_id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(operation_id)
    )
      return errorResponse("Tentativa inválida.", 400);
    await cancelPendingCheckout(userId, operation_id);
    return jsonResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
