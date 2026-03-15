/**
 * Loom — RenderLoop
 *
 * Centralized requestAnimationFrame dispatcher.
 * One global rAF loop, callbacks sorted by layer for deterministic order.
 *
 * ```ts
 * const unsub = renderLoop.add(10, (dt, t) => { ... });
 * // later:
 * unsub();   // or this.track(renderLoop.add(...))
 * ```
 */

interface FrameCallback {
  layer: number;
  fn: (dt: number, t: number) => void;
}

class RenderLoop {
  private sorted: FrameCallback[] = [];
  private running = false;
  private prevTime = 0;
  private rafId = 0;

  /**
   * Register a frame callback at the given layer.
   * Lower layers execute first. Returns an unsubscribe function.
   * Uses binary insertion to maintain sort order without re-sorting.
   */
  add(layer: number, fn: (dt: number, t: number) => void): () => void {
    const entry: FrameCallback = { layer, fn };
    // Binary insert to maintain sorted order
    let lo = 0, hi = this.sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sorted[mid].layer <= layer) lo = mid + 1;
      else hi = mid;
    }
    this.sorted.splice(lo, 0, entry);
    return () => {
      const idx = this.sorted.indexOf(entry);
      if (idx >= 0) this.sorted.splice(idx, 1);
    };
  }

  /** Number of active callbacks */
  get size(): number {
    return this.sorted.length;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.prevTime = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    // Compute delta (0 on first frame)
    const dt = this.prevTime ? (timestamp - this.prevTime) / 1000 : 0;
    this.prevTime = timestamp;

    // Snapshot the array — mid-tick unsubscribe via splice won't skip callbacks
    const sorted = this.sorted;
    const len = sorted.length;
    for (let i = 0; i < len; i++) {
      // Guard: callback may have been spliced out by an earlier callback's unsubscribe
      if (i < sorted.length && sorted[i]) {
        sorted[i].fn(dt, timestamp);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

/** Module-level singleton — used by @animationFrame */
export const renderLoop = new RenderLoop();
export type { RenderLoop };
