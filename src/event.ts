/**
 * Loom — LoomEvent base class
 *
 * All events extend this. Gives you for free:
 * - timestamp (auto-stamped)
 * - clone(overrides?) — typed shallow clone
 * - is(event) — static type guard
 * - dispatch(...args) — static emit through global bus
 * - toJSON() — serialize to plain object
 * - toString() — debug-friendly string
 */

import type { Constructor } from "./bus";
import { bus } from "./bus";

export abstract class LoomEvent {
  /** Auto-stamped on creation */
  readonly timestamp = Date.now();

  /** Set to true by cancel() — stops subsequent handlers and parent propagation */
  cancelled = false;

  /** Stop dispatching to remaining handlers and parent event types */
  cancel(): void { this.cancelled = true; }

  /**
   * Optional dedup key — override in a subclass to enable frame-scoped deduplication.
   * If two events with the same dedupeKey are emitted in the same synchronous flush,
   * only the first reaches handlers. Cleared after the current microtask drains.
   *
   * ```ts
   * class ThemeChanged extends LoomEvent {
   *   constructor(public theme: string) { super(); }
   *   override get dedupeKey() { return `theme:${this.theme}`; }
   * }
   * ```
   *
   * Return `undefined` (default) to disable dedup for this event.
   */
  get dedupeKey(): string | undefined { return undefined; }

  /** Construct and emit this event through the global bus */
  static dispatch<T extends LoomEvent>(
    this: new (...args: unknown[]) => T,
    ...args: ConstructorParameters<typeof this>
  ): void {
    bus.emit(new this(...args));
  }

  /** Construct this event without emitting — useful for building, inspecting, or cloning before dispatch */
  static create<T extends LoomEvent>(
    this: new (...args: unknown[]) => T,
    ...args: ConstructorParameters<typeof this>
  ): T {
    return new this(...args);
  }

  /** Shallow clone with optional overrides */
  clone(overrides?: Partial<this>): this {
    return Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this,
      overrides,
    );
  }

  /** Type guard — `if (SomeEvent.is(event))` */
  static is<T extends LoomEvent>(
    this: Constructor<T>,
    event: unknown,
  ): event is T {
    return event instanceof this;
  }

  /** Serialize to plain object (strips methods) */
  toJSON(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(this)) {
      out[key] = (this as unknown as Record<string, unknown>)[key];
    }
    return out;
  }

  /** Debug-friendly string */
  toString(): string {
    return `${this.constructor.name}(${JSON.stringify(this.toJSON())})`;
  }
}
