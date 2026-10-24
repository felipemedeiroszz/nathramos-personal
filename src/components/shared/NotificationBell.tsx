"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  getMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import type { NotificationRow } from "@/services/NotificationService";

interface NotificationBellProps {
  locale: string;
  /** Namespace de tradução usado pelo sino ("adminNotifications" | "studentNotifications"). */
  namespace?: string;
  /** Destino do link "Ver todas". */
  viewAllHref?: string;
}

export function NotificationBell({
  locale,
  namespace = "adminNotifications",
  viewAllHref,
}: NotificationBellProps) {
  const t = useTranslations(namespace);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const result = await getMyNotificationsAction();
      setItems(result.items);
      setUnread(result.unread);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "notification:received") load();
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleOpenItem = async (item: NotificationRow) => {
    setOpen(false);
    if (!item.read_at) {
      const readAt = new Date().toISOString();
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, read_at: readAt } : row))
      );
      setUnread((prev) => Math.max(0, prev - 1));
      await markNotificationReadAction(item.id);
    }
    if (item.url) router.push(item.url);
  };

  const handleMarkAll = async () => {
    const readAt = new Date().toISOString();
    setItems((prev) => prev.map((row) => ({ ...row, read_at: row.read_at ?? readAt })));
    setUnread(0);
    await markAllNotificationsReadAction();
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(locale === "en-US" ? "en-US" : "pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={t("bell.title")}
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-9 items-center justify-center rounded-xl px-3 text-text transition-colors hover:bg-surface-secondary/50"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-text">{t("bell.title")}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-primary"
              >
                <CheckCheck size={14} />
                {t("bell.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-text-secondary">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell size={28} className="text-text-secondary" />
                <p className="text-sm text-text-secondary">{t("bell.empty")}</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenItem(item)}
                  className="flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    {!item.read_at && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <span className="truncate text-sm font-medium text-text">
                      {item.title}
                    </span>
                  </div>
                  <span className="line-clamp-2 text-xs text-text-secondary">{item.body}</span>
                  <span className="text-[11px] text-text-secondary/70">
                    {formatDate(item.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>

          <Link
            href={viewAllHref ?? `/${locale}/admin/notificacoes`}
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-3 text-center text-sm font-medium text-primary transition-colors hover:bg-surface-secondary/50"
          >
            {t("bell.viewAll")}
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
