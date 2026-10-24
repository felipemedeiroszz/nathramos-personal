"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClientBrowser } from "@/lib/supabase/client";
import {
  getNotificationInboxAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import type { NotificationRow } from "@/services/NotificationService";
import { cn } from "@/lib/utils";

interface NotificationsCenterClientProps {
  locale: string;
  userId: string;
  initialItems: NotificationRow[];
}

export function NotificationsCenterClient({
  locale,
  userId,
  initialItems,
}: NotificationsCenterClientProps) {
  const t = useTranslations("studentNotifications");
  const localeTag = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>(initialItems);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getNotificationInboxAction(100);
      setItems(result.items as NotificationRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Realtime: novas notificações chegam sem recarregar a página.
  useEffect(() => {
    let supabase: ReturnType<typeof createClientBrowser>;
    try {
      supabase = createClientBrowser();
    } catch {
      return;
    }
    const channel = (supabase as any)
      .channel(`student_notifications_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void reload();
        }
      )
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {
        /* noop */
      }
    };
  }, [userId, reload]);

  const unread = items.filter((item) => !item.read_at).length;

  const handleOpen = async (item: NotificationRow) => {
    if (!item.read_at) {
      const readAt = new Date().toISOString();
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, read_at: readAt } : row))
      );
      await markNotificationReadAction(item.id);
    }
    if (item.url) {
      router.push(item.url.startsWith("/") ? item.url : `/${locale}/${item.url}`);
    }
  };

  const handleMarkAll = async () => {
    const readAt = new Date().toISOString();
    setItems((prev) => prev.map((row) => ({ ...row, read_at: row.read_at ?? readAt })));
    await markAllNotificationsReadAction();
    router.refresh();
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(localeTag, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Bell size={28} className="text-text-secondary" />}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {unread > 0 ? t("unreadCount", { count: unread }) : t("allRead")}
        </p>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAll} disabled={loading}>
            <CheckCheck size={16} className="mr-2" />
            {t("markAllRead")}
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleOpen(item)}
            className={cn(
              "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-surface-secondary/50",
              !item.read_at && "bg-primary/5"
            )}
          >
            <div className="flex items-center gap-2">
              {!item.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
              <span className="flex-1 truncate text-sm font-semibold text-text">
                {item.title}
              </span>
              <span className="shrink-0 text-[11px] text-text-secondary/70">
                {formatDate(item.created_at)}
              </span>
            </div>
            <span className="text-sm text-text-secondary">{item.body}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-2 text-text-secondary">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
    </div>
  );
}

export default NotificationsCenterClient;
