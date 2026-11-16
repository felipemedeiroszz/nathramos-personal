import { AccessError } from "@/lib/auth/platform";

export async function readChallengeBody(request: Request, maximum: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError("Envie os dados do desafio.", 400);
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
      "Content-Type": request.headers.get("content-type") || "application/json",
    },
  });
}
