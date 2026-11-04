"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isStudentPanelPath } from "@/lib/live/events";
import { createRefreshScheduler } from "@/lib/live/refresh";

/** Mounted once in the locale layout: public, authentication, student and staff pages. */
export function usePanelRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const schedulerRef = useRef<ReturnType<typeof createRefreshScheduler> | null>(
    null,
  );

  useEffect(() => {
    const student = isStudentPanelPath(pathname);
    const scheduler = createRefreshScheduler({
      refresh: () => {
        startTransition(() => router.refresh());
        window.dispatchEvent(new Event("app:data-refresh"));
      },
      blocked: () =>
        pendingRef.current ||
        document.hidden ||
        !navigator.onLine ||
        Boolean(document.querySelector('[data-live-refresh-pause="true"]')) ||
        (!student &&
          (Boolean(
            document.querySelector(
              '[role="dialog"], [aria-busy="true"], [data-panel-editing="true"], fieldset[disabled], button[type="submit"][disabled]',
            ),
          ) ||
            Boolean(
              document.activeElement?.closest(
                'input, textarea, select, iframe, [contenteditable="true"]',
              ),
            ))),
      now: Date.now,
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (timer) => window.clearTimeout(timer as number),
    });
    schedulerRef.current = scheduler;
    const refresh = () => scheduler.request(),
      resume = () => scheduler.resume();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("app:data-changed", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    document.addEventListener("focusout", resume);
    const observer =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(resume);
    observer?.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "aria-busy",
        "data-panel-editing",
        "data-live-refresh-pause",
        "disabled",
      ],
    });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("app:data-changed", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      document.removeEventListener("focusout", resume);
      observer?.disconnect();
      scheduler.destroy();
      schedulerRef.current = null;
    };
  }, [router, pathname]);
  useEffect(() => {
    if (!pending) schedulerRef.current?.resume();
  }, [pending]);
  return useCallback(() => schedulerRef.current?.request(), []);
}
