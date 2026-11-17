"use client";
import { useSyncExternalStore } from "react";

function createCounter(side: "admin" | "student") {
  let count = 0;
  const listeners = new Set<() => void>();
  let stop: (() => void) | undefined;
  function start() {
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const result = await fetch(`/api/mentoring/unread?side=${side}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        let next = count;
        if (result.ok)
          next = Math.max(0, Number((await result.json()).count) || 0);
        else if ([401, 403].includes(result.status)) next = 0;
        if (active && next !== count) {
          count = next;
          listeners.forEach((listener) => listener());
        }
      } catch {
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(refresh, 15000);
    const events = [
      "focus",
      "online",
      "app:data-refresh",
      "mentoring:unread-changed",
    ];
    events.forEach((event) => window.addEventListener(event, refresh));
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, refresh));
      document.removeEventListener("visibilitychange", refresh);
      count = 0;
    };
  }
  return {
    getSnapshot: () => count,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) stop = start();
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          stop?.();
          stop = undefined;
        }
      };
    },
  };
}
// Desktop, mobile drawer and bottom navigation share one request per panel.
const counters = {
  admin: createCounter("admin"),
  student: createCounter("student"),
};
const serverSnapshot = () => 0;
export function MentorshipUnreadBadge({
  side,
  locale,
}: {
  side: "admin" | "student";
  locale: string;
}) {
  const counter = counters[side];
  const count = useSyncExternalStore(
    counter.subscribe,
    counter.getSnapshot,
    serverSnapshot,
  );
  if (!count) return null;
  return (
    <span
      role="status"
      aria-label={
        locale === "en-US"
          ? `${count} unread messages`
          : `${count} mensagens não lidas`
      }
      className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-yellow-400 px-1.5 text-[10px] font-bold tabular-nums text-black"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
