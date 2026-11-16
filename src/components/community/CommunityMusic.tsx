"use client";
import { useEffect, useRef, useState } from "react";
import { Music2, Search, X, Heart } from "lucide-react";
import type { DeezerTrack } from "@/services/DeezerService";
async function get(url: string, signal?: AbortSignal) {
  const r = await fetch(url, { cache: "no-store", signal });
  const data = await r.json();
  if (!r.ok) throw Error(data.error);
  return data;
}
export function CommunityMusicPlayer({
  trackId,
  locale,
  onPlayingChange,
  autoPlay = false,
}: {
  trackId: number;
  locale: string;
  onPlayingChange?: (playing: boolean) => void;
  autoPlay?: boolean;
}) {
  const en = locale === "en-US";
  const [track, setTrack] = useState<DeezerTrack | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const attempted = useRef<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const callback = useRef(onPlayingChange);
  callback.current = onPlayingChange;
  useEffect(() => {
    setTrack(null);
    setError("");
    const controller = new AbortController();
    get("/api/community/music?track=" + trackId, controller.signal)
      .then(setTrack)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => {
      controller.abort();
      callback.current?.(false);
    };
  }, [trackId, retry]);
  useEffect(() => {
    const stop = (event: Event) => {
      if ((event as CustomEvent).detail !== audio.current)
        audio.current?.pause();
    };
    window.addEventListener("community-music-play", stop);
    return () => window.removeEventListener("community-music-play", stop);
  }, []);
  useEffect(() => {
    if (!autoPlay || !track?.preview || !audio.current) return;
    const key = trackId + ":" + retry;
    if (attempted.current === key) return;
    attempted.current = key;
    setBlocked(false);
    void audio.current.play().catch(() => setBlocked(true));
  }, [autoPlay, track, trackId, retry]);
  return (
    <div className="community-music-player" data-track-id={trackId}>
      <div className="music-track-label">
        {track?.cover ? (
          <img
            src={track.cover}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Music2 size={22} />
        )}
        <div>
          <strong>{track?.title || (en ? "Music" : "Música")}</strong>
          <span>{track?.artist || "Deezer"}</span>
        </div>
        <a
          href={`https://www.deezer.com/track/${trackId}`}
          target="_blank"
          rel="noreferrer"
        >
          Deezer ↗
        </a>
      </div>
      {track?.preview && (
        <audio
          ref={audio}
          controls
          controlsList="nodownload"
          preload={autoPlay ? "auto" : "none"}
          src={track.preview}
          aria-label={`${en ? "Music preview" : "Prévia musical"}: ${track.title}`}
          onPlay={() => {
            setBlocked(false);
            window.dispatchEvent(
              new CustomEvent("community-music-play", {
                detail: audio.current,
              }),
            );
            callback.current?.(true);
          }}
          onPause={() => callback.current?.(false)}
          onEnded={() => callback.current?.(false)}
          onError={() => {
            setError(
              en
                ? "Preview unavailable. Try again or open Deezer."
                : "Prévia indisponível. Tente novamente ou abra o Deezer.",
            );
            callback.current?.(false);
          }}
        />
      )}
      {blocked && (
        <button
          type="button"
          className="story-enable-audio"
          onClick={() => {
            void audio.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => setBlocked(true));
          }}
        >
          {en ? "Tap to enable sound" : "Toque para ativar o som"}
        </button>
      )}
      <small>
        {en
          ? "Up to 30 seconds · Preview provided by Deezer"
          : "Até 30 segundos · Prévia fornecida pelo Deezer"}
      </small>
      {track && !track.preview && (
        <small>
          {en
            ? "No preview available. Listen on Deezer."
            : "Sem prévia disponível. Ouça no Deezer."}
        </small>
      )}
      {error && (
        <p role="status">
          {error}{" "}
          <button type="button" onClick={() => setRetry((v) => v + 1)}>
            {en ? "Retry" : "Tentar novamente"}
          </button>
        </p>
      )}
    </div>
  );
}
export function CommunityMusicPicker({
  value,
  onChange,
  locale,
  disabled = false,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  locale: string;
  disabled?: boolean;
}) {
  const en = locale === "en-US";
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<DeezerTrack[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"recommended" | "favorites">("recommended");
  const [category, setCategory] = useState("trending");
  const [favorites, setFavorites] = useState<DeezerTrack[]>([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    get("/api/community/music/favorites", controller.signal)
      .then((data) => {
        setFavorites(data);
        setFavoriteError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setFavoriteError(e.message);
      });
    const sync = (event: Event) =>
      setFavorites((event as CustomEvent<DeezerTrack[]>).detail);
    window.addEventListener("community-music-favorites", sync);
    return () => {
      controller.abort();
      window.removeEventListener("community-music-favorites", sync);
    };
  }, [open]);
  useEffect(() => {
    if (!open || (tab === "favorites" && query.trim().length < 2)) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const searching = query.trim().length >= 2;
    const timer = setTimeout(
      () =>
        get(
          searching
            ? "/api/community/music?q=" + encodeURIComponent(query.trim())
            : "/api/community/music?mode=recommended&category=" + category,
          controller.signal,
        )
          .then(setResults)
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          }),
      searching ? 400 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, tab, category]);
  const displayed =
    tab === "favorites" && query.trim().length < 2 ? favorites : results;
  async function favorite(track: DeezerTrack) {
    setSaving(track.id);
    setFavoriteError("");
    try {
      const r = await fetch("/api/community/music/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: favorites.some((f) => f.id === track.id) ? "remove" : "save",
          id: track.id,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setFavorites(data);
      window.dispatchEvent(
        new CustomEvent("community-music-favorites", { detail: data }),
      );
    } catch (e) {
      setFavoriteError((e as Error).message);
    } finally {
      setSaving(null);
    }
  }
  return (
    <div className="community-music-picker">
      <div className="music-picker-heading">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <Music2 size={17} />
          {value
            ? en
              ? "Change music"
              : "Trocar música"
            : en
              ? "Add music"
              : "Adicionar música"}
        </button>
        {value && (
          <button
            type="button"
            disabled={disabled}
            aria-label={en ? "Remove music" : "Remover música"}
            onClick={() => onChange(null)}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {value && (
        <CommunityMusicPlayer key={value} trackId={value} locale={locale} />
      )}
      {open && (
        <div className="music-search">
          <div
            className="music-discovery-tabs"
            role="tablist"
            aria-label={en ? "Music library" : "Biblioteca de músicas"}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "recommended"}
              disabled={disabled}
              onClick={() => {
                setTab("recommended");
                setQuery("");
              }}
            >
              {en ? "Recommended" : "Recomendadas"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "favorites"}
              disabled={disabled}
              onClick={() => {
                setTab("favorites");
                setQuery("");
              }}
            >
              <Heart size={13} />
              {en ? "Favorites" : "Favoritas"} <span>{favorites.length}</span>
            </button>
          </div>
          {tab === "recommended" && query.trim().length < 2 && (
            <div className="music-categories">
              {[
                ["trending", en ? "Trending" : "Em alta"],
                ["workout", en ? "Workout" : "Treino"],
                ["pop", "Pop"],
                ["electronic", en ? "Electronic" : "Eletrônica"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={category === key}
                  disabled={disabled}
                  onClick={() => setCategory(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <label>
            <Search size={16} />
            <input
              aria-label={en ? "Search Deezer" : "Buscar no Deezer"}
              placeholder={en ? "Song or artist…" : "Música ou artista…"}
              value={query}
              maxLength={80}
              disabled={disabled}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <small>
            {en
              ? "Deezer · Select a 30-second preview"
              : "Deezer · Escolha uma prévia de até 30 segundos"}
          </small>
          {loading && <p role="status">{en ? "Searching…" : "Buscando…"}</p>}
          {error && <p role="alert">{error}</p>}
          {favoriteError && <p role="status">{favoriteError}</p>}
          {!loading && !error && !displayed.length && (
            <p>
              {tab === "favorites" && query.trim().length < 2
                ? en
                  ? "Save songs with the heart to find them here."
                  : "Toque no coração das músicas para encontrá-las aqui."
                : en
                  ? "No previews found."
                  : "Nenhuma prévia encontrada."}
            </p>
          )}
          {tab === "recommended" && query.trim().length < 2 && (
            <small>
              {en
                ? "Explore Deezer charts and themed selections."
                : "Explore músicas em alta no Deezer e seleções por tema."}
            </small>
          )}
          <div className="music-search-results">
            {displayed.map((track) => (
              <div className="music-result-row" key={track.id}>
                <button
                  key={track.id}
                  type="button"
                  disabled={disabled}
                  aria-label={`${en ? "Select" : "Selecionar"} ${track.title} — ${track.artist}`}
                  onClick={() => {
                    onChange(track.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {track.cover && (
                    <img
                      src={track.cover}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span>
                    <strong>{track.title}</strong>
                    <small>{track.artist}</small>
                  </span>
                  <Music2 size={16} />
                </button>
                <button
                  type="button"
                  className="music-favorite-button"
                  disabled={disabled || saving !== null}
                  aria-pressed={favorites.some((f) => f.id === track.id)}
                  aria-label={`${favorites.some((f) => f.id === track.id) ? (en ? "Unfavorite" : "Remover das favoritas") : en ? "Favorite" : "Favoritar"} ${track.title}`}
                  onClick={() => void favorite(track)}
                >
                  <Heart
                    size={18}
                    fill={
                      favorites.some((f) => f.id === track.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
