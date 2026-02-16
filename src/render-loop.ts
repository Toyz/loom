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
  private callbacks = new Set<FrameCallback>();
  private sorted: FrameCallback[] = [];
  private dirty = false;
  private running = false;
  private prevTime = 0;
  private rafId = 0;

  /**
   * Register a frame callback at the given layer.
   * Lower layers execute first. Returns an unsubscribe function.
   */
  add(layer: number, fn: (dt: number, t: number) => void): () => void {
    const entry: FrameCallback = { layer, fn };
    this.callbacks.add(entry);
    this.dirty = true;
    return () => {
      this.callbacks.delete(entry);
      this.dirty = true;
    };
  }

  /** Number of active callbacks */
  get size(): number {
    return this.callbacks.size;
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

    // Re-sort if callbacks changed
    if (this.dirty) {
      this.sorted = [...this.callbacks].sort((a, b) => a.layer - b.layer);
      this.dirty = false;
    }

    // Dispatch in layer order
    for (const entry of this.sorted) {
      entry.fn(dt, timestamp);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

/** Module-level singleton — used by @animationFrame */
export const renderLoop = new RenderLoop();
export type { RenderLoop };
