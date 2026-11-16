import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AccessError } from "@/lib/auth/platform";
import {
  monthlyProgressActor,
  readMonthlyProgress,
  saveMonthlyProgress,
  uploadMonthlyPhoto,
} from "@/services/MonthlyProgressService";
export const dynamic = "force-dynamic";
function fail(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof AccessError
          ? error.message
          : error instanceof z.ZodError
            ? "Confira o peso e as quatro fotos."
            : "Evolução mensal indisponível. Verifique a migração 000063_monthly_progress.sql.",
    },
    {
      status:
        error instanceof AccessError
          ? error.status
          : error instanceof z.ZodError
            ? 400
            : 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
async function body(req: NextRequest, max: number) {
  const reader = req.body?.getReader();
  if (!reader) throw new AccessError("Envie os dados.", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > max) {
        await reader.cancel();
        throw new AccessError("Envio muito grande.", 413);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Response(Buffer.concat(chunks), {
    headers: {
      "Content-Type": req.headers.get("content-type") || "application/json",
    },
  });
}
export async function GET() {
  try {
    const actor = await monthlyProgressActor();
    return NextResponse.json(await readMonthlyProgress(actor.userId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return fail(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const actor = await monthlyProgressActor();
    if (req.headers.get("origin") !== req.nextUrl.origin)
      throw new AccessError("Origem inválida.", 403);
    if (req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await (await body(req, 4 * 1024 * 1024 + 65536)).formData();
      const file = form.get("file");
      if (!(file instanceof File))
        throw new AccessError("Selecione uma foto.", 400);
      return NextResponse.json(
        {
          path: await uploadMonthlyPhoto(
            actor.userId,
            form.get("month"),
            form.get("angle"),
            file,
          ),
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    let input;
    try {
      input = await (await body(req, 12000)).json();
    } catch (error) {
      if (error instanceof AccessError) throw error;
      throw new AccessError("Dados inválidos.", 400);
    }
    return NextResponse.json(await saveMonthlyProgress(actor.userId, input), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return fail(error);
  }
}
