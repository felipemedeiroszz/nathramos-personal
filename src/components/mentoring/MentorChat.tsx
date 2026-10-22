"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, SendHorizonal } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { createClientBrowser } from "@/lib/supabase/client";
import { sendChatMessageAction, markRoomReadAction } from "@/app/actions/mentoring";
import { cn } from "@/lib/utils";

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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const appendMessage = useCallback((incoming: ChatMessageItem) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      return [...prev, incoming].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  // -------------------------------------------------------------------
  // Realtime
  // -------------------------------------------------------------------
  useEffect(() => {
    let supabase: any;
    try {
      supabase = createClientBrowser();
    } catch {
      return;
    }
    const rt = supabase as any;
    const channel = rt
      .channel(`mentorship_chat_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: { new: RawChatRow }) => {
          if (!payload?.new) return;
          appendMessage(mapRawRow(payload.new));
        }
      )
      .subscribe((status: string) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      try {
        rt.removeChannel(channel);
      } catch {}
    };
  }, [roomId, appendMessage]);

  // -------------------------------------------------------------------
  // Marca como lida ao abrir
  // -------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    void (async () => {
      await markRoomReadAction(roomId, viewer);
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
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const formatTime = useCallback(
    (value: string) =>
      new Date(value).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale]
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
    [locale, t]
  );

  const ordered = useMemo(
    () =>
      messages
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;
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

    try {
      const result = await sendChatMessageAction({ room_id: roomId, content });
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
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
      setErrorMsg(e?.message ?? t("sendError"));
    } finally {
      pendingRef.current.delete(tempId);
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Avatar
          src={counterpartAvatarUrl || undefined}
          alt={counterpartName}
          size="sm"
          fallback={counterpartName?.[0]?.toUpperCase() ?? "?"}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text truncate">{counterpartName}</p>
          <p className="text-xs text-text-secondary">
            {connected ? t("live") : t("connecting")}
          </p>
        </div>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {ordered.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-text-secondary text-center">{t("empty")}</p>
          </div>
        ) : (
          ordered.map((message, index) => {
            const previous = index > 0 ? ordered[index - 1] : null;
            const showDay =
              !previous ||
              !isSameDay(new Date(previous.createdAt), new Date(message.createdAt));
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
                <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2 space-y-1",
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-surface-secondary text-text rounded-bl-sm"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={cn(
                        "text-[10px] flex items-center gap-1",
                        mine ? "text-primary-foreground/70" : "text-text-secondary"
                      )}
                    >
                      {formatTime(message.createdAt)}
                      {pending && <Loader2 size={10} className="animate-spin" />}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-border space-y-2 shrink-0">
        {errorMsg && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-400">
            {errorMsg}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
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
            disabled={sending || draft.trim().length === 0}
            aria-label={t("send")}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MentorChat;
