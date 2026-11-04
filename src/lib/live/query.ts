export interface LiveQueryOptions<T> {
  load: (signal: AbortSignal) => Promise<T>;
  success: (value: T) => void;
  failure: (error: unknown) => void;
  settled?: () => void;
}
/** Serialize invalidations; never let an older response replace a newer snapshot. */
export function createLiveQuery<T>(options: LiveQueryOptions<T>) {
  let active = true,
    running = false,
    requested = false;
  let controller: AbortController | null = null;
  const run = async () => {
    if (!active || running) return;
    running = true;
    try {
      do {
        requested = false;
        controller = new AbortController();
        try {
          const value = await options.load(controller.signal);
          if (active && !requested) options.success(value);
        } catch (error) {
          if (active && !requested && !controller.signal.aborted)
            options.failure(error);
        }
      } while (active && requested);
    } finally {
      running = false;
      if (active) options.settled?.();
    }
  };
  return {
    request() {
      if (active) {
        requested = true;
        void run();
      }
    },
    destroy() {
      active = false;
      requested = false;
      controller?.abort();
    },
  };
}
