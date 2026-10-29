"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Loader2,
  SendHorizonal,
  Smile,
  Check,
  MessageCircle,
  ArrowDown,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { createClientBrowser } from "@/lib/supabase/client";
import {
  sendChatMessageAction,
  markRoomReadAction,
  fetchRoomMessagesAction,
} from "@/app/actions/mentoring";
import { cn } from "@/lib/utils";
import "./mentoring.css";

export type ChatSenderTypeT = "user" | "coach" | "system";

export interface ChatMessageItem {
  id: string;
  roomId: string;
  senderId: string | null;
  senderType: ChatSenderTypeT;
  content: string;
  createdAt: string;
}

export interface MentorChatProps {
  roomId: string;
  viewer: "coach" | "user";
  currentUserId: string;
  counterpartName: string;
  counterpartAvatarUrl?: string | null;
  initialMessages: ChatMessageItem[];
  className?: string;
}

export interface RawChatRow {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_type: ChatSenderTypeT;
  content: string;
  created_at: string;
}

export function mapRawRow(row: RawChatRow): ChatMessageItem {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    senderType: row.sender_type,
    content: row.content,
    createdAt: row.created_at,
  };
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function MentorChat({
  roomId,
  viewer,
  currentUserId,
  counterpartName,
  counterpartAvatarUrl,
  initialMessages,
  className,
}: MentorChatProps) {
  const t = useTranslations("mentoring");
  const locale = useLocale();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const sendLock = useRef(false);
  const activeRoom = useRef(roomId);
  activeRoom.current = roomId;
  const en = locale === "en-US";

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMessages((prev) => {
      const merged = new Map(
        prev.filter((m) => m.roomId === roomId).map((m) => [m.id, m]),
      );
      initialMessages.forEach((m) => merged.set(m.id, m));
      return [...merged.values()];
    });
  }, [initialMessages, roomId]);

  useEffect(() => {
    setDraft("");
    setErrorMsg(null);
    setEmojiOpen(false);
    setHasNew(false);
    nearBottom.current = true;
  }, [roomId]);

  useEffect(() => {
    if (!emojiOpen) return;
    const close = (event: MouseEvent) => {
      if (!emojiRef.current?.contains(event.target as Node))
        setEmojiOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [emojiOpen]);

  const appendMessage = useCallback((incoming: ChatMessageItem) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      const confirmed = prev.filter(
        (m) =>
          !(
            pendingRef.current.has(m.id) &&
            m.roomId === incoming.roomId &&
            m.senderId === incoming.senderId &&
            m.content === incoming.content
          ),
      );
      return [...confirmed, incoming].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }, []);

  // -------------------------------------------------------------------
  // Realtime
  // -------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    let live = false;
    let syncing = false;
    setConnected(false);
    const sync = async () => {
      if (!active || syncing || document.visibilityState === "hidden") return;
      syncing = true;
      try {
        const result = await fetchRoomMessagesAction(roomId);
        if (active && result.success && result.data)
          result.data.forEach((row) =>
            appendMessage(mapRawRow(row as RawChatRow)),
          );
      } catch {
        /* Keep the conversation available while reconnecting. */
      } finally {
        syncing = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void sync();
        void markRoomReadAction(roomId, viewer).catch(() => {});
      }
    };
    const timer = setInterval(() => {
      if (!live) void sync();
    }, 15000);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    void sync();
    let supabase: any;
    try {
      supabase = createClientBrowser();
    } catch {
      // Server-side synchronization remains available if WebSocket setup fails.
    }
    const rt = supabase as any;
    const channel = rt
      ?.channel(`mentorship_chat_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { new: RawChatRow }) => {
          if (!active || !payload?.new || payload.new.room_id !== roomId)
            return;
          appendMessage(mapRawRow(payload.new));
          if (
            document.visibilityState === "visible" &&
            payload.new.sender_id !== currentUserId
          )
            void markRoomReadAction(roomId, viewer).catch(() => {});
        },
      )
      .subscribe((status: string) => {
        if (!active) return;
        live = status === "SUBSCRIBED";
        setConnected(live);
        if (live) void sync();
      });

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
      try {
        if (channel) rt.removeChannel(channel);
      } catch {}
    };
  }, [roomId, appendMessage, currentUserId, viewer]);

  // -------------------------------------------------------------------
  // Marca como lida ao abrir
  // -------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    void (async () => {
      await markRoomReadAction(roomId, viewer).catch(() => {});
      if (active) router.refresh();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, viewer]);

  // -------------------------------------------------------------------
  // Auto scroll
  // -------------------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (nearBottom.current) el.scrollTop = el.scrollHeight;
    else setHasNew(true);
  }, [messages]);

  const formatTime = useCallback(
    (value: string) =>
      new Date(value).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  const formatDay = useCallback(
    (value: Date) => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (isSameDay(value, today)) return t("today");
      if (isSameDay(value, yesterday)) return t("yesterday");
      return value.toLocaleDateString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    },
    [locale, t],
  );

  const ordered = useMemo(
    () =>
      messages
        .slice()
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [messages],
  );

  async function handleSend() {
    const content = draft.trim();
    if (!content || sendLock.current || content.length > 4000) return;
    sendLock.current = true;
    const sendingRoom = roomId;
    setErrorMsg(null);
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessageItem = {
      id: tempId,
      roomId,
      senderId: currentUserId,
      senderType: viewer,
      content,
      createdAt: new Date().toISOString(),
    };
    pendingRef.current.add(tempId);
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    nearBottom.current = true;
    setEmojiOpen(false);

    try {
      const result = await sendChatMessageAction({ room_id: roomId, content });
      if (activeRoom.current !== sendingRoom) return;
      if (result?.success && result.data) {
        const saved = mapRawRow(result.data as unknown as RawChatRow);
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          if (withoutTemp.some((m) => m.id === saved.id)) return withoutTemp;
          return [...withoutTemp, saved];
        });
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setDraft(content);
        setErrorMsg(result?.message ?? t("sendError"));
      }
    } catch (e: any) {
      if (activeRoom.current !== sendingRoom) return;
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
      setErrorMsg(e?.message ?? t("sendError"));
    } finally {
      pendingRef.current.delete(tempId);
      sendLock.current = false;
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className={cn("mentor-chat flex flex-col h-full min-h-0", className)}>
      {/* Header */}
      <div className="mentor-chat-header flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Avatar
          src={counterpartAvatarUrl || undefined}
          alt={counterpartName}
          size="sm"
          fallback={counterpartName?.[0]?.toUpperCase() ?? "?"}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text truncate">{counterpartName}</p>
          <p
            className="mt-1 flex items-center gap-2 text-[11px] text-text-secondary"
            role="status"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                connected ? "bg-emerald-400" : "bg-amber-300",
              )}
            />
            {connected
              ? en
                ? "Real-time connection"
                : "Conexão em tempo real"
              : en
                ? "Reconnecting · automatic sync"
                : "Reconectando · sincronização automática"}
          </p>
        </div>
      </div>

      {/* Mensagens */}
      <div
        ref={scrollRef}
        role="log"
        aria-label={en ? "Conversation messages" : "Mensagens da conversa"}
        aria-live="polite"
        aria-relevant="additions"
        onScroll={() => {
          const el = scrollRef.current;
          if (el) {
            nearBottom.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            if (nearBottom.current) setHasNew(false);
          }
        }}
        className="mentor-chat-messages flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
      >
        {ordered.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-xs text-center">
              <MessageCircle
                size={28}
                className="mx-auto mb-4 text-primary/70"
              />
              <p className="text-sm text-text-secondary text-center">
                {t("empty")}
              </p>
              <p className="mt-3 text-xs text-text-secondary/60">
                {en
                  ? "Ask questions, share progress and keep your coach close."
                  : "Tire dúvidas, compartilhe avanços e mantenha sua treinadora por perto."}
              </p>
            </div>
          </div>
        ) : (
          ordered.map((message, index) => {
            const previous = index > 0 ? ordered[index - 1] : null;
            const showDay =
              !previous ||
              !isSameDay(
                new Date(previous.createdAt),
                new Date(message.createdAt),
              );
            const mine = message.senderId === currentUserId;
            const pending = pendingRef.current.has(message.id);

            return (
              <div key={message.id}>
                {showDay && (
                  <div className="flex items-center gap-3 py-2">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11px] uppercase tracking-wide text-text-secondary">
                      {formatDay(new Date(message.createdAt))}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "mentor-bubble max-w-[85%] rounded-2xl px-4 py-3 space-y-1",
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-surface-secondary text-text rounded-bl-sm",
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] flex items-center gap-1",
                        mine
                          ? "text-primary-foreground/70"
                          : "text-text-secondary",
                      )}
                    >
                      {formatTime(message.createdAt)}
                      {pending && (
                        <Loader2 size={10} className="animate-spin" />
                      )}
                      {mine && !pending && (
                        <Check size={12} aria-label={en ? "Sent" : "Enviada"} />
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {hasNew && (
        <button
          type="button"
          onClick={() => {
            const el = scrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
            nearBottom.current = true;
            setHasNew(false);
          }}
          className="mx-auto my-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface px-4 py-2 text-xs text-primary"
        >
          {en ? "Latest messages" : "Últimas mensagens"}
          <ArrowDown size={13} />
        </button>
      )}

      {/* Composer */}
      <div className="mentor-composer p-4 border-t border-border space-y-2 shrink-0">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-text/25 bg-text/[0.08] p-2.5 text-xs text-text"
          >
            {errorMsg}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div
            className="relative"
            ref={emojiRef}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEmojiOpen(false);
                inputRef.current?.focus();
              }
            }}
          >
            <button
              type="button"
              aria-expanded={emojiOpen}
              aria-label={en ? "Choose emoji" : "Escolher emoji"}
              disabled={sending}
              onClick={() => setEmojiOpen(!emojiOpen)}
              className="grid h-11 w-10 place-items-center rounded-xl text-text-secondary transition hover:bg-primary/10 hover:text-primary"
            >
              <Smile size={21} />
            </button>
            {emojiOpen && (
              <div
                role="group"
                aria-label={en ? "Emojis" : "Emojis"}
                className="mentor-emoji-picker"
              >
                {[
                  "😀",
                  "😊",
                  "😍",
                  "💪",
                  "🔥",
                  "👏",
                  "🙌",
                  "❤️",
                  "✅",
                  "🎯",
                  "🏋️",
                  "🏃",
                  "🥗",
                  "💧",
                  "🎉",
                  "🙏",
                  "👍",
                  "🤔",
                  "😅",
                  "🚀",
                  "⭐",
                  "🫶",
                  "😎",
                  "💬",
                ].map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    aria-label={emoji}
                    onClick={() => {
                      const el = inputRef.current;
                      const start = el?.selectionStart ?? draft.length;
                      const end = el?.selectionEnd ?? draft.length;
                      const next =
                        draft.slice(0, start) + emoji + draft.slice(end);
                      if (next.length <= 4000) {
                        setDraft(next);
                        requestAnimationFrame(() => {
                          el?.focus();
                          el?.setSelectionRange(
                            start + emoji.length,
                            start + emoji.length,
                          );
                        });
                      }
                    }}
                    className="grid h-10 w-10 place-items-center rounded-lg text-xl hover:bg-primary/10"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Textarea
            ref={inputRef}
            aria-label={t("placeholder")}
            maxLength={4000}
            disabled={sending}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={t("placeholder")}
            className="flex-1 resize-none"
          />
          <Button
            variant="primary"
            onClick={() => void handleSend()}
            disabled={
              sending || draft.trim().length === 0 || draft.length > 4000
            }
            aria-label={t("send")}
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <SendHorizonal size={16} />
            )}
          </Button>
        </div>
        <p className="flex justify-between text-[10px] text-text-secondary/60">
          <span>
            {en
              ? "Enter sends · Shift + Enter adds a line"
              : "Enter envia · Shift + Enter pula linha"}
          </span>
          <span>{draft.length}/4000</span>
        </p>
      </div>
    </div>
  );
}

export default MentorChat;
