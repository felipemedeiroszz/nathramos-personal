"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
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
import { fetchRoomMessagesAction } from "@/app/actions/mentoring";
import type { MentorshipRoomListItem } from "@/services/MentorshipService";
import { cn } from "@/lib/utils";

interface AdminMentoriaClientProps {
  currentUserId: string;
  rooms: MentorshipRoomListItem[];
  initialRoomId: string | null;
  initialMessages: ChatMessageItem[];
}

export function AdminMentoriaClient({
  currentUserId,
  rooms,
  initialRoomId,
  initialMessages,
}: AdminMentoriaClientProps) {
  const t = useTranslations("adminMentoring");
  const tChat = useTranslations("mentoring");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoomId);
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) ?? null,
    [rooms, activeRoomId]
  );

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rooms;
    return rooms.filter(
      (r) =>
        r.student_name.toLowerCase().includes(term) ||
        (r.student_email ?? "").toLowerCase().includes(term)
    );
  }, [rooms, search]);

  function selectRoom(roomId: string) {
    if (roomId === activeRoomId) return;
    setActiveRoomId(roomId);
    setMessages([]);
    setLoadingMessages(true);
    startTransition(async () => {
      try {
        const result = await fetchRoomMessagesAction(roomId);
        const rows = (result?.data ?? []) as unknown as RawChatRow[];
        setMessages(rows.map(mapRawRow));
      } finally {
        setLoadingMessages(false);
      }
    });
  }

  function formatPreviewTime(value: string | null) {
    if (!value) return "";
    return new Date(value).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      {/* Lista de conversas */}
      <Card className={cn("p-0 overflow-hidden", activeRoomId && "hidden lg:block")}>
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
                  onClick={() => selectRoom(room.id)}
                  className={cn(
                    "w-full text-left p-3 flex items-start gap-3 transition-colors",
                    isActive ? "bg-primary/10" : "hover:bg-surface-secondary/60"
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
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          {t("inactive")}
                        </Badge>
                      )}
                      {room.unread_count_coach > 0 && (
                        <Badge variant="error" className="h-5 px-1.5 text-[10px]">
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
      <Card className={cn("p-0 overflow-hidden", !activeRoomId && "hidden lg:block")}>
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
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin text-primary" />
              </div>
            ) : (
              <MentorChat
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
              icon={<MessageSquare size={36} className="text-text-secondary" />}
              title={t("selectConversation")}
              description={t("selectConversationDesc")}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminMentoriaClient;
