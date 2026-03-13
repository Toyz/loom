/**
 * Loom — EventBus (type-discriminated)
 *
 * Events are classes. The class constructor IS the channel key.
 * No string registry, full type inference.
 *
 * Features:
 * - on()      — persistent subscription
 * - once()    — fire-and-forget (auto-unsubs after first fire)
 * - waitFor() — promise-based (resolves on next event, optional timeout)
 * - emit()    — dispatches to handlers + walks prototype chain (inheritance)
 *               respects event.cancelled to stop propagation
 */

import type { LoomEvent } from "./event";

export type Constructor<T = any> = new (...args: any[]) => T;
export type Handler<T> = (data: T) => void;

export class EventBus {
  private listeners = new Map<Constructor, Set<Handler<any>>>();

  /**
   * Frame-scoped dedup cache — cleared after the current synchronous flush drains.
   * Only populated when an event returns a non-undefined dedupeKey.
   */
  private _seen: Set<string> | null = null;

  /** Subscribe to a typed event. Returns unsubscribe function. */
  on<T>(type: Constructor<T>, handler: Handler<T>): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    const set = this.listeners.get(type)!;
    set.add(handler);
    return () => set.delete(handler);
  }

  /** Subscribe for a single event — auto-unsubscribes after first fire. */
  once<T>(type: Constructor<T>, handler: Handler<T>): () => void {
    const unsub = this.on(type, (data) => { unsub(); handler(data); });
    return unsub;
  }

  /**
   * Wait for the next event of the given type. Returns a promise.
   * Optional timeout in ms — rejects if exceeded.
   */
  waitFor<T>(type: Constructor<T>, opts?: { timeout?: number }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const unsub = this.once(type, (data) => {
        if (timer) clearTimeout(timer);
        resolve(data);
      });
      if (opts?.timeout) {
        timer = setTimeout(() => {
          unsub();
          reject(new Error(`waitFor(${type.name}) timed out after ${opts.timeout}ms`));
        }, opts.timeout);
      }
    });
  }

  /**
   * Emit a typed event — dispatches to all handlers of that class,
   * then walks the prototype chain to dispatch to parent event handlers.
   * Respects event.cancelled — stops both handler iteration and parent walk.
   *
   * Frame-scoped dedup: if event.dedupeKey is non-undefined, only the first
   * emission with that key per synchronous flush reaches handlers.
   */
  emit<T extends LoomEvent>(event: T): void {
    // Frame-scoped dedup — opt-in via dedupeKey on the event
    const key = event.dedupeKey;
    if (key !== undefined) {
      if (!this._seen) {
        this._seen = new Set();
        // Clear after the current synchronous flush drains
        queueMicrotask(() => { this._seen = null; });
      }
      if (this._seen.has(key)) return;
      this._seen.add(key);
    }

    let ctor: Constructor | null = (event as object).constructor as Constructor;
    while (ctor && ctor !== Object) {
      const handlers = this.listeners.get(ctor);
      if (handlers) {
        for (const h of handlers) {
          h(event);
          if (event.cancelled) return;
        }
      }
      ctor = Object.getPrototypeOf(ctor.prototype)?.constructor ?? null;
    }
  }

  /** Remove a specific handler */
  off<T>(type: Constructor<T>, handler: Handler<T>): void {
    this.listeners.get(type)?.delete(handler);
  }

  /** Remove all listeners for a given event type */
  clear<T>(type: Constructor<T>): void {
    this.listeners.delete(type);
  }

  /** Remove ALL listeners */
  reset(): void {
    this.listeners.clear();
  }
}

/** Module-level default bus — used by LoomElement and available via import */
export let bus = new EventBus();

/** Swap the global bus (for test isolation) */
export function useBus(b: EventBus): void {
  bus = b;
}
