import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  communityActor,
  readCommunity,
  uploadCommunityImage,
} from "@/services/CommunityService";
import { communityActionSchema } from "@/lib/community";
import { AccessError } from "@/lib/auth/platform";
import { createServiceClientSSR } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
async function boundedBody(req: NextRequest, maximum: number) {
  const reader = req.body?.getReader();
  if (!reader) throw new AccessError("Envie os dados da publicação.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maximum) {
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
function failure(error: unknown) {
  const status =
    error instanceof AccessError
      ? error.status
      : error instanceof ZodError || error instanceof SyntaxError
        ? 400
        : 500;
  return NextResponse.json(
    {
      error:
        error instanceof AccessError
          ? error.message
          : "Não foi possível concluir. Confira os dados e tente novamente.",
    },
    { status },
  );
}
export async function GET(req: NextRequest) {
  try {
    const { userId } = await communityActor();
    const { searchParams } = req.nextUrl;
    const thread = searchParams.get("thread");
    if (thread) {
      const { z } = await import("zod");
      const post = z.uuid().parse(thread);
      const mode = z
        .enum(["comments", "reactions"])
        .parse(searchParams.get("mode") || "comments");
      const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(searchParams.get("offset") || 0);
      const db = await createServiceClientSSR();
      const result = await (db.rpc as any)("community_thread", {
        p_actor: userId,
        p_post: post,
        p_mode: mode,
        p_offset: offset,
      });
      if (result.error) throw new AccessError("Publicação indisponível.", 404);
      return NextResponse.json(result.data, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    return NextResponse.json(
      await readCommunity(userId, Object.fromEntries(searchParams)),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const actor = await communityActor();
    if (req.headers.get("origin") !== req.nextUrl.origin)
      throw new AccessError("Origem inválida.", 403);
    if (req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const body = await boundedBody(req, 4 * 1024 * 1024 + 65536);
      const form = await body.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        throw new AccessError("Selecione uma imagem.", 400);
      return NextResponse.json({
        path: await uploadCommunityImage(actor.userId, file),
      });
    }
    const input = communityActionSchema.parse(
      await (await boundedBody(req, 40000)).json(),
    );
    if (input.action === "restrict" && actor.role !== "admin")
      throw new AccessError("Acesso negado.", 403);
    const db = await createServiceClientSSR();
    const result = await (db.rpc as any)("community_mutate", {
      p_actor: actor.userId,
      p_action: input.action,
      p_input: input,
    });
    if (result.error)
      throw new AccessError(
        "Ação indisponível. Confira sua permissão, os limites de envio ou atualize a publicação.",
        409,
      );
    return NextResponse.json({ id: result.data });
  } catch (error) {
    return failure(error);
  }
}
