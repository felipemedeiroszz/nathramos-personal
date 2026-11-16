import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { communityActor } from "@/services/CommunityService";
import { AccessError } from "@/lib/auth/platform";
import {
  getDeezerTrack,
  searchDeezer,
  recommendedDeezer,
} from "@/services/DeezerService";
export const dynamic = "force-dynamic";
const limits = new Map<string, { until: number; count: number }>();
export async function GET(req: NextRequest) {
  try {
    const actor = await communityActor();
    const now = Date.now();
    const previous = limits.get(actor.userId);
    const bucket =
      previous && previous.until > now
        ? previous
        : { until: now + 60000, count: 0 };
    bucket.count++;
    limits.set(actor.userId, bucket);
    if (limits.size > 1000) {
      for (const [key, v] of limits) if (v.until <= now) limits.delete(key);
    }
    if (bucket.count > 60)
      throw new AccessError("Muitas consultas. Aguarde um minuto.", 429);
    const track = req.nextUrl.searchParams.get("track");
    const data =
      track !== null
        ? await getDeezerTrack(
            z.coerce
              .number()
              .int()
              .positive()
              .max(Number.MAX_SAFE_INTEGER)
              .parse(track),
          )
        : req.nextUrl.searchParams.get("mode") === "recommended"
          ? await recommendedDeezer(
              z
                .enum(["trending", "workout", "pop", "electronic"])
                .parse(req.nextUrl.searchParams.get("category") || "trending"),
            )
          : await searchDeezer(
              z
                .string()
                .trim()
                .min(2)
                .max(80)
                .parse(req.nextUrl.searchParams.get("q")),
            );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AccessError
            ? error.message
            : error instanceof z.ZodError
              ? "Informe uma música ou artista (2 a 80 caracteres)."
              : "Não foi possível consultar o Deezer.",
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
}
