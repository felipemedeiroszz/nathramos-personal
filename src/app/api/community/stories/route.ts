import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDeezerTrack } from "@/services/DeezerService";
import { communityActor } from "@/services/CommunityService";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { AccessError } from "@/lib/auth/platform";
import { DatabaseOperationError } from "@/lib/supabase/errors";

export const dynamic = "force-dynamic";
const inputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      request_id: z.uuid(),
      image_path: z
        .string()
        .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/)
        .nullable(),
      caption: z.string().trim().max(280),
      theme: z.enum(["gold", "rose", "ocean", "midnight"]),
      text_position: z.enum(["top", "center", "bottom"]),
      text_x: z.number().min(0).max(100).nullish(),
      text_y: z.number().min(0).max(100).nullish(),
      music_track_id: z
        .number()
        .int()
        .positive()
        .max(Number.MAX_SAFE_INTEGER)
        .nullish(),
      text_scale: z.number().min(0.5).max(2).default(1),
    })
    .refine((v) => v.image_path || v.caption)
    .refine((v) => (v.text_x == null) === (v.text_y == null)),
  z.object({ action: z.literal("delete"), id: z.guid() }),
]);
function failure(error: unknown) {
  const status =
    error instanceof AccessError
      ? error.status
      : error instanceof z.ZodError
        ? 400
        : 503;
  return NextResponse.json(
    {
      error:
        error instanceof AccessError
          ? error.message
          : status === 400
            ? "Confira o texto e a foto do story."
            : "Stories indisponíveis. Verifique as migrações de stories até 000060.",
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function GET() {
  try {
    const actor = await communityActor();
    const db: any = await createServiceClientSSR();
    const result = await db.rpc("community_story_read", {
      p_actor: actor.userId,
    });
    if (result.error)
      throw new DatabaseOperationError("community_story_read", {
        ...result.error,
        status: result.status,
      });
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const actor = await communityActor();
    if (req.headers.get("origin") !== req.nextUrl.origin)
      throw new AccessError("Origem inválida.", 403);
    const reader = req.body?.getReader();
    if (!reader) throw new AccessError("Envie os dados do story.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 8192) {
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
    const input = inputSchema.parse(body);
    if (input.action === "create" && input.music_track_id) {
      const music = await getDeezerTrack(input.music_track_id);
      if (!music.preview)
        throw new AccessError("Esta música não possui prévia disponível.", 400);
    }
    const db: any = await createServiceClientSSR();
    const result = await db.rpc("community_story_mutate", {
      p_actor: actor.userId,
      p_action: input.action,
      p_input: input,
    });
    if (result.error) {
      if (result.error.code === "P0001")
        throw new AccessError(
          "Ação indisponível. Confira sua permissão e o limite de 20 stories por dia.",
          409,
        );
      throw new DatabaseOperationError("community_story_mutate", {
        ...result.error,
        status: result.status,
      });
    }
    return NextResponse.json(
      { id: result.data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
