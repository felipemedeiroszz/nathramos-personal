"use client";
import { useCallback, useRef, useState } from "react";
/** Keeps the form pending for the complete request and prevents duplicate submits. */
export function useAsyncTransition(): [
  boolean,
  (task: () => unknown | Promise<unknown>) => Promise<void>,
] {
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const start = useCallback(async (task: () => unknown | Promise<unknown>) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    try {
      await task();
    } finally {
      running.current = false;
      setPending(false);
    }
  }, []);
  return [pending, start];
}
