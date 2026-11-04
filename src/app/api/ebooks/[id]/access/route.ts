import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformUser, AccessError } from "@/lib/auth/platform";
import { EbookService } from "@/services/EbookService";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requirePlatformUser();
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success)
      return NextResponse.json({ error: "E-book inválido." }, { status: 400 });
    const url = await EbookService.authorizedContent(id, userId);
    return new NextResponse(null, {
      status: 303,
      headers: {
        Location: url,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccessError
            ? error.message
            : "Não foi possível acessar o conteúdo.",
      },
      {
        status: error instanceof AccessError ? error.status : 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
