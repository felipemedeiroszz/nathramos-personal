"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createLiveQuery } from "@/lib/live/query";
/** A live API snapshot; background updates preserve the last successful view. */
export function useLiveResource<T>(
  scope: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: boolean;
  }>({ data: null, loading: true, error: false });
  const queryRef = useRef<ReturnType<typeof createLiveQuery<T>> | null>(null);
  useEffect(() => {
    setState({ data: null, loading: true, error: false });
    const query = createLiveQuery<T>({
      load,
      success: (data) => setState({ data, loading: false, error: false }),
      failure: () => setState((s) => ({ ...s, error: true })),
      settled: () => setState((s) => ({ ...s, loading: false })),
    });
    queryRef.current = query;
    const refresh = () => query.request();
    window.addEventListener("app:data-refresh", refresh);
    query.request();
    return () => {
      window.removeEventListener("app:data-refresh", refresh);
      query.destroy();
      queryRef.current = null;
    };
  }, [scope, load]);
  return {
    ...state,
    reload: useCallback(() => queryRef.current?.request(), []),
    update: useCallback(
      (fn: (value: T | null) => T | null) =>
        setState((s) => ({ ...s, data: fn(s.data) })),
      [],
    ),
  };
}
