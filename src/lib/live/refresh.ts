export interface RefreshEnvironment {
  refresh: () => void;
  blocked: () => boolean;
  now: () => number;
  setTimer: (callback: () => void, milliseconds: number) => unknown;
  clearTimer: (timer: unknown) => void;
}

/** Coalesce bursts and retain invalidations while the user is editing or offline. */
export function createRefreshScheduler(env: RefreshEnvironment) {
  let requested = false, disposed = false, timer: unknown = null, lastRefresh = -Infinity;
  const flush = () => {
    if (disposed || !requested || env.blocked()) return;
    const wait = Math.max(0, 1000 - (env.now() - lastRefresh));
    if (wait > 0) {
      if (timer === null) timer = env.setTimer(() => { timer = null; flush(); }, wait);
      return;
    }
    if (timer !== null) { env.clearTimer(timer); timer = null; }
    requested = false;
    lastRefresh = env.now();
    env.refresh();
  };
  return {
    request() {
      if (disposed) return;
      requested = true;
      if (timer === null) timer = env.setTimer(() => { timer = null; flush(); }, 200);
    },
    resume() {
      if (requested && !disposed && timer === null) timer = env.setTimer(() => { timer = null; flush(); }, 200);
    },
    destroy() {
      disposed = true;
      if (timer !== null) env.clearTimer(timer);
      requested = false; timer = null;
    },
  };
}
