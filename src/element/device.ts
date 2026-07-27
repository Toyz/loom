/**
 * Loom — device APIs: geolocation, wake lock, and sharing
 *
 * Three small platform APIs that share one problem: each hands back something
 * that has to be released, and none of them is released by the page going
 * away. A `watchPosition` keeps the GPS on, a wake lock keeps the screen
 * awake, and both survive the component that started them.
 *
 * `@permission` already answers whether these are allowed; this is what to do
 * once they are.
 */

import { addConnectHook, hostElement } from "../decorators/symbols.js";
import { createDecorator } from "../decorators/create.js";
import { isVisible, onVisibilityChange } from "../env.js";

// ── Geolocation ──────────────────────────────────────────────────────────────

export interface GeolocationWatchOptions extends PositionOptions {
  /** Called on a position error. Without one, errors are logged. */
  onError?: (error: GeolocationPositionError, host: any) => void;
}

/**
 * Watch the device's position, clearing the watch on disconnect.
 *
 * ```ts
 * @component("near-me")
 * class NearMe extends LoomElement {
 *   @reactive accessor coords: GeolocationCoordinates | null = null;
 *
 *   @geolocation({ enableHighAccuracy: true })
 *   onMove(pos: GeolocationPosition) { this.coords = pos.coords; }
 * }
 * ```
 *
 * `watchPosition` returns an id that has to be passed to `clearWatch`.
 * Nothing does that for you, so a component that starts a high-accuracy watch
 * and navigates away leaves the GPS running -- which on a phone is a battery
 * cost the user cannot see the cause of.
 */
export const geolocation = createDecorator<[opts?: GeolocationWatchOptions]>(
  (method, _key, opts = {}) => {
    return (el: any) => {
      const geo = (navigator as { geolocation?: Geolocation }).geolocation;
      if (!geo) {
        console.warn("[loom] @geolocation: unavailable");
        return () => {};
      }
      const id = geo.watchPosition(
        (pos) => method.call(el, pos),
        (err) => {
          if (opts.onError) opts.onError(err, el);
          else console.error("[loom] @geolocation", err.message);
        },
        opts,
      );
      return () => geo.clearWatch(id);
    };
  },
);

// ── Wake Lock ────────────────────────────────────────────────────────────────

interface WakeLockSentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: string, fn: () => void): void;
}

/**
 * Hold a screen wake lock while the component is connected.
 *
 * ```ts
 * @component("recipe-steps")
 * @wakeLock
 * class RecipeSteps extends LoomElement {}
 * ```
 *
 * The browser drops the lock whenever the page is hidden and will not restore
 * it, so it is re-acquired on return -- without that, a wake lock survives
 * exactly one tab switch, which looks like the feature working until someone
 * checks their phone mid-recipe.
 */
export function wakeLock(ctor: Function): void {
  const proto = ctor.prototype as { connectedCallback?: () => void };
  const original = proto.connectedCallback;

  proto.connectedCallback = function (this: HTMLElement) {
    original?.call(this);

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      if (released || sentinel || !isVisible()) return;
      const wl = (navigator as { wakeLock?: { request(type: string): Promise<WakeLockSentinel> } }).wakeLock;
      if (!wl) return;
      try {
        sentinel = await wl.request("screen");
        // A released lock has to be re-requested; the sentinel is spent.
        sentinel.addEventListener("release", () => { sentinel = null; });
      } catch {
        // Denied, or the document was not visible by the time it resolved.
      }
    };

    void acquire();
    const offVisibility = onVisibilityChange((visible) => {
      if (visible) void acquire();
    });

    (this as unknown as { track?: (fn: () => void) => void }).track?.(() => {
      released = true;
      offVisibility();
      void sentinel?.release().catch(() => {});
      sentinel = null;
    });
  };
}

// ── Web Share ────────────────────────────────────────────────────────────────

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

/** True when the browser can share, optionally for this specific payload. */
export function canShare(data?: ShareData): boolean {
  const nav = navigator as { share?: unknown; canShare?: (d: ShareData) => boolean };
  if (typeof nav.share !== "function") return false;
  if (data && typeof nav.canShare === "function") {
    try { return nav.canShare(data); } catch { return false; }
  }
  return true;
}

/**
 * Open the native share sheet.
 *
 * Resolves true if the sheet was shown and the user shared, false if they
 * dismissed it or sharing is unavailable. The distinction matters because a
 * dismissal rejects with `AbortError`, which is a normal outcome and not
 * something to report as a failure.
 */
export async function share(data: ShareData): Promise<boolean> {
  if (!canShare(data)) return false;
  try {
    await (navigator as unknown as { share(d: ShareData): Promise<void> }).share(data);
    return true;
  } catch (e) {
    // The user closing the sheet is not an error worth surfacing.
    if ((e as { name?: string })?.name === "AbortError") return false;
    throw e;
  }
}
