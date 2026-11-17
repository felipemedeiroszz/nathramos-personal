"use client";

import { useMemo, useState, useTransition, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import {
  MentorChat,
  mapRawRow,
  type ChatMessageItem,
  type RawChatRow,
} from "@/components/mentoring/MentorChat";
import {
  fetchRoomMessagesAction,
  manageMentorshipConversationAction,
} from "@/app/actions/mentoring";
import type { MentorshipRoomListItem } from "@/services/MentorshipService";
import { cn } from "@/lib/utils";

interface AdminMentoriaClientProps {
  canDelete?: boolean;
  currentUserId: string;
  rooms: MentorshipRoomListItem[];
  initialRoomId: string | null;
  initialMessages: ChatMessageItem[];
}

export function AdminMentoriaClient({
  canDelete = false,
  currentUserId,
  rooms,
  initialRoomId,
  initialMessages,
}: AdminMentoriaClientProps) {
  const t = useTranslations("adminMentoring");
  const tChat = useTranslations("mentoring");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const en = locale === "en-US";
  const router = useRouter();
  const [folder, setFolder] = useState("active");
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const selection = useRef(0);
  const visibleRooms = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        is_active: changes[room.id] ?? room.is_active,
      })),
    [rooms, changes],
  );
  const [, startTransition] = useTransition();

  const [activeRoomId, setActiveRoomId] = useState<string | null>(
    initialRoomId,
  );
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");

  const activeRoom = useMemo(
    () => visibleRooms.find((r) => r.id === activeRoomId) ?? null,
    [visibleRooms, activeRoomId],
  );

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visibleRooms
      .filter((r) => (folder === "archived" ? !r.is_active : r.is_active))
      .filter(
        (r) =>
          !term ||
          r.student_name.toLowerCase().includes(term) ||
          (r.student_email ?? "").toLowerCase().includes(term),
      );
  }, [visibleRooms, search, folder]);

  function selectRoom(roomId: string) {
    if (roomId === activeRoomId) return;
    const request = ++selection.current;
    setDeleting(false);
    setNotice(null);
    setActiveRoomId(roomId);
    setMessages([]);
    setLoadingMessages(true);
    startTransition(async () => {
      try {
        const result = await fetchRoomMessagesAction(roomId);
        if (request !== selection.current) return;
        const rows = (result?.data ?? []) as unknown as RawChatRow[];
        setMessages(rows.map(mapRawRow));
      } finally {
        if (request === selection.current) setLoadingMessages(false);
      }
    });
  }

  async function manage(operation: "archive" | "reopen" | "delete") {
    if (!activeRoomId || busy) return;
    const roomId = activeRoomId;
    setBusy(true);
    setNotice(null);
    try {
      const result = await manageMentorshipConversationAction(
        roomId,
        operation,
      );
      if (!result.success) {
        setNotice(result.message);
        return;
      }
      ++selection.current;
      setChanges((previous) => ({
        ...previous,
        [roomId]: operation === "reopen",
      }));
      setActiveRoomId(null);
      setMessages([]);
      setDeleting(false);
      setLoadingMessages(false);
      setFolder(operation === "reopen" ? "active" : "archived");
      setNotice(
        operation === "delete"
          ? en
            ? "History removed for both participants. Reopen to start an empty conversation."
            : "Histórico removido para os dois participantes. Reabra para iniciar uma conversa vazia."
          : en
            ? "Conversation updated."
            : "Conversa atualizada.",
      );
      window.dispatchEvent(new Event("mentoring:unread-changed"));
      router.refresh();
    } catch {
      setNotice(
        en
          ? "Unable to update the conversation."
          : "Não foi possível atualizar a conversa.",
      );
    } finally {
      setBusy(false);
    }
  }

  function formatPreviewTime(value: string | null) {
    if (!value) return "";
    return new Date(value).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
    });
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-border bg-surface p-3 text-sm"
        >
          {notice}
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* Lista de conversas */}
        <Card
          className={cn(
            "p-0 overflow-hidden",
            activeRoomId && "hidden lg:block",
          )}
        >
          <div className="grid grid-cols-2 gap-2 border-b border-border p-3">
            {["active", "archived"].map((value) => (
              <button
                type="button"
                key={value}
                disabled={busy}
                aria-pressed={folder === value}
                className={cn(
                  "min-h-11 rounded-lg text-xs",
                  folder === value
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-white/5",
                )}
                onClick={() => {
                  ++selection.current;
                  setFolder(value);
                  setActiveRoomId(null);
                  setLoadingMessages(false);
                  setDeleting(false);
                }}
              >
                {value === "active"
                  ? en
                    ? "Conversations"
                    : "Conversas"
                  : en
                    ? "Archived"
                    : "Arquivadas"}{" "}
                ·{" "}
                {
                  visibleRooms.filter((room) =>
                    value === "active" ? room.is_active : !room.is_active,
                  ).length
                }
              </button>
            ))}
          </div>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <Input
                className="pl-9"
                placeholder={t("searchRooms")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
            {filteredRooms.length === 0 ? (
              <p className="p-6 text-sm text-text-secondary text-center">
                {rooms.length === 0 ? t("noRooms") : t("noRoomsFound")}
              </p>
            ) : (
              filteredRooms.map((room) => {
                const isActive = room.id === activeRoomId;
                return (
                  <button
                    key={room.id}
                    type="button"
                    disabled={busy}
                    onClick={() => selectRoom(room.id)}
                    className={cn(
                      "w-full text-left p-3 flex items-start gap-3 transition-colors",
                      isActive
                        ? "bg-primary/10"
                        : "hover:bg-surface-secondary/60",
                    )}
                  >
                    <Avatar
                      src={room.student_avatar_url || undefined}
                      alt={room.student_name}
                      size="sm"
                      fallback={room.student_name?.[0]?.toUpperCase() ?? "?"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text truncate">
                          {room.student_name}
                        </p>
                        <span className="text-[10px] text-text-secondary shrink-0">
                          {formatPreviewTime(room.last_message_at)}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary truncate">
                        {room.last_message_preview ?? tChat("noMessagesYet")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {!room.is_active && (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px]"
                          >
                            {en ? "Archived" : "Arquivada"}
                          </Badge>
                        )}
                        {room.unread_count_coach > 0 && (
                          <Badge
                            variant="error"
                            className="h-5 px-1.5 text-[10px]"
                          >
                            {room.unread_count_coach}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Chat */}
        <Card
          className={cn(
            "p-0 overflow-hidden",
            !activeRoomId && "hidden lg:block",
          )}
        >
          {activeRoomId && activeRoom ? (
            <div className="flex flex-col h-[600px]">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setActiveRoomId(null)}
                >
                  {tCommon("back")}
                </Button>
                <Button variant="ghost" size="sm" asChild className="ml-auto">
                  <Link href={`/${locale}/admin/alunos/${activeRoom.user_id}`}>
                    <Users size={14} className="mr-1.5" />
                    {t("openStudent")}
                  </Link>
                </Button>
              </div>
              <p className="px-4 pt-2 text-xs text-text-secondary">
                {en
                  ? "Archiving preserves history and pauses messaging until reopened."
                  : "Arquivar preserva o histórico e pausa o envio até a conversa ser reaberta."}
              </p>
              <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void manage(activeRoom.is_active ? "archive" : "reopen")
                  }
                >
                  {busy
                    ? en
                      ? "Saving…"
                      : "Salvando…"
                    : activeRoom.is_active
                      ? en
                        ? "Archive conversation"
                        : "Arquivar conversa"
                      : en
                        ? "Reopen conversation"
                        : "Reabrir conversa"}
                </Button>
                {canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    className="text-rose-400"
                    onClick={() => setDeleting(true)}
                  >
                    {en ? "Delete history" : "Excluir conversa"}
                  </Button>
                )}
              </div>
              {deleting && (
                <div
                  role="alertdialog"
                  aria-label={en ? "Delete conversation" : "Excluir conversa"}
                  aria-describedby="delete-conversation-description"
                  className="space-y-3 border-b border-rose-400/20 bg-rose-400/5 p-4"
                >
                  <p id="delete-conversation-description" className="text-sm">
                    {en
                      ? "The history will be removed from both panels and sending will be paused. Reopening starts an empty conversation. This action cannot be undone in the app."
                      : "O histórico deixará de aparecer nos dois painéis e o envio ficará pausado. Ao reabrir, a conversa estará vazia. Esta ação não pode ser desfeita pelo app."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void manage("delete")}
                    >
                      {en ? "Confirm deletion" : "Confirmar exclusão"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setDeleting(false)}
                    >
                      {en ? "Cancel" : "Cancelar"}
                    </Button>
                  </div>
                </div>
              )}
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 size={22} className="animate-spin text-primary" />
                </div>
              ) : (
                <MentorChat
                  key={`${activeRoomId}:${activeRoom.is_active}`}
                  readOnly={!activeRoom.is_active}
                  className="flex-1 min-h-0"
                  roomId={activeRoomId}
                  viewer="coach"
                  currentUserId={currentUserId}
                  counterpartName={activeRoom.student_name}
                  counterpartAvatarUrl={activeRoom.student_avatar_url}
                  initialMessages={messages}
                />
              )}
            </div>
          ) : (
            <div className="h-[600px] flex items-center justify-center">
              <EmptyState
                className="py-12"
                icon={
                  <MessageSquare size={36} className="text-text-secondary" />
                }
                title={t("selectConversation")}
                description={t("selectConversationDesc")}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default AdminMentoriaClient;
