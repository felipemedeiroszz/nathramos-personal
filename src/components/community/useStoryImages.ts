"use client";
import { useEffect, useRef, useState } from "react";
type PhotoStory = { id: string; image_path: string | null; expires_at: string };
export function useStoryImages(stories: PhotoStory[], active: string | null) {
  const pool = useRef(
    new Map<
      string,
      {
        url?: string;
        controller: AbortController;
        error?: boolean;
        expires: number;
      }
    >(),
  );
  const [sources, setSources] = useState<Record<string, string>>({}),
    [errors, setErrors] = useState<Record<string, boolean>>({}),
    [revision, setRevision] = useState(0);
  const position = stories.findIndex((s) => s.id === active);
  const candidates = (
    position >= 0 ? stories.slice(position, position + 3) : stories.slice(0, 3)
  ).filter((s) => s.image_path);
  const key = candidates.map((s) => s.id).join(",");
  const latest = useRef(candidates);
  latest.current = candidates;
  useEffect(() => {
    const desired = new Set(latest.current.map((s) => s.id));
    for (const [id, entry] of pool.current) {
      if (
        entry.expires <= Date.now() ||
        (!desired.has(id) && pool.current.size > 6)
      ) {
        entry.controller.abort();
        if (entry.url) URL.revokeObjectURL(entry.url);
        pool.current.delete(id);
        setSources((previous) => {
          const next = { ...previous };
          delete next[id];
          return next;
        });
      }
    }
    for (const story of latest.current) {
      if (pool.current.has(story.id)) continue;
      const entry: {
        url?: string;
        controller: AbortController;
        error?: boolean;
        expires: number;
      } = {
        controller: new AbortController(),
        expires: Date.parse(story.expires_at),
      };
      pool.current.set(story.id, entry);
      void (async () => {
        let url: string | undefined;
        try {
          const response = await fetch(
            "/api/community/image?story=" +
              story.id +
              "&path=" +
              encodeURIComponent(story.image_path!),
            { cache: "no-store", signal: entry.controller.signal },
          );
          if (
            !response.ok ||
            !response.headers.get("Content-Type")?.startsWith("image/")
          )
            throw Error("Image unavailable");
          url = URL.createObjectURL(await response.blob());
          const image = new Image();
          image.src = url;
          await image.decode();
          if (
            entry.controller.signal.aborted ||
            pool.current.get(story.id) !== entry
          ) {
            URL.revokeObjectURL(url);
            return;
          }
          entry.url = url;
          setSources((previous) => ({ ...previous, [story.id]: url! }));
        } catch {
          if (url) URL.revokeObjectURL(url);
          if (!entry.controller.signal.aborted) {
            entry.error = true;
            setErrors((previous) => ({ ...previous, [story.id]: true }));
          }
        }
      })();
    }
  }, [key, revision]);
  useEffect(() => {
    const entries = pool.current;
    return () => {
      for (const entry of entries.values()) {
        entry.controller.abort();
        if (entry.url) URL.revokeObjectURL(entry.url);
      }
      entries.clear();
    };
  }, []);
  function retry(id: string) {
    const entry = pool.current.get(id);
    entry?.controller.abort();
    if (entry?.url) URL.revokeObjectURL(entry.url);
    pool.current.delete(id);
    setErrors((previous) => ({ ...previous, [id]: false }));
    setRevision((value) => value + 1);
  }
  return { sources, errors, retry };
}
