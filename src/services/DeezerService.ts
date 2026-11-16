import "server-only";
import { AccessError } from "@/lib/auth/platform";
export type DeezerTrack = {
  id: number;
  title: string;
  artist: string;
  cover: string | null;
  link: string;
  preview: string | null;
};
const cache = new Map<string, { until: number; data: any }>();
function asset(value: unknown): string | null {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" &&
      (u.hostname === "dzcdn.net" || u.hostname.endsWith(".dzcdn.net"))
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function normalizeTrack(raw: any): DeezerTrack | null {
  if (
    !Number.isSafeInteger(raw?.id) ||
    raw.id <= 0 ||
    typeof raw.title !== "string" ||
    typeof raw.artist?.name !== "string"
  )
    return null;
  return {
    id: raw.id,
    title: raw.title.slice(0, 300),
    artist: raw.artist.name.slice(0, 200),
    cover: asset(raw.album?.cover_medium),
    link: `https://www.deezer.com/track/${raw.id}`,
    preview: asset(raw.preview),
  };
}
async function query(path: string) {
  const hit = cache.get(path);
  if (hit && hit.until > Date.now()) return hit.data;
  let data;
  try {
    const r = await fetch("https://api.deezer.com" + path, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      redirect: "error",
    });
    if (!r.ok) throw Error();
    data = await r.json();
    if (data.error) throw Error();
  } catch {
    throw new AccessError(
      "Deezer indisponível no momento. Tente novamente.",
      503,
    );
  }
  if (cache.size >= 150) cache.delete(cache.keys().next().value!);
  cache.set(path, { until: Date.now() + 60000, data });
  return data;
}
export async function searchDeezer(search: string) {
  const raw = await query(
    "/search?q=" + encodeURIComponent(search) + "&limit=12",
  );
  return (Array.isArray(raw.data) ? raw.data : [])
    .map(normalizeTrack)
    .filter((track: DeezerTrack | null) => track?.preview);
}
export async function getDeezerTrack(id: number) {
  const track = normalizeTrack(await query("/track/" + id));
  if (!track) throw new AccessError("Música indisponível no Deezer.", 404);
  return track;
}

export async function recommendedDeezer(
  category: "trending" | "workout" | "pop" | "electronic" = "trending",
) {
  if (category !== "trending")
    return searchDeezer(
      {
        workout: "workout motivation",
        pop: "pop hits",
        electronic: "electronic dance",
      }[category],
    );
  const raw = await query("/chart/0/tracks?limit=12");
  return (Array.isArray(raw.data) ? raw.data : [])
    .map(normalizeTrack)
    .filter((track: DeezerTrack | null) => track?.preview);
}
