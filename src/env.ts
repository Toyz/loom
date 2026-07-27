/**
 * Loom — environment state: page visibility and network reachability
 *
 * Two things every non-trivial app ends up caring about, and two things that
 * are easy to wire wrongly. `document.hidden` and `navigator.onLine` are
 * cheap to read but only useful alongside their events, and a component that
 * adds its own listener has to remember to remove it -- so the usual outcome
 * is one listener per component, leaked on disconnect.
 *
 * There is a single listener for each here, shared by every subscriber and
 * only attached while somebody is listening.
 *
 * `app.start()` already wires `visibilitychange` to drive service
 * suspend/resume. That is app-level lifecycle for services; this is the same
 * signal made readable by components and by the query layer, which had no
 * awareness of it at all -- a background tab happily kept revalidating.
 */

/** A subscriber list that attaches its DOM listener only while non-empty. */
function makeSignal<T>(read: () => T, attach: (fire: () => void) => (() => void) | null) {
  const subs = new Set<(value: T) => void>();
  let detach: (() => void) | null = null;
  let current: T | undefined;

  const fire = () => {
    const next = read();
    if (next === current) return;
    current = next;
    for (const s of subs) {
      try {
        s(next);
      } catch (e) {
        console.error("[loom] environment subscriber failed", e);
      }
    }
  };

  return {
    get(): T {
      return read();
    },
    subscribe(fn: (value: T) => void): () => void {
      if (subs.size === 0) {
        current = read();
        detach = attach(fire);
      }
      subs.add(fn);
      return () => {
        subs.delete(fn);
        if (subs.size === 0) {
          detach?.();
          detach = null;
        }
      };
    },
  };
}

// ── Page visibility ──────────────────────────────────────────────────────────

const visibility = makeSignal(
  () => (typeof document === "undefined" ? true : !document.hidden),
  (fire) => {
    if (typeof document === "undefined") return null;
    document.addEventListener("visibilitychange", fire);
    return () => document.removeEventListener("visibilitychange", fire);
  },
);

/** Whether the page is currently visible. True where there is no document. */
export const isVisible = (): boolean => visibility.get();

/** Subscribe to visibility changes. Returns an unsubscribe function. */
export const onVisibilityChange = (fn: (visible: boolean) => void): (() => void) =>
  visibility.subscribe(fn);

// ── Network ──────────────────────────────────────────────────────────────────

const online = makeSignal(
  () => (typeof navigator === "undefined" ? true : navigator.onLine !== false),
  (fire) => {
    if (typeof window === "undefined") return null;
    window.addEventListener("online", fire);
    window.addEventListener("offline", fire);
    return () => {
      window.removeEventListener("online", fire);
      window.removeEventListener("offline", fire);
    };
  },
);

/**
 * Whether the browser believes it has a network connection.
 *
 * `navigator.onLine` is famously optimistic -- it reports true for a machine
 * on a network that cannot reach anything. False is reliable, true is a hint,
 * which is why this is useful for backing off retries and not for deciding
 * that a request will succeed.
 */
export const isOnline = (): boolean => online.get();

/** Subscribe to online/offline changes. Returns an unsubscribe function. */
export const onOnlineChange = (fn: (online: boolean) => void): (() => void) =>
  online.subscribe(fn);
