"use client";
import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import {
  exerciseMediaKind,
  exerciseMediaUrl,
  youtubeVideoId,
  youtubeExerciseEmbedUrl,
} from "@/lib/exercise-media";

type Props = {
  src: string;
  alt: string;
  className?: string;
  locale?: string;
  loading?: "lazy" | "eager";
  autoPlay?: boolean;
};
function Media({
  src,
  alt,
  className,
  locale = "pt-BR",
  loading = "lazy",
  autoPlay = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!autoPlay || !containerRef.current) return;
    const updateVisibility = () =>
      setPageVisible(document.visibilityState !== "hidden");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => setVisible(entries[0]?.isIntersecting === true),
            { threshold: 0.15 },
          )
        : null;
    if (observer) observer.observe(containerRef.current);
    else setVisible(true);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [autoPlay]);
  const playing = autoPlay && visible && pageVisible;
  useEffect(() => {
    const video = videoRef.current;
    if (!autoPlay || !video) return;
    if (playing) {
      video.muted = true;
      void video.play().catch(() => {
        /* Native controls remain available if the browser blocks autoplay. */
      });
    } else video.pause();
  }, [autoPlay, playing]);
  const url = exerciseMediaUrl(src);
  if (!src.trim())
    return (
      <span role="status" className="p-4 text-xs text-text-secondary">
        {locale === "pt-BR" ? "Preparando prévia..." : "Preparing preview..."}
      </span>
    );
  if (!url || failed)
    return (
      <div
        role="status"
        className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-text-secondary"
      >
        <ImageOff size={24} />
        <span>
          {locale === "pt-BR"
            ? "Não foi possível carregar a mídia. Use a URL direta e pública do GIF, imagem ou MP4, ou envie o arquivo."
            : "Could not load media. Use a public direct GIF, image or MP4 URL, or upload the file."}
        </span>
      </div>
    );
  const youtubeId = youtubeVideoId(url);
  if (youtubeId)
    return (
      <div ref={containerRef} className="w-full min-w-0">
        {!autoPlay || playing ? (
          <iframe
            title={alt}
            src={youtubeExerciseEmbedUrl(youtubeId, locale, autoPlay)!}
            className="aspect-video min-h-[200px] w-full border-0"
            loading={loading}
            allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="aspect-video min-h-[200px] w-full" aria-label={alt} />
        )}
        <a
          href={`https://www.youtube.com/watch?v=${youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-2 py-1 text-center text-xs text-primary underline"
        >
          {locale === "pt-BR" ? "Abrir no YouTube" : "Open on YouTube"}
        </a>
      </div>
    );
  if (exerciseMediaKind(url) === "video")
    return (
      <div ref={containerRef} className="h-full w-full">
        <video
          ref={videoRef}
          src={url}
          className={className}
          aria-label={alt}
          controls
          muted
          autoPlay={playing}
          loop
          playsInline
          preload={autoPlay ? "auto" : "metadata"}
          onError={() => setFailed(true)}
        />
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
export function ExerciseMedia(props: Props) {
  return <Media key={exerciseMediaUrl(props.src) || props.src} {...props} />;
}
