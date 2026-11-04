"use client";

import { useEffect, useRef, useState } from "react";

/** Accept refreshed server values only while the local draft is pristine. */
export function useLiveDraft<T>(source: T) {
  const sourceKey = JSON.stringify(source);
  const [baseline, setBaseline] = useState(sourceKey);
  const [draft, setDraft] = useState(source);
  const previousSource = useRef(sourceKey);
  const draftKey = JSON.stringify(draft);
  useEffect(() => {
    if (previousSource.current === sourceKey) return;
    previousSource.current = sourceKey;
    if (draftKey === sourceKey) setBaseline(sourceKey);
    else if (draftKey === baseline) {
      setDraft(JSON.parse(sourceKey) as T);
      setBaseline(sourceKey);
    }
  }, [sourceKey, draftKey, baseline]);
  const accept = (value: T) => {
    setDraft(value);
    setBaseline(JSON.stringify(value));
  };
  return {
    draft,
    setDraft,
    accept,
    markSaved: (value: T) => setBaseline(JSON.stringify(value)),
    dirty: draftKey !== baseline,
  };
}
