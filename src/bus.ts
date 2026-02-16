/**
 * Loom — EventBus (type-discriminated)
 *
 * Events are classes. The class constructor IS the channel key.
 * No string registry, full type inference.
 */

import type { LoomEvent } from "./event";

export type Constructor<T = any> = new (...args: any[]) => T;
export type Handler<T> = (data: T) => void;

export class EventBus {
  private listeners = new Map<Constructor, Set<Handler<any>>>();

  /** Subscribe to a typed event. Returns unsubscribe function. */
  on<T>(type: Constructor<T>, handler: Handler<T>): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    const set = this.listeners.get(type)!;
    set.add(handler);
    return () => set.delete(handler);
  }

  /** Emit a typed event — dispatches to all handlers of that class */
  emit<T extends LoomEvent>(event: T): void {
    const ctor = (event as object).constructor as Constructor;
    this.listeners.get(ctor)?.forEach((h) => h(event));
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
