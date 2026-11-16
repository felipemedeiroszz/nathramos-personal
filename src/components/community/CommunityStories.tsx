"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Trash2,
  ImagePlus,
  Sparkles,
} from "lucide-react";
import { CommunityMusicPicker, CommunityMusicPlayer } from "./CommunityMusic";
import { useStoryImages } from "./useStoryImages";
import { Avatar } from "@/components/ui/Avatar";

type Story = {
  id: string;
  author_id: string;
  name: string;
  avatar: string | null;
  image_path: string | null;
  caption: string;
  theme: string;
  text_position: string;
  text_x?: number | null;
  text_y?: number | null;
  text_scale?: number;
  music_track_id?: number | null;
  created_at: string;
  expires_at: string;
};
async function api(input?: unknown) {
  const r = await fetch("/api/community/stories", {
    method: input ? "POST" : "GET",
    cache: "no-store",
    headers: input ? { "Content-Type": "application/json" } : undefined,
    body: input ? JSON.stringify(input) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Stories indisponíveis.");
  return data;
}
function Modal({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="story-modal"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
type TextPoint = { x: number; y: number };
const clamp = (value: number) => Math.max(0, Math.min(100, value));
function Stage({
  story,
  src,
  onPositionChange,
  dragLabel,
  onScaleChange,
  onImageReady,
}: {
  story: Pick<
    Story,
    | "caption"
    | "theme"
    | "text_position"
    | "text_x"
    | "text_y"
    | "text_scale"
    | "music_track_id"
  >;
  src?: string;
  onPositionChange?: (point: TextPoint) => void;
  dragLabel?: string;
  onScaleChange?: (scale: number) => void;
  onImageReady?: () => void;
}) {
  const drag = useRef<{
    id: number;
    clientX: number;
    clientY: number;
    point: TextPoint;
    width: number;
    height: number;
  } | null>(null);
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const distance = (touches: React.TouchList) =>
    Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );
  const point = {
    x: story.text_x ?? 50,
    y:
      story.text_y ??
      (story.text_position === "top"
        ? 0
        : story.text_position === "bottom"
          ? 100
          : 50),
  };
  return (
    <div
      className={`story-stage story-theme-${story.theme} ${story.music_track_id ? "story-has-music" : ""}`}
      style={
        {
          "--story-text-scale": story.text_scale ?? 1,
          touchAction: onScaleChange ? "none" : undefined,
        } as React.CSSProperties
      }
      onTouchStartCapture={(event) => {
        if (onScaleChange && event.touches.length === 2) {
          drag.current = null;
          pinch.current = {
            distance: Math.max(1, distance(event.touches)),
            scale: story.text_scale ?? 1,
          };
        }
      }}
      onTouchMoveCapture={(event) => {
        if (onScaleChange && pinch.current && event.touches.length === 2) {
          onScaleChange(
            Math.max(
              0.5,
              Math.min(
                2,
                (pinch.current.scale * distance(event.touches)) /
                  pinch.current.distance,
              ),
            ),
          );
        }
      }}
      onTouchEndCapture={() => {
        pinch.current = null;
        drag.current = null;
      }}
      onTouchCancelCapture={() => {
        pinch.current = null;
        drag.current = null;
      }}
    >
      {src && (
        <img
          className="story-photo"
          src={src}
          alt=""
          width={1080}
          height={1920}
          draggable={false}
          loading="eager"
          fetchPriority="high"
          onLoad={onImageReady}
        />
      )}
      <div className="story-caption story-caption-free">
        <span
          className={onPositionChange ? "story-draggable" : undefined}
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: `translate(-${point.x}%, -${point.y}%)`,
          }}
          role={onPositionChange ? "button" : undefined}
          tabIndex={onPositionChange ? 0 : undefined}
          aria-label={onPositionChange ? dragLabel : undefined}
          onPointerDown={(event) => {
            if (
              !onPositionChange ||
              pinch.current ||
              !event.isPrimary ||
              event.button !== 0
            )
              return;
            event.preventDefault();
            const box = event.currentTarget.getBoundingClientRect();
            const area =
              event.currentTarget.parentElement!.getBoundingClientRect();
            drag.current = {
              id: event.pointerId,
              clientX: event.clientX,
              clientY: event.clientY,
              point,
              width: Math.max(1, area.width - box.width),
              height: Math.max(1, area.height - box.height),
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (
              !onPositionChange ||
              pinch.current ||
              !start ||
              start.id !== event.pointerId
            )
              return;
            onPositionChange({
              x: clamp(
                start.point.x +
                  ((event.clientX - start.clientX) * 100) / start.width,
              ),
              y: clamp(
                start.point.y +
                  ((event.clientY - start.clientY) * 100) / start.height,
              ),
            });
          }}
          onPointerUp={(event) => {
            if (drag.current?.id === event.pointerId) {
              drag.current = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            if (!onPositionChange) return;
            const delta = event.shiftKey ? 10 : 2;
            const direction: Record<string, TextPoint> = {
              ArrowLeft: { x: -delta, y: 0 },
              ArrowRight: { x: delta, y: 0 },
              ArrowUp: { x: 0, y: -delta },
              ArrowDown: { x: 0, y: delta },
            };
            const step = direction[event.key];
            if (step) {
              event.preventDefault();
              onPositionChange({
                x: clamp(point.x + step.x),
                y: clamp(point.y + step.y),
              });
            }
          }}
        >
          {story.caption}
        </span>
      </div>
    </div>
  );
}
export function CommunityStories({
  userId,
  admin = false,
  locale,
}: {
  userId: string;
  admin?: boolean;
  locale: string;
}) {
  const en = locale === "en-US";
  const t = (pt: string, english: string) => (en ? english : pt);
  const [stories, setStories] = useState<Story[]>([]),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [active, setActive] = useState<string | null>(null),
    [paused, setPaused] = useState(false),
    [seen, setSeen] = useState<string[]>([]);
  const [caption, setCaption] = useState(""),
    [theme, setTheme] = useState("gold"),
    [position, setPosition] = useState("center"),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [editorError, setEditorError] = useState("");
  const [music, setMusic] = useState<number | null>(null);
  const [textScale, setTextScale] = useState(1);
  const [textPoint, setTextPoint] = useState<TextPoint>({ x: 50, y: 50 });
  const requestId = useRef(crypto.randomUUID());
  const load = useCallback(async () => {
    try {
      setStories(await api());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // Remove expired stories locally as well as in every server read.
  useEffect(() => {
    const timer = setInterval(
      () =>
        setStories((items) =>
          items.some((s) => Date.parse(s.expires_at) <= Date.now())
            ? items.filter((s) => Date.parse(s.expires_at) > Date.now())
            : items,
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  const ordered = useMemo(
    () =>
      [...stories].sort(
        (a, b) =>
          a.author_id.localeCompare(b.author_id) ||
          Date.parse(a.created_at) - Date.parse(b.created_at),
      ),
    [stories],
  );
  const index = ordered.findIndex((s) => s.id === active),
    current = ordered[index];
  const [musicPlaying, setMusicPlaying] = useState(false);
  const storyImages = useStoryImages(ordered, active);
  const imageReady =
    !current?.image_path || Boolean(storyImages.sources[current.id]);
  const [decodedStory, setDecodedStory] = useState<string | null>(null);
  const mediaReady =
    imageReady && (!current?.image_path || decodedStory === current.id);
  const groups = Array.from(
    new Map(stories.map((s) => [s.author_id, s])).values(),
  );
  const move = useCallback(
    (direction: number) => {
      const next = ordered[index + direction];
      setActive(next?.id || null);
      setPaused(false);
    },
    [ordered, index],
  );
  useEffect(() => {
    if (!active) return;
    setSeen((previous) =>
      previous.includes(active) ? previous : [...previous, active],
    );
  }, [active]);
  useEffect(() => {
    if (!current || paused || musicPlaying || !mediaReady || document.hidden)
      return;
    const timer = setTimeout(() => move(1), 8000);
    return () => clearTimeout(timer);
  }, [current, paused, move, mediaReady, musicPlaying]);
  function openEditor() {
    setCaption("");
    setFile(null);
    setTheme("gold");
    setPosition("center");
    setTextScale(1);
    setMusic(null);
    setTextPoint({ x: 50, y: 50 });
    setEditorError("");
    requestId.current = crypto.randomUUID();
    setEditing(true);
  }
  async function publish() {
    setBusy(true);
    setEditorError("");
    try {
      let path = null;
      if (file) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/community", {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        path = data.path;
      }
      await api({
        action: "create",
        request_id: requestId.current,
        image_path: path,
        caption,
        theme,
        text_position: position,
        text_x: textPoint.x,
        text_y: textPoint.y,
        text_scale: textScale,
        music_track_id: music,
      });
      setEditing(false);
      await load();
    } catch (e) {
      setEditorError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!current) return;
    setPaused(true);
    try {
      await api({ action: "delete", id: current.id });
      setActive(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="community-stories" aria-label="Stories">
      <div className="stories-title">
        <div>
          <Sparkles size={16} />
          <strong>{t("Momentos da comunidade", "Community moments")}</strong>
        </div>
        <span>24h</span>
      </div>
      <div className="stories-rail">
        <button className="story-bubble story-add" onClick={openEditor}>
          <span className="story-ring">
            <Plus size={25} />
          </span>
          <strong>{t("Seu story", "Your story")}</strong>
          <small>{t("Compartilhar", "Share")}</small>
        </button>
        {groups.map((group) => {
          const unseen = stories.some(
            (s) => s.author_id === group.author_id && !seen.includes(s.id),
          );
          return (
            <button
              key={group.author_id}
              className={`story-bubble ${unseen ? "" : "story-seen"}`}
              onClick={() => {
                setPaused(false);
                setActive(
                  ordered.find((s) => s.author_id === group.author_id)?.id ||
                    null,
                );
              }}
            >
              <span className="story-ring">
                <Avatar
                  src={group.avatar || undefined}
                  fallback={group.name.slice(0, 2)}
                />
              </span>
              <strong>
                {group.author_id === userId ? t("Você", "You") : group.name}
              </strong>
              <small>
                {stories.filter((s) => s.author_id === group.author_id).length}{" "}
                {t("momentos", "moments")}
              </small>
            </button>
          );
        })}
        {!groups.length && (
          <p className="stories-empty">
            {t(
              "Um treino, uma conquista, um novo começo. Compartilhe seu momento.",
              "A workout, a win, a fresh start. Share your moment.",
            )}
          </p>
        )}
      </div>
      {error && (
        <p role="status" className="community-error">
          {error}{" "}
          <button onClick={() => void load()}>
            {t("Tentar novamente", "Retry")}
          </button>
        </p>
      )}
      {editing && (
        <Modal
          label={t("Criar story", "Create story")}
          onClose={() => {
            if (!busy) setEditing(false);
          }}
        >
          <div className="story-editor">
            <div className="story-editor-preview">
              <Stage
                story={{
                  caption,
                  theme,
                  text_position: position,
                  text_x: textPoint.x,
                  text_y: textPoint.y,
                  text_scale: textScale,
                  music_track_id: music,
                }}
                onPositionChange={busy ? undefined : setTextPoint}
                onScaleChange={busy ? undefined : setTextScale}
                dragLabel={t(
                  "Arraste o texto; use as setas do teclado para ajustar",
                  "Drag text; use arrow keys to adjust",
                )}
                src={preview}
              />
              <span className="story-preview-label">
                {t("PRÉVIA · VISÍVEL POR 24H", "PREVIEW · VISIBLE FOR 24H")}
              </span>
            </div>
            <div className="story-tools">
              <header>
                <div>
                  <span className="community-eyebrow">STORIES</span>
                  <h2>
                    {t("Seu momento, do seu jeito", "Your moment, your way")}
                  </h2>
                </div>
                <button
                  aria-label={t("Fechar", "Close")}
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  <X />
                </button>
              </header>
              <p>
                {t(
                  "Uma foto, algumas palavras e a energia de quem está evoluindo com você.",
                  "A photo, a few words, and the energy of your community.",
                )}
              </p>
              <label className="story-file">
                <ImagePlus size={20} />
                {file ? file.name : t("Adicionar foto", "Add photo")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (!selected) return;
                    if (
                      selected.size > 4 * 1024 * 1024 ||
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        selected.type,
                      )
                    ) {
                      setEditorError(
                        t(
                          "Use JPG, PNG ou WebP de até 4 MB.",
                          "Use JPG, PNG or WebP up to 4 MB.",
                        ),
                      );
                      return;
                    }
                    setEditorError("");
                    setFile(selected);
                  }}
                />
              </label>
              {file && (
                <button
                  className="story-text-button"
                  disabled={busy}
                  onClick={() => setFile(null)}
                >
                  {t("Remover foto", "Remove photo")}
                </button>
              )}
              <label>
                {t("Texto sobre a foto", "Text over photo")}
                <textarea
                  aria-label={t("Texto do story", "Story text")}
                  value={caption}
                  maxLength={280}
                  rows={3}
                  disabled={busy}
                  placeholder={t(
                    "Qual foi a sua conquista de hoje?",
                    "What was your win today?",
                  )}
                  onChange={(e) => setCaption(e.target.value)}
                />
                <small>{caption.length}/280</small>
              </label>
              <div className="story-emojis" aria-label="Emojis">
                {[
                  "💪",
                  "🔥",
                  "✨",
                  "❤️",
                  "🏆",
                  "🙌",
                  "🥗",
                  "💧",
                  "🎯",
                  "👏",
                ].map((emoji) => (
                  <button
                    disabled={busy || caption.length + emoji.length > 280}
                    key={emoji}
                    aria-label={`${t("Adicionar", "Add")} ${emoji}`}
                    onClick={() => setCaption((text) => text + emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <fieldset>
                <legend>{t("Cor de fundo", "Background")}</legend>
                <div className="story-swatches">
                  {["gold", "rose", "ocean", "midnight"].map((color) => (
                    <button
                      key={color}
                      className={`story-theme-${color}`}
                      aria-label={color}
                      aria-pressed={theme === color}
                      disabled={busy}
                      onClick={() => setTheme(color)}
                    />
                  ))}
                </div>
              </fieldset>
              <CommunityMusicPicker
                value={music}
                onChange={setMusic}
                locale={locale}
                disabled={busy}
              />
              <fieldset className="story-size-control">
                <legend>
                  {t("Tamanho do texto e emojis", "Text and emoji size")}
                </legend>
                <div className="story-size-row">
                  <button
                    type="button"
                    disabled={busy || textScale <= 0.5}
                    aria-label={t(
                      "Diminuir texto e emojis",
                      "Decrease text and emojis",
                    )}
                    onClick={() =>
                      setTextScale((value) => Math.max(0.5, value - 0.1))
                    }
                  >
                    A−
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.01"
                    aria-label={t(
                      "Tamanho do texto e emojis",
                      "Text and emoji size",
                    )}
                    value={textScale}
                    disabled={busy}
                    onChange={(event) =>
                      setTextScale(Number(event.target.value))
                    }
                  />
                  <button
                    type="button"
                    disabled={busy || textScale >= 2}
                    aria-label={t(
                      "Aumentar texto e emojis",
                      "Increase text and emojis",
                    )}
                    onClick={() =>
                      setTextScale((value) => Math.min(2, value + 0.1))
                    }
                  >
                    A+
                  </button>
                  <output>{Math.round(textScale * 100)}%</output>
                </div>
                <div className="story-size-footer">
                  <small>
                    {t(
                      "Use dois dedos na prévia para ajustar.",
                      "Pinch the preview with two fingers to resize.",
                    )}
                  </small>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setTextScale(1)}
                  >
                    {t("Restaurar", "Reset")}
                  </button>
                </div>
              </fieldset>
              <fieldset>
                <legend>{t("Posição do texto", "Text position")}</legend>
                <p className="story-drag-hint">
                  {t(
                    "Arraste o texto na prévia com o dedo ou mouse. No teclado, use as setas.",
                    "Drag text in the preview with your finger or mouse. Use arrow keys on a keyboard.",
                  )}
                </p>
                <div className="story-positions">
                  {["top", "center", "bottom"].map((p, i) => (
                    <button
                      key={p}
                      aria-pressed={position === p}
                      disabled={busy}
                      onClick={() => {
                        setPosition(p);
                        setTextPoint({
                          x: 50,
                          y: p === "top" ? 0 : p === "bottom" ? 100 : 50,
                        });
                      }}
                    >
                      {
                        [
                          t("Acima", "Top"),
                          t("Centro", "Center"),
                          t("Abaixo", "Bottom"),
                        ][i]
                      }
                    </button>
                  ))}
                </div>
              </fieldset>
              {editorError && (
                <p role="alert" className="community-error">
                  {editorError}
                </p>
              )}
              <button
                className="story-publish"
                disabled={busy || (!file && !caption.trim())}
                onClick={() => void publish()}
              >
                {busy
                  ? t("Publicando…", "Publishing…")
                  : t("Compartilhar story", "Share story")}{" "}
                <Sparkles size={16} />
              </button>
              <small>
                {t(
                  "Desaparece da comunidade após 24 horas.",
                  "Disappears from the community after 24 hours.",
                )}
              </small>
            </div>
          </div>
        </Modal>
      )}
      {active && current && (
        <Modal
          label={t("Visualizar story", "View story")}
          onClose={() => setActive(null)}
        >
          <div
            className="story-viewer"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") move(1);
              if (e.key === "ArrowLeft") move(-1);
            }}
          >
            <Stage
              story={current}
              src={
                current.image_path ? storyImages.sources[current.id] : undefined
              }
              onImageReady={() => setDecodedStory(current.id)}
            />
            {current.image_path && !mediaReady && (
              <div className="story-image-loading" role="status">
                {storyImages.errors[current.id] ? (
                  <>
                    <span>
                      {t(
                        "Não foi possível carregar a foto.",
                        "Could not load this photo.",
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => storyImages.retry(current.id)}
                    >
                      {t("Tentar novamente", "Retry")}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="story-loading-spinner" />
                    <span>{t("Carregando foto…", "Loading photo…")}</span>
                  </>
                )}
              </div>
            )}
            {current.music_track_id && (
              <div className="story-music">
                <CommunityMusicPlayer
                  key={current.id}
                  trackId={current.music_track_id}
                  locale={locale}
                  onPlayingChange={setMusicPlaying}
                  autoPlay={mediaReady}
                />
              </div>
            )}
            <div className="story-view-top">
              <div className="story-progress" key={current.id}>
                {ordered
                  .filter((s) => s.author_id === current.author_id)
                  .map((s) => (
                    <span
                      key={s.id}
                      className={
                        s.id === active
                          ? "is-active"
                          : seen.includes(s.id)
                            ? "is-seen"
                            : ""
                      }
                    >
                      <i
                        style={
                          s.id === active
                            ? {
                                animationPlayState:
                                  paused || musicPlaying || !mediaReady
                                    ? "paused"
                                    : "running",
                              }
                            : undefined
                        }
                      />
                    </span>
                  ))}
              </div>
              <header>
                <Avatar
                  src={current.avatar || undefined}
                  fallback={current.name.slice(0, 2)}
                />
                <div>
                  <strong>{current.name}</strong>
                  <small>
                    {new Intl.DateTimeFormat(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(current.created_at))}{" "}
                    · {t("Story de 24 horas", "24-hour story")}
                  </small>
                </div>
                <button
                  aria-label={
                    paused ? t("Continuar", "Play") : t("Pausar", "Pause")
                  }
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? <Play size={19} /> : <Pause size={19} />}
                </button>
                {(current.author_id === userId || admin) && (
                  <button
                    aria-label={t("Excluir story", "Delete story")}
                    onClick={() => void remove()}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  aria-label={t("Fechar", "Close")}
                  onClick={() => setActive(null)}
                >
                  <X />
                </button>
              </header>
            </div>
            <button
              className="story-previous"
              aria-label={t("Story anterior", "Previous story")}
              disabled={index === 0}
              onClick={() => move(-1)}
            >
              <ChevronLeft />
            </button>
            <button
              className="story-next"
              aria-label={t("Próximo story", "Next story")}
              onClick={() => move(1)}
            >
              <ChevronRight />
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
