export function createExerciseRequestCache(now = () => Date.now()) {
  const entries = new Map<
    string,
    { data: Record<string, unknown>; expires: number }
  >();
  const pending = new Map<string, Promise<any>>();
  let blockedUntil = 0;
  return {
    async request(
      key: string,
      ttlSeconds: number,
      fetcher: () => Promise<any>,
    ) {
      const saved = entries.get(key);
      if (saved && saved.expires > now())
        return { ok: true as const, data: saved.data, cached: true };
      if (blockedUntil > now())
        return saved
          ? { ok: true as const, data: saved.data, cached: true }
          : { ok: false as const, code: "rate_limited" as const, status: 429 };
      if (pending.has(key)) return pending.get(key)!;
      const request = (async () => {
        const result = await fetcher();
        if (result.ok) {
          entries.delete(key);
          entries.set(key, {
            data: result.data,
            expires: now() + ttlSeconds * 1000,
          });
          while (entries.size > 200)
            entries.delete(entries.keys().next().value!);
        } else if (result.code === "rate_limited") {
          blockedUntil =
            now() +
            Math.min(900, Math.max(30, result.retryAfterSeconds || 60)) * 1000;
        }
        if (
          !result.ok &&
          saved &&
          ["rate_limited", "unavailable", "timeout"].includes(result.code)
        )
          return { ok: true as const, data: saved.data, cached: true };
        return result;
      })();
      pending.set(key, request);
      try {
        return await request;
      } finally {
        pending.delete(key);
      }
    },
  };
}
