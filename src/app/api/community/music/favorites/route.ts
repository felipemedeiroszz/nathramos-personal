import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { communityActor } from "@/services/CommunityService";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { AccessError } from "@/lib/auth/platform";
import { getDeezerTrack } from "@/services/DeezerService";
import { DatabaseOperationError } from "@/lib/supabase/errors";
export const dynamic = "force-dynamic";
const schema = z.object({
  action: z.enum(["save", "remove"]),
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
function fail(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof AccessError
          ? error.message
          : error instanceof z.ZodError
            ? "Música inválida."
            : "Favoritas indisponíveis. Confira a migração 000062_community_music_favorites.sql.",
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
async function run(actor: string, action: string, track: unknown) {
  const db: any = await createServiceClientSSR();
  const result = await db.rpc("community_music_favorite", {
    p_actor: actor,
    p_action: action,
    p_track: track,
  });
  if (result.error) {
    if (result.error.code === "P0001")
      throw new AccessError(
        "Não foi possível salvar. O limite é de 50 favoritas.",
        409,
      );
    throw new DatabaseOperationError("community_music_favorite", {
      ...result.error,
      status: result.status,
    });
  }
  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function GET() {
  try {
    const actor = await communityActor();
    return await run(actor.userId, "read", {});
  } catch (error) {
    return fail(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const actor = await communityActor();
    if (req.headers.get("origin") !== req.nextUrl.origin)
      throw new AccessError("Origem inválida.", 403);
    const reader = req.body?.getReader();
    if (!reader) throw new AccessError("Envie os dados.", 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 2048) {
          await reader.cancel();
          throw new AccessError("Envio muito grande.", 413);
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      throw new AccessError("Dados inválidos.", 400);
    }
    const input = schema.parse(body);
    const track =
      input.action === "save"
        ? await getDeezerTrack(input.id)
        : { id: input.id };
    return await run(actor.userId, input.action, track);
  } catch (error) {
    return fail(error);
  }
}
