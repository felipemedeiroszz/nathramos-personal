"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { notifyDataChanged } from "@/lib/live/events";
import {
  reactionKinds,
  type CommunityPost,
  type CommunityComment,
  type FeedResult,
  type Reaction,
} from "@/lib/community";
import "./community.css";

const imageUrl = (path: string) =>
  `/api/community/image?path=${encodeURIComponent(path)}`;
const reactionText: Record<Reaction, [string, string, string]> = {
  like: ["👍", "Curtir", "Like"],
  love: ["❤️", "Amei", "Love"],
  strength: ["💪", "Força!", "Strength!"],
  congrats: ["👏", "Parabéns", "Congratulations"],
  motivation: ["🔥", "Motivação", "Motivation"],
};
async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Falha ao carregar.");
  return data;
}
async function mutate(input: Record<string, unknown>) {
  const data = await request("/api/community", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  notifyDataChanged();
  return data;
}
function Author({
  name,
  avatar,
  date,
  locale,
}: {
  name: string;
  avatar?: string | null;
  date: string;
  locale: string;
}) {
  return (
    <div className="community-author">
      <Avatar src={avatar || undefined} fallback={name?.slice(0, 2)} />
      <div>
        <strong>{name || "Aluno"}</strong>
        <time dateTime={date}>
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(date))}
        </time>
      </div>
    </div>
  );
}

function Composer({
  post,
  locale,
  onSaved,
  onClose,
}: {
  post?: CommunityPost;
  locale: string;
  onSaved: () => void;
  onClose?: () => void;
}) {
  const en = locale === "en-US";
  const [body, setBody] = useState(post?.body || "");
  const [images, setImages] = useState(post?.images || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const fileInput = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    if (files.length + images.length > 3) {
      setError(en ? "Choose up to 3 photos." : "Escolha até 3 fotos.");
      return;
    }
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        const { path } = await request("/api/community", {
          method: "POST",
          body: form,
        });
        setImages((previous) => [...previous, path]);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function publish() {
    setBusy(true);
    setError("");
    try {
      await mutate(
        post
          ? { action: "edit", id: post.id, version: post.version, body, images }
          : { action: "post", request_id: requestId.current, body, images },
      );
      setBody("");
      setImages([]);
      setPreview(false);
      requestId.current = crypto.randomUUID();
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="community-card community-composer"
      data-panel-editing={body || images.length ? "true" : undefined}
    >
      <div className="community-card-heading">
        <h2>
          {post
            ? en
              ? "Edit post"
              : "Editar publicação"
            : en
              ? "Share your journey"
              : "Compartilhe sua jornada"}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={en ? "Close editor" : "Fechar editor"}
          >
            <X size={20} />
          </button>
        )}
      </div>
      {preview ? (
        <p className="community-body">{body}</p>
      ) : (
        <textarea
          aria-label={en ? "Post text" : "Texto da publicação"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={3}
          placeholder={
            en
              ? "A small win, a new goal, a workout to remember…"
              : "Uma conquista, um novo objetivo, um treino para lembrar…"
          }
          disabled={busy}
        />
      )}
      <div className="community-gallery">
        {images.map((path) => (
          <div key={path}>
            <img
              src={imageUrl(path)}
              alt={en ? "Post preview" : "Prévia da publicação"}
            />
            {!preview && (
              <button
                type="button"
                disabled={busy}
                className="community-remove"
                onClick={() => setImages(images.filter((p) => p !== path))}
                aria-label={en ? "Remove photo" : "Remover foto"}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="community-hint">
        {en
          ? "Visible to active community members. JPG, PNG or WebP, up to 4 MB each. Only share photos you have permission to publish."
          : "Visível aos membros ativos da comunidade. JPG, PNG ou WebP, até 4 MB cada. Publique fotos com autorização das pessoas retratadas."}
      </p>
      <div className="community-composer-actions">
        <label className="community-upload">
          <Plus size={16} />
          {en ? "Photos" : "Fotos"} ({images.length}/3)
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy || images.length >= 3}
            onChange={(e) => void upload(e.target.files)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => setPreview(!preview)}
        >
          {preview
            ? en
              ? "Continue editing"
              : "Continuar edição"
            : en
              ? "Preview"
              : "Prévia"}
        </button>
        <Button
          disabled={busy || (!body.trim() && !images.length)}
          onClick={() => void publish()}
        >
          <Send size={15} />{" "}
          {busy ? (en ? "Saving…" : "Salvando…") : en ? "Publish" : "Publicar"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="community-error">
          {error}
        </p>
      )}
    </section>
  );
}

function Thread({
  postId,
  locale,
  userId,
  admin,
  canWrite,
  onChanged,
}: {
  postId: string;
  locale: string;
  userId: string;
  admin: boolean;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const en = locale === "en-US";
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<CommunityComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useRef(crypto.randomUUID());
  const load = useCallback(
    async (offset = 0) => {
      try {
        const rows: CommunityComment[] = await request(
          `/api/community?thread=${postId}&offset=${offset}`,
        );
        setHasMore(rows.length > 50);
        setComments((previous) =>
          offset ? [...previous, ...rows.slice(0, 50)] : rows.slice(0, 50),
        );
        setError("");
      } catch (error) {
        setError((error as Error).message);
      }
    },
    [postId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        !document.hidden &&
        !document.activeElement?.closest(".community-thread")
      )
        void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await mutate({
        action: "comment",
        post_id: postId,
        body,
        parent_id: reply?.id || null,
        request_id: id.current,
      });
      setBody("");
      setReply(null);
      id.current = crypto.randomUUID();
      await load();
      onChanged();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(comment: CommunityComment) {
    if (
      !window.confirm(en ? "Delete this comment?" : "Excluir este comentário?")
    )
      return;
    const reason = admin
      ? window.prompt(en ? "Moderation reason" : "Motivo da moderação")
      : undefined;
    if (admin && !reason?.trim()) return;
    setBusy(true);
    try {
      await mutate({ action: "delete_comment", id: comment.id, reason });
      await load();
      onChanged();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="community-thread"
      aria-label={en ? "Comments" : "Comentários"}
    >
      {comments.map((comment) => (
        <div
          className={`community-comment ${comment.parent_id ? "community-reply" : ""}`}
          key={comment.id}
        >
          <Author
            name={comment.name}
            avatar={comment.avatar}
            date={comment.created_at}
            locale={locale}
          />
          {comment.parent_id && (
            <blockquote>
              {comment.reply_to ||
                (en
                  ? "Reply to a deleted comment"
                  : "Resposta a comentário removido")}
            </blockquote>
          )}
          <p className="community-body">
            {comment.deleted
              ? en
                ? "Comment removed"
                : "Comentário removido"
              : comment.body}
          </p>
          {!comment.deleted && (
            <div className="community-comment-actions">
              <button
                type="button"
                disabled={!canWrite}
                onClick={() => setReply(comment)}
              >
                {en ? "Reply" : "Responder"}
              </button>
              {(admin || comment.author_id === userId) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(comment)}
                >
                  {en ? "Delete" : "Excluir"}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      {!comments.length && !error && (
        <p className="community-hint">
          {en ? "Start the conversation." : "Comece a conversa."}
        </p>
      )}
      {hasMore && (
        <button type="button" onClick={() => void load(comments.length)}>
          {en ? "More comments" : "Mais comentários"}
        </button>
      )}
      <form onSubmit={(e) => void send(e)} className="community-comment-form">
        {reply && (
          <p>
            {en ? "Replying to" : "Respondendo a"} {reply.name}{" "}
            <button
              type="button"
              onClick={() => setReply(null)}
              aria-label={en ? "Cancel reply" : "Cancelar resposta"}
            >
              ×
            </button>
          </p>
        )}
        <label className="sr-only" htmlFor={`comment-${postId}`}>
          {en ? "Comment" : "Comentário"}
        </label>
        <textarea
          id={`comment-${postId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          disabled={!canWrite || busy}
          rows={2}
          required
          placeholder={
            en
              ? "Write an encouraging message…"
              : "Deixe uma mensagem de incentivo…"
          }
        />
        <Button type="submit" disabled={!canWrite || busy || !body.trim()}>
          {en ? "Send" : "Enviar"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="community-error">
          {error}
        </p>
      )}
    </section>
  );
}

function PostCard({
  post,
  locale,
  userId,
  admin,
  canWrite,
  onChanged,
  onHistory,
}: {
  post: CommunityPost;
  locale: string;
  userId: string;
  admin: boolean;
  canWrite: boolean;
  onChanged: () => void;
  onHistory: (id: string) => void;
}) {
  const en = locale === "en-US";
  const [editing, setEditing] = useState(false);
  const [comments, setComments] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("post") === post.id)
      setComments(true);
  }, [post.id]);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [people, setPeople] = useState<
    { user_id: string; name: string; kind: Reaction }[]
  >([]);
  const [morePeople, setMorePeople] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const article = useRef<HTMLElement>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      const rect = article.current?.getBoundingClientRect();
      if (
        !document.hidden &&
        !editing &&
        rect &&
        rect.top < innerHeight &&
        rect.bottom > 0
      )
        onChanged();
    }, 15000);
    return () => clearInterval(timer);
  }, [editing, onChanged]);
  async function react(kind: Reaction) {
    setBusy(true);
    setError("");
    try {
      await mutate({
        action: "react",
        post_id: post.id,
        kind: post.my_reaction === kind ? null : kind,
      });
      onChanged();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadPeople(offset = 0) {
    try {
      const rows = await request(
        `/api/community?thread=${post.id}&mode=reactions&offset=${offset}`,
      );
      setPeople((previous) =>
        offset ? [...previous, ...rows.slice(0, 50)] : rows.slice(0, 50),
      );
      setMorePeople(rows.length > 50);
      setPeopleOpen(true);
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function remove() {
    if (
      !window.confirm(
        en
          ? "Delete this post and hide its interactions?"
          : "Excluir esta publicação e ocultar suas interações?",
      )
    )
      return;
    const reason = admin
      ? window.prompt(en ? "Moderation reason" : "Motivo da moderação")
      : undefined;
    if (admin && !reason?.trim()) return;
    setBusy(true);
    try {
      await mutate({ action: "delete_post", post_id: post.id, reason });
      onChanged();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (editing && canWrite)
    return (
      <Composer
        post={post}
        locale={locale}
        onSaved={() => {
          setEditing(false);
          onChanged();
        }}
        onClose={() => setEditing(false)}
      />
    );
  return (
    <article ref={article} className="community-card" id={`post-${post.id}`}>
      <header className="community-card-heading">
        <Author
          name={post.name}
          avatar={post.avatar}
          date={post.created_at}
          locale={locale}
        />
        {(post.author_id === userId || admin) && (
          <details className="community-options">
            <summary aria-label={en ? "Post options" : "Opções da publicação"}>
              •••
            </summary>
            <div>
              {post.author_id === userId && canWrite && (
                <button type="button" onClick={() => setEditing(true)}>
                  {en ? "Edit" : "Editar"}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
              >
                {en ? "Delete" : "Excluir"}
              </button>
              {admin && (
                <button type="button" onClick={() => onHistory(post.author_id)}>
                  {en ? "Student history" : "Histórico do aluno"}
                </button>
              )}
            </div>
          </details>
        )}
      </header>
      <p className="community-body">{post.body}</p>
      {post.updated_at !== post.created_at && (
        <span className="community-hint">{en ? "Edited" : "Editado"}</span>
      )}
      {!!post.images.length && (
        <div className="community-gallery">
          {post.images.map((path, i) => (
            <a
              href={imageUrl(path)}
              key={path}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={imageUrl(path)}
                alt={`${en ? "Photo" : "Foto"} ${i + 1} · ${post.name}`}
                loading="lazy"
                decoding="async"
              />
            </a>
          ))}
        </div>
      )}
      <div className="community-counts">
        <button type="button" onClick={() => void loadPeople()}>
          <Heart size={14} /> {post.reaction_count}{" "}
          {en ? "reactions" : "reações"}
        </button>
        <button type="button" onClick={() => setComments(!comments)}>
          {post.comment_count} {en ? "comments" : "comentários"}
        </button>
      </div>
      <div className="community-reactions">
        {reactionKinds.map((kind) => (
          <button
            type="button"
            key={kind}
            aria-pressed={post.my_reaction === kind}
            disabled={busy}
            onClick={() => void react(kind)}
            title={reactionText[kind][en ? 2 : 1]}
          >
            <span>{reactionText[kind][0]}</span>
            <span>{reactionText[kind][en ? 2 : 1]}</span>
            <small>{post.reactions[kind] || ""}</small>
          </button>
        ))}
      </div>
      <div className="community-post-actions">
        <button type="button" onClick={() => setComments(!comments)}>
          <MessageCircle size={17} /> {en ? "Comment" : "Comentar"}
        </button>
        <a
          href={`/${locale}/${admin ? "admin/" : ""}comunidade?post=${post.id}`}
        >
          <Share2 size={16} />
          {en ? "Open post" : "Abrir publicação"}
        </a>
      </div>
      {peopleOpen && (
        <section
          className="community-people"
          aria-label={en ? "Reactions" : "Reações"}
        >
          <div className="community-card-heading">
            <strong>{en ? "Who reacted" : "Quem reagiu"}</strong>
            <button
              type="button"
              onClick={() => setPeopleOpen(false)}
              aria-label={en ? "Close reactions" : "Fechar reações"}
            >
              <X size={16} />
            </button>
          </div>
          {people.map((person) => (
            <p key={person.user_id}>
              {reactionText[person.kind][0]} {person.name || "Aluno"}
            </p>
          ))}
          {morePeople && (
            <button
              type="button"
              onClick={() => void loadPeople(people.length)}
            >
              {en ? "Load more" : "Carregar mais"}
            </button>
          )}
        </section>
      )}
      {comments && (
        <Thread
          postId={post.id}
          locale={locale}
          userId={userId}
          admin={admin}
          canWrite={canWrite}
          onChanged={onChanged}
        />
      )}
      {error && (
        <p role="alert" className="community-error">
          {error}
        </p>
      )}
    </article>
  );
}

export function CommunityFeed({
  userId,
  locale,
  admin = false,
  initial,
  postId,
}: {
  userId: string;
  locale: string;
  admin?: boolean;
  initial: FeedResult;
  postId?: string;
}) {
  const en = locale === "en-US";
  const label = (pt: string, english: string) => (en ? english : pt);
  const [items, setItems] = useState(initial.items.slice(0, 20));
  const [more, setMore] = useState(initial.items.length > 20);
  const [restriction, setRestriction] = useState(initial.restriction);
  const [filter, setFilter] = useState({
    mode: "posts",
    q: "",
    from: "",
    to: "",
    author: "",
    post: postId || "",
  });
  const [draft, setDraft] = useState({ q: "", from: "", to: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("24");
  const mounted = useRef(false);
  const generation = useRef(0);
  const postVersions = useRef(new Map<string, number>());
  const visibleCount = useRef(items.length);
  visibleCount.current = items.length;
  const refreshPost = useCallback(async (id: string) => {
    const version = (postVersions.current.get(id) || 0) + 1;
    postVersions.current.set(id, version);
    try {
      const result: FeedResult = await request("/api/community?post=" + id);
      if (postVersions.current.get(id) !== version) return;
      setItems((previous) =>
        result.items.length
          ? previous.map((item) => (item.id === id ? result.items[0] : item))
          : previous.filter((item) => item.id !== id),
      );
    } catch (error) {
      setError((error as Error).message);
    }
  }, []);
  const canWrite =
    admin ||
    !restriction ||
    Date.parse(restriction.blocked_until) <= Date.now();
  const load = useCallback(
    async (cursor?: { created_at: string; id: string }) => {
      const current = ++generation.current;
      const params = new URLSearchParams({
        mode: filter.mode,
        admin: String(admin),
      });
      for (const [key, value] of Object.entries(filter)) {
        if (!value || key === "mode") continue;
        params.set(
          key,
          key === "from"
            ? new Date(value + "T00:00:00-03:00").toISOString()
            : key === "to"
              ? new Date(
                  new Date(value + "T00:00:00-03:00").getTime() + 86400000,
                ).toISOString()
              : value,
        );
      }
      if (cursor) {
        params.set("cursor", cursor.created_at);
        params.set("cursor_id", cursor.id);
      }
      try {
        const data: FeedResult = await request("/api/community?" + params);
        if (!cursor) {
          const targetCount = Math.max(20, visibleCount.current);
          while (data.items.length > 20 && data.items.length <= targetCount) {
            const last = data.items[data.items.length - 2];
            params.set("cursor", last.created_at);
            params.set("cursor_id", last.id);
            const next: FeedResult = await request("/api/community?" + params);
            data.items = [...data.items.slice(0, -1), ...next.items];
            if (next.items.length <= 20) break;
          }
        }
        if (current !== generation.current) return;
        const count = cursor
          ? 20
          : Math.max(20, Math.ceil(visibleCount.current / 20) * 20);
        setItems((previous) =>
          cursor
            ? [
                ...new Map(
                  [...previous, ...data.items.slice(0, 20)].map((item) => [
                    item.id,
                    item,
                  ]),
                ).values(),
              ]
            : data.items.slice(0, count),
        );
        setMore(data.items.length > count);
        setRestriction(data.restriction);
        setError("");
      } catch (error) {
        if (current === generation.current) setError((error as Error).message);
      }
    },
    [filter, admin],
  );
  useEffect(() => {
    if (mounted.current) void load();
    else mounted.current = true;
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        !document.hidden &&
        window.scrollY < 250 &&
        !document.querySelector('[data-panel-editing="true"]') &&
        !document.activeElement?.closest(
          "input, textarea, select, details, .community-thread",
        )
      )
        void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);
  const history = (author: string) =>
    setFilter((previous) => ({ ...previous, author, post: "" }));
  async function setPermissions(reactivate: boolean) {
    setBusy(true);
    setError("");
    try {
      await mutate({
        action: "restrict",
        user_id: filter.author,
        until: reactivate
          ? null
          : new Date(Date.now() + Number(hours) * 3600000).toISOString(),
        reason,
      });
      setReason("");
      await load();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="community-page">
      <header className="community-heading">
        <span className="community-eyebrow">
          <Users size={16} /> {label("JUNTOS, MAIS LONGE", "STRONGER TOGETHER")}
        </span>
        <h1>
          {admin
            ? label("Gerenciamento da Comunidade", "Community management")
            : label("Comunidade", "Community")}
        </h1>
        <p>
          {admin
            ? label(
                "Acompanhe as conversas e cuide de um espaço seguro para todos.",
                "Follow conversations and keep this a welcoming space.",
              )
            : label(
                "Cada conquista inspira. Compartilhe a sua e celebre a de quem treina com você.",
                "Every win inspires. Share yours and celebrate your community.",
              )}
        </p>
      </header>
      <div className="community-columns">
        <div className="community-main">
          {admin && (
            <section className="community-card">
              <form
                className="community-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  setFilter((previous) => ({
                    ...previous,
                    ...draft,
                    post: "",
                  }));
                }}
              >
                <label>
                  {label("Nome do aluno", "Student name")}
                  <Input
                    value={draft.q}
                    onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                    maxLength={100}
                  />
                </label>
                <label>
                  {label("De", "From")}
                  <Input
                    type="date"
                    value={draft.from}
                    onChange={(e) =>
                      setDraft({ ...draft, from: e.target.value })
                    }
                  />
                </label>
                <label>
                  {label("Até", "To")}
                  <Input
                    type="date"
                    value={draft.to}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                  />
                </label>
                <Button type="submit">{label("Buscar", "Search")}</Button>
              </form>
              <div className="community-tabs">
                {["posts", "comments", "reactions", "members"].map(
                  (mode, i) => (
                    <button
                      type="button"
                      key={mode}
                      aria-pressed={filter.mode === mode}
                      onClick={() => setFilter({ ...filter, mode, post: "" })}
                    >
                      {
                        [
                          label("Publicações", "Posts"),
                          label("Comentários", "Comments"),
                          label("Reações", "Reactions"),
                          label("Alunos", "Students"),
                        ][i]
                      }
                    </button>
                  ),
                )}
              </div>
              {filter.author && (
                <p>
                  {label("Histórico individual", "Student history")} ·{" "}
                  <button
                    type="button"
                    onClick={() => setFilter({ ...filter, author: "" })}
                  >
                    {label("Ver todos", "View all")}
                  </button>
                </p>
              )}
            </section>
          )}
          {restriction &&
            new Date(restriction.blocked_until).getTime() > Date.now() && (
              <p className="community-notice">
                {label(
                  "Publicações e comentários suspensos até",
                  "Posting and commenting suspended until",
                )}{" "}
                {new Date(restriction.blocked_until).toLocaleString(locale)}.{" "}
                {restriction.reason}
              </p>
            )}
          {!admin && !filter.post && canWrite && (
            <Composer locale={locale} onSaved={() => void load()} />
          )}
          {filter.post && (
            <a href={`/${locale}/${admin ? "admin/" : ""}comunidade`}>
              {label("← Voltar ao feed", "← Back to feed")}
            </a>
          )}
          {items.map((item) =>
            filter.mode === "posts" ? (
              <PostCard
                key={item.id}
                post={item}
                locale={locale}
                userId={userId}
                admin={admin}
                canWrite={canWrite}
                onChanged={() => void refreshPost(item.id)}
                onHistory={history}
              />
            ) : (
              <AdminActivity
                key={item.id}
                item={item}
                mode={filter.mode}
                locale={locale}
                onHistory={history}
                onChanged={() => void load()}
              />
            ),
          )}
          {!items.length && (
            <div className="community-card community-empty">
              <Users size={32} />
              <h2>
                {label(
                  "Um espaço para novas conquistas",
                  "A space for new wins",
                )}
              </h2>
              <p>
                {label(
                  "Nenhuma publicação ou interação encontrada.",
                  "No posts or interactions found.",
                )}
              </p>
            </div>
          )}
          {more && (
            <Button
              variant="secondary"
              onClick={() => void load(items[items.length - 1])}
            >
              {label("Carregar mais", "Load more")}
            </Button>
          )}
          {error && (
            <p role="alert" className="community-error">
              {error}
            </p>
          )}
        </div>
        <aside className="community-aside">
          <section className="community-card">
            <Users size={25} />
            <h2>{label("Sua jornada tem companhia", "You are not alone")}</h2>
            <p>
              {label(
                "Celebre a evolução, incentive quem está começando e respeite o ritmo de cada pessoa.",
                "Celebrate progress, encourage beginners and respect everyone's pace.",
              )}
            </p>
            <ul>
              <li>
                {label(
                  "Respeito em cada conversa",
                  "Respect in every conversation",
                )}
              </li>
              <li>{label("Fotos com consentimento", "Photos with consent")}</li>
              <li>
                {label(
                  "Incentivo, sem comparações",
                  "Encouragement without comparisons",
                )}
              </li>
            </ul>
          </section>
          {admin && filter.author && (
            <section className="community-card community-permissions">
              <h2>{label("Permissões do aluno", "Student permissions")}</h2>
              <p>
                {label(
                  "Suspender publicações e comentários",
                  "Suspend posts and comments",
                )}
              </p>
              <label>
                {label("Duração", "Duration")}
                <select
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                >
                  <option value="24">24h</option>
                  <option value="168">7 {label("dias", "days")}</option>
                  <option value="720">30 {label("dias", "days")}</option>
                </select>
              </label>
              <label>
                {label("Motivo", "Reason")}
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </label>
              <Button
                disabled={busy || !reason.trim()}
                onClick={() => void setPermissions(false)}
              >
                {label("Suspender participação", "Suspend participation")}
              </Button>
              <Button
                variant="secondary"
                disabled={busy || !reason.trim()}
                onClick={() => void setPermissions(true)}
              >
                {label("Reativar participação", "Restore participation")}
              </Button>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

function AdminActivity({
  item,
  mode,
  locale,
  onHistory,
  onChanged,
}: {
  item: CommunityComment;
  mode: string;
  locale: string;
  onHistory: (id: string) => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState("");
  const en = locale === "en-US";
  async function remove() {
    if (
      !window.confirm(en ? "Delete this comment?" : "Excluir este comentário?")
    )
      return;
    const reason = window.prompt(
      en ? "Moderation reason" : "Motivo da moderação",
    );
    if (!reason?.trim()) return;
    try {
      await mutate({ action: "delete_comment", id: item.id, reason });
      onChanged();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  return (
    <article className="community-card">
      <Author name={item.name} date={item.created_at} locale={locale} />
      <p className="community-body">
        {mode === "reactions"
          ? reactionText[item.body as Reaction]?.[en ? 2 : 1]
          : item.body}
      </p>
      <div className="community-post-actions">
        {item.post_id && (
          <a href={`/${locale}/admin/comunidade?post=${item.post_id}`}>
            {en ? "Open post" : "Abrir publicação"}
          </a>
        )}
        <button type="button" onClick={() => onHistory(item.author_id)}>
          {en
            ? "Student history and permissions"
            : "Histórico e permissões do aluno"}
        </button>
        {mode === "comments" && (
          <button type="button" onClick={() => void remove()}>
            {en ? "Delete" : "Excluir"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="community-error">
          {error}
        </p>
      )}
    </article>
  );
}
