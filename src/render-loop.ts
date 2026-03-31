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
  /** Lazy removal — O(1) unsub; purged during tick */
  dead?: boolean;
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
      entry.dead = true;
      if (!this.running) this.compactDead();
    };
  }

  /** Drop tombstoned entries — O(n); runs during tick via splice, or immediately when unsubbing while stopped */
  private compactDead(): void {
    let w = 0;
    for (let r = 0; r < this.sorted.length; r++) {
      const e = this.sorted[r]!;
      if (!e.dead) this.sorted[w++] = e;
    }
    this.sorted.length = w;
  }

  /** Number of active callbacks (tombstoned entries waiting for next tick purge are excluded) */
  get size(): number {
    let n = 0;
    for (let i = 0; i < this.sorted.length; i++) {
      if (!this.sorted[i]!.dead) n++;
    }
    return n;
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
    this.compactDead();
  }

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    // Compute delta (0 on first frame)
    const dt = this.prevTime ? (timestamp - this.prevTime) / 1000 : 0;
    this.prevTime = timestamp;

    const sorted = this.sorted;
    for (let i = 0; i < sorted.length; ) {
      const e = sorted[i];
      if (e.dead) {
        sorted.splice(i, 1);
        continue;
      }
      e.fn(dt, timestamp);
      if (e.dead) {
        sorted.splice(i, 1);
        continue;
      }
      i++;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

/** Module-level singleton — used by @animationFrame */
export const renderLoop = new RenderLoop();
export type { RenderLoop };
