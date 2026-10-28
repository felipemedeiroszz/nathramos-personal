import { NextRequest } from "next/server";
import {
  requireApiUser,
  jsonResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api/response";
import { resumePendingCheckout } from "@/lib/payments/pending";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireApiUser();
    const { operation_id, locale } = await req.json();
    if (
      typeof operation_id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(operation_id)
    )
      return errorResponse("Tentativa inválida.", 400);
    return jsonResponse(
      await resumePendingCheckout(
        userId,
        operation_id,
        locale === "en-US" ? "en-US" : "pt-BR",
      ),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
