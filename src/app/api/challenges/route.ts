import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import {
  challengeActor,
  readChallenges,
  uploadChallengeAsset,
  cloneChallengeAssets,
} from "@/services/ChallengeService";
import { challengeActionSchema } from "@/lib/challenges";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { AccessError } from "@/lib/auth/platform";
import { readChallengeBody } from "@/lib/api/challenge-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
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
          : "Não foi possível concluir a operação. Confira os campos e tente novamente.",
    },
    { status },
  );
}
export async function GET(req: NextRequest) {
  try {
    const { userId } = await challengeActor();
    return NextResponse.json(
      await readChallenges(
        userId,
        Object.fromEntries(req.nextUrl.searchParams),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const { userId } = await challengeActor();
    if (req.headers.get("origin") !== req.nextUrl.origin)
      throw new AccessError("Origem inválida.", 403);
    if (req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await (
        await readChallengeBody(req, 4 * 1024 * 1024 + 65536)
      ).formData();
      const challenge = z.uuid().parse(form.get("challenge_id"));
      const kind = z.enum(["cover", "prize", "proof"]).parse(form.get("kind"));
      const file = form.get("file");
      if (!(file instanceof File))
        throw new AccessError("Selecione um arquivo.", 400);
      return NextResponse.json({
        path: await uploadChallengeAsset(userId, challenge, kind, file),
      });
    }
    const input = challengeActionSchema.parse(
      await (await readChallengeBody(req, 1200000)).json(),
    );
    const db = await createServiceClientSSR();
    const result = await (db.rpc as any)("challenge_mutate", {
      p_actor: userId,
      p_action: input.action,
      p_input: input,
    });
    if (result.error) {
      if (
        result.error.code === "23505" &&
        String(result.error.message).includes(
          "challenge_activities_daily_unique",
        )
      )
        throw new AccessError(
          "Já existe um registro ativo desta meta no dia. Recuse o registro atual antes de aprovar outro.",
          409,
        );
      const message = String(result.error.message || "");
      const messages: Record<string, string> = {
        "Resolve pending validations":
          "Resolva as validações pendentes antes de publicar o resultado.",
        "Resolve tied placements manually before publication":
          "Há empate nas posições premiadas. Defina os ganhadores e justifique a decisão.",
        "This goal already has a record for this date":
          "Esta meta já possui um registro nesta data.",
        "Activity window closed": "O período de registros está fechado.",
        "Challenge is full": "O desafio atingiu o limite de participantes.",
        "Challenge changed. Reload":
          "O desafio foi atualizado. Recarregue antes de salvar.",
        "Score cannot be negative":
          "O ajuste não pode deixar a pontuação negativa.",
      };
      throw new AccessError(
        messages[message] ||
          "Ação indisponível. Confira as regras, o período, as permissões e os campos obrigatórios.",
        409,
      );
    }
    if (input.action === "duplicate") {
      try {
        await cloneChallengeAssets(userId, input.challenge_id, result.data);
      } catch {
        return NextResponse.json({
          id: result.data,
          warning:
            "O rascunho foi duplicado. Confira as imagens antes de publicar.",
        });
      }
    }
    return NextResponse.json({ id: result.data });
  } catch (error) {
    return failure(error);
  }
}
