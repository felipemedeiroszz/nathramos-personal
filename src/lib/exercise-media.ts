export function exerciseMediaUrl(value?: string | null): string | null {
  const text = value?.trim();
  if (!text) return null;
  try {
    const url = new URL(text.startsWith("//") ? `https:${text}` : text);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export function exerciseMediaKind(value: string) {
  const url = exerciseMediaUrl(value);
  if (!url) return "invalid" as const;
  if (youtubeVideoId(url)) return "youtube" as const;
  return /\.(mp4|webm|mov)$/i.test(new URL(url).pathname)
    ? ("video" as const)
    : ("image" as const);
}
export function exerciseMediaPage(value: string) {
  const text = exerciseMediaUrl(value);
  if (!text) return false;
  const url = new URL(text);
  if (youtubeVideoId(text)) return false;
  return (
    (/^(www\.)?(giphy\.com|tenor\.com)$/.test(url.hostname) &&
      /^\/(gifs|view|clips)\//.test(url.pathname)) ||
    /^(www\.)?(pinterest\.[a-z.]+|youtube\.com|youtu\.be)$/.test(
      url.hostname,
    ) ||
    (url.hostname === "drive.google.com" && /^\/file\//.test(url.pathname))
  );
}
export function youtubeVideoId(value?: string | null) {
  const text = exerciseMediaUrl(value);
  if (!text) return null;
  const url = new URL(text);
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (["youtu.be", "www.youtu.be"].includes(host))
    id = url.pathname.split("/")[1];
  else if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com",
    ].includes(host)
  ) {
    const parts = url.pathname.split("/");
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : ["shorts", "embed", "live"].includes(parts[1])
          ? parts[2]
          : null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
export function youtubeExerciseEmbedUrl(
  id: string,
  locale: string,
  autoPlay: boolean,
) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const url = new URL(`https://www.youtube.com/embed/${id}`);
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("hl", locale === "pt-BR" ? "pt-BR" : "en");
  if (autoPlay) {
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("mute", "1");
    url.searchParams.set("loop", "1");
    url.searchParams.set("playlist", id);
  }
  return url.href;
}
export function exerciseMediaFields(
  gif?: string | null,
  video?: string | null,
) {
  const id = youtubeVideoId(gif);
  const videoId = youtubeVideoId(video);
  return {
    gif_url: id ? null : exerciseMediaUrl(gif),
    video_url:
      id || videoId
        ? `https://www.youtube.com/watch?v=${id || videoId}`
        : exerciseMediaUrl(video),
  };
}
export function exerciseMediaSource(
  row?: {
    gif_url?: string | null;
    video_url?: string | null;
    thumbnail_url?: string | null;
  } | null,
) {
  if (!row) return null;
  const video = exerciseMediaUrl(row.video_url);
  const image = exerciseMediaUrl(row.gif_url);
  return (
    (youtubeVideoId(image) ? image : null) ||
    (video && ["youtube", "video"].includes(exerciseMediaKind(video))
      ? video
      : null) ||
    image ||
    exerciseMediaUrl(row.thumbnail_url)
  );
}
